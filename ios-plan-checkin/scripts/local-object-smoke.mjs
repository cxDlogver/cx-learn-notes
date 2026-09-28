import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const endpoint = process.env.OBJECT_ENDPOINT;
if (!endpoint?.startsWith("http://127.0.0.1:"))
  throw new Error("Object smoke only targets loopback storage.");
const client = new S3Client({
  endpoint,
  region: process.env.OBJECT_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.OBJECT_ACCESS_KEY_ID,
    secretAccessKey: process.env.OBJECT_SECRET_ACCESS_KEY,
  },
});
const bucket = process.env.OBJECT_BUCKET;
const key = `_smoke/${randomUUID()}.txt`;
const body = `local-object-smoke:${randomUUID()}`;
const startedAt = new Date().toISOString();
let status = "FAIL";
try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  assert.equal(await response.Body.transformToString(), body);
  status = "PASS";
} finally {
  await client
    .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    .catch(() => undefined);
  client.destroy();
  await writeFile(
    new URL("../apps/api/.local/local-object-smoke.json", import.meta.url),
    JSON.stringify(
      {
        kind: "local-object-development-check",
        formalAtdd: false,
        startedAt,
        endedAt: new Date().toISOString(),
        status,
        assertions: [
          "bucket reachable",
          "write and read exact bytes",
          "cleanup requested",
        ],
      },
      null,
      2,
    ) + "\n",
  );
}
process.stdout.write(`Local object storage smoke: ${status}.\n`);
