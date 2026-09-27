import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { ApiConfig } from "../config.js";

@Injectable()
export class ObjectStore {
  private readonly internal: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;

  constructor(config: ApiConfig) {
    const options = {
      region: config.objectRegion,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.objectAccessKeyId,
        secretAccessKey: config.objectSecretAccessKey,
      },
    };
    this.internal = new S3Client({
      ...options,
      endpoint: config.objectEndpoint,
    });
    this.publicClient = new S3Client({
      ...options,
      endpoint: config.objectPublicEndpoint,
    });
    this.bucket = config.objectBucket;
  }

  uploadUrl(key: string, mime: string, sha256Base64: string): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mime,
        ChecksumSHA256: sha256Base64,
      }),
      { expiresIn: 600 },
    );
  }

  downloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 300 },
    );
  }

  head(key: string) {
    return this.internal.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  read(key: string) {
    return this.internal.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.internal.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
