import { createHash, type Hash } from "node:crypto";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});
const crcUpdate = (seed: number, chunk: Buffer): number => {
  let value = seed;
  for (const byte of chunk)
    value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff]!;
  return value >>> 0;
};
const u16 = (value: number) => {
  const out = Buffer.alloc(2);
  out.writeUInt16LE(value);
  return out;
};
const u32 = (value: number) => {
  const out = Buffer.alloc(4);
  out.writeUInt32LE(value >>> 0);
  return out;
};
const maxZip = 2_147_483_648;

export interface ZipSink {
  write(chunk: Buffer): Promise<void>;
}
interface Entry {
  name: Buffer;
  crc: number;
  bytes: number;
  offset: number;
  sha256: string;
}
export class ZipWriter {
  private offset = 0;
  private entries: Entry[] = [];
  constructor(private readonly sink: ZipSink) {}
  get fileCount(): number {
    return this.entries.length;
  }
  get lastFileHash(): string | null {
    return this.entries.at(-1)?.sha256 ?? null;
  }
  get files(): { path: string; bytes: number; sha256: string }[] {
    return this.entries.map((e) => ({
      path: e.name.toString("utf8"),
      bytes: e.bytes,
      sha256: e.sha256,
    }));
  }
  private async put(chunk: Buffer): Promise<void> {
    this.offset += chunk.length;
    if (this.offset > maxZip) throw new Error("EXPORT_TOO_LARGE");
    await this.sink.write(chunk);
  }
  async add(
    path: string,
    chunks: AsyncIterable<Buffer> | Iterable<Buffer>,
  ): Promise<void> {
    if (
      !/^[A-Za-z0-9_./-]+$/.test(path) ||
      path.includes("..") ||
      path.startsWith("/")
    )
      throw new Error("EXPORT_INVALID_PATH");
    if (this.entries.length >= 19_999) throw new Error("EXPORT_TOO_MANY_FILES");
    const name = Buffer.from(path, "utf8");
    const offset = this.offset;
    await this.put(
      Buffer.concat([
        u32(0x04034b50),
        u16(20),
        u16(0x0808),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(0),
        u32(0),
        u16(name.length),
        u16(0),
        name,
      ]),
    );
    let crc = 0xffffffff;
    let bytes = 0;
    const digest = createHash("sha256");
    for await (const chunk of chunks) {
      bytes += chunk.length;
      if (bytes > maxZip) throw new Error("EXPORT_TOO_LARGE");
      crc = crcUpdate(crc, chunk);
      digest.update(chunk);
      await this.put(chunk);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    await this.put(
      Buffer.concat([u32(0x08074b50), u32(crc), u32(bytes), u32(bytes)]),
    );
    this.entries.push({
      name,
      crc,
      bytes,
      offset,
      sha256: digest.digest("hex"),
    });
  }
  async finish(): Promise<void> {
    const start = this.offset;
    for (const entry of this.entries) {
      await this.put(
        Buffer.concat([
          u32(0x02014b50),
          u16(20),
          u16(20),
          u16(0x0808),
          u16(0),
          u16(0),
          u16(0),
          u32(entry.crc),
          u32(entry.bytes),
          u32(entry.bytes),
          u16(entry.name.length),
          u16(0),
          u16(0),
          u16(0),
          u16(0),
          u32(0),
          u32(entry.offset),
          entry.name,
        ]),
      );
    }
    const centralSize = this.offset - start;
    await this.put(
      Buffer.concat([
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(this.entries.length),
        u16(this.entries.length),
        u32(centralSize),
        u32(start),
        u16(0),
      ]),
    );
  }
}

export class MultipartZipSink implements ZipSink {
  readonly digest: Hash = createHash("sha256");
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly key: string;
  private uploadId: string | null = null;
  private pending: Buffer[] = [];
  private pendingBytes = 0;
  private parts: { ETag: string; PartNumber: number }[] = [];
  bytes = 0;
  constructor(key: string) {
    const endpoint = process.env.OBJECT_ENDPOINT;
    const bucket = process.env.OBJECT_BUCKET;
    const accessKeyId = process.env.OBJECT_ACCESS_KEY_ID;
    const secretAccessKey = process.env.OBJECT_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey)
      throw new Error("EXPORT_OBJECT_CONFIG_MISSING");
    if (
      process.env.APP_ENV !== "development" &&
      !endpoint.startsWith("https://")
    )
      throw new Error("EXPORT_OBJECT_HTTPS_REQUIRED");
    this.s3 = new S3Client({
      endpoint,
      region: process.env.OBJECT_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
    this.key = key;
  }
  private async init(): Promise<void> {
    if (this.uploadId) return;
    const started = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: this.key,
        ContentType: "application/zip",
      }),
    );
    if (!started.UploadId) throw new Error("EXPORT_UPLOAD_START_FAILED");
    this.uploadId = started.UploadId;
  }
  async write(chunk: Buffer): Promise<void> {
    if (!chunk.length) return;
    this.bytes += chunk.length;
    if (this.bytes > maxZip) throw new Error("EXPORT_TOO_LARGE");
    this.digest.update(chunk);
    this.pending.push(chunk);
    this.pendingBytes += chunk.length;
    if (this.pendingBytes >= 8 * 1024 * 1024) await this.flush();
  }
  private async flush(): Promise<void> {
    if (!this.pendingBytes) return;
    await this.init();
    const body = Buffer.concat(this.pending, this.pendingBytes);
    this.pending = [];
    this.pendingBytes = 0;
    const partNumber = this.parts.length + 1;
    const uploaded = await this.s3.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: this.key,
        UploadId: this.uploadId!,
        PartNumber: partNumber,
        Body: body,
        ContentLength: body.length,
      }),
    );
    if (!uploaded.ETag) throw new Error("EXPORT_UPLOAD_PART_FAILED");
    this.parts.push({ ETag: uploaded.ETag, PartNumber: partNumber });
  }
  async finish(): Promise<string> {
    await this.flush();
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: this.key,
        UploadId: this.uploadId!,
        MultipartUpload: { Parts: this.parts },
      }),
    );
    return this.digest.digest("hex");
  }
  async abort(): Promise<void> {
    if (!this.uploadId) return;
    await this.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: this.key,
        UploadId: this.uploadId,
      }),
    );
  }
}
