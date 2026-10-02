import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request } from "node:https";
import { createRequire } from "node:module";
import process from "node:process";
import { URL } from "node:url";

const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

if (
  process.env.APP_ENV !== "development" ||
  !process.env.OBJECT_ENDPOINT?.startsWith("http://127.0.0.1:") ||
  !process.env.OBJECT_PUBLIC_ENDPOINT?.startsWith("https://")
)
  throw new Error("LAN object smoke requires local development endpoints.");

const credentials = {
  accessKeyId: process.env.OBJECT_ACCESS_KEY_ID,
  secretAccessKey: process.env.OBJECT_SECRET_ACCESS_KEY,
};
const options = {
  region: process.env.OBJECT_REGION,
  forcePathStyle: true,
  credentials,
};
const internal = new S3Client({
  ...options,
  endpoint: process.env.OBJECT_ENDPOINT,
});
const external = new S3Client({
  ...options,
  endpoint: process.env.OBJECT_PUBLIC_ENDPOINT,
});
const bucket = process.env.OBJECT_BUCKET;
const key = `_smoke/lan-${randomUUID()}.txt`;
const body = `lan-object-smoke:${randomUUID()}`;
const certificate = await readFile(
  new URL("../apps/api/.local/lan-dev-cert.pem", import.meta.url),
);

try {
  await internal.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  const signedUrl = await getSignedUrl(
    external,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 60 },
  );
  const result = await new Promise((resolve, reject) => {
    const stream = request(signedUrl, { ca: certificate }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () =>
        resolve({ status: response.statusCode, body: Buffer.concat(chunks) }),
      );
      response.on("error", reject);
    });
    stream.on("error", reject);
    stream.end();
  });
  assert.equal(result.status, 200, `Signed GET returned ${result.status}`);
  assert.equal(result.body.toString("utf8"), body);
  process.stdout.write(
    "LAN object smoke passed: same-origin HTTPS signed URL returned exact bytes.\n",
  );
} finally {
  await internal
    .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    .catch(() => undefined);
  internal.destroy();
  external.destroy();
}
