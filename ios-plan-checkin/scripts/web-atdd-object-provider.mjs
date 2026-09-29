import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";

const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = requireApi("@aws-sdk/client-s3");
const { getSignedUrl } = requireApi("@aws-sdk/s3-request-presigner");

const runId = process.argv[2];
if (!/^[a-z0-9-]{3,40}$/.test(runId ?? "")) throw new Error("RUN_ID required");
if (
  process.env.APP_ENV !== "development" ||
  process.env.SMS_PROVIDER !== "stub"
)
  throw new Error("Provider probe requires isolated development settings");
const endpoint = new URL(process.env.OBJECT_ENDPOINT ?? "");
const publicEndpoint = new URL(
  process.env.OBJECT_PUBLIC_ENDPOINT ?? process.env.OBJECT_ENDPOINT ?? "",
);
for (const url of [endpoint, publicEndpoint]) {
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("Provider probe only accepts loopback object endpoints");
}
const bucket = process.env.OBJECT_BUCKET;
if (!bucket) throw new Error("OBJECT_BUCKET required");
const options = {
  region: process.env.OBJECT_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.OBJECT_ACCESS_KEY_ID,
    secretAccessKey: process.env.OBJECT_SECRET_ACCESS_KEY,
  },
};
const internal = new S3Client({ ...options, endpoint: endpoint.href });
const publicClient = new S3Client({
  ...options,
  endpoint: publicEndpoint.href,
});
const key = `_atdd/${runId}/${randomUUID()}.png`;
const mime = "image/png";
const bytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=",
  "base64",
);
const checksum = createHash("sha256").update(bytes).digest("base64");
const expectedHash = createHash("sha256").update(bytes).digest("hex");
const allowedOrigin = "http://127.0.0.1:5173";
const forbiddenOrigin = "https://untrusted.example";
const objectUrl = new URL(`${bucket}/${key}`, publicEndpoint);

async function preflight(origin) {
  const response = await globalThis.fetch(objectUrl, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type,x-amz-checksum-sha256",
    },
  });
  await response.body?.cancel();
  return {
    status: response.status,
    allowedOrigin: response.headers.get("access-control-allow-origin"),
    allowedHeaders: response.headers.get("access-control-allow-headers"),
  };
}

let created = false;
async function cleanup() {
  if (!created) return;
  await internal.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  let remains = false;
  try {
    await internal.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    remains = true;
  } catch (error) {
    if (error.name !== "NotFound" && error.$metadata?.httpStatusCode !== 404)
      throw error;
  }
  if (remains) throw new Error("Test object was not deleted");
  process.stdout.write(
    `${JSON.stringify({ runId, objectCleanup: "verified" })}\n`,
  );
}
try {
  const allowed = await preflight(allowedOrigin);
  const forbidden = await preflight(forbiddenOrigin);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.allowedOrigin, allowedOrigin);
  assert.match(allowed.allowedHeaders ?? "", /content-type/i);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.allowedOrigin, null);

  const uploadUrl = await getSignedUrl(
    publicClient,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mime,
      ChecksumSHA256: checksum,
    }),
    { expiresIn: 600 },
  );
  assert.equal(new URL(uploadUrl).hostname, publicEndpoint.hostname);
  const uploaded = await globalThis.fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime, Origin: allowedOrigin },
    body: bytes,
  });
  await uploaded.body?.cancel();
  assert.equal(uploaded.status, 200);
  created = true;
  const metadata = await internal.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  assert.equal(Number(metadata.ContentLength), bytes.length);
  const downloadUrl = await getSignedUrl(
    publicClient,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 },
  );
  const downloaded = await globalThis.fetch(downloadUrl, {
    headers: { Origin: allowedOrigin },
  });
  assert.equal(downloaded.status, 200);
  assert.equal(
    downloaded.headers.get("access-control-allow-origin"),
    allowedOrigin,
  );
  const readBytes = Buffer.from(await downloaded.arrayBuffer());
  assert.equal(
    createHash("sha256").update(readBytes).digest("hex"),
    expectedHash,
  );
  const shortUrl = await getSignedUrl(
    publicClient,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 1 },
  );
  const shortBefore = await globalThis.fetch(shortUrl);
  assert.equal(shortBefore.status, 200);
  await shortBefore.body?.cancel();
  await delay(2200);
  const shortAfter = await globalThis.fetch(shortUrl);
  assert.equal(shortAfter.status, 403);
  await shortAfter.body?.cancel();
  const withoutSignature = await globalThis.fetch(objectUrl);
  await withoutSignature.body?.cancel();
  assert.equal(withoutSignature.status, 403);
  process.stdout.write(
    `${JSON.stringify({
      runId,
      kind: "controlled-loopback-object-provider",
      allowedPreflight: allowed.status,
      forbiddenPreflight: forbidden.status,
      signedPut: uploaded.status,
      signedGet: downloaded.status,
      shortSignedGetBefore: shortBefore.status,
      shortSignedGetAfter: shortAfter.status,
      unsignedGet: withoutSignature.status,
      bytes: bytes.length,
      sha256: expectedHash,
      objectKeyPrefix: `_atdd/${runId}/`,
      formalBusinessAtdd: false,
    })}\n`,
  );
} finally {
  try {
    await cleanup();
  } finally {
    internal.destroy();
    publicClient.destroy();
  }
}
