import assert from "node:assert/strict";
import console from "node:console";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import ts from "typescript";

const source = await readFile(
  new URL("../apps/mobile/src/data/mediaRunner.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
const uploads = [];
class File {
  constructor(uri) {
    this.uri = uri;
    this.exists = true;
    this.size = 8;
  }
  async upload(url, options) {
    uploads.push([url, options]);
    return { status: 200 };
  }
}
new Function("require", "module", "exports", compiled)(
  (name) => {
    if (name === "expo-file-system")
      return { File, UploadType: { BINARY_CONTENT: 0 } };
    if (name === "expo-network")
      return { getNetworkStateAsync: async () => ({ isConnected: true }) };
    throw new Error(`Unexpected runtime import: ${name}`);
  },
  module,
  module.exports,
);
const { MediaRunner } = module.exports;
const row = {
  id: "local-photo",
  fileUri: "file:///private/photo.jpg",
  mimeType: "image/jpeg",
  byteSize: 8,
  sha256: "a".repeat(64),
  retryCount: 0,
  checkinId: null,
  oneTimePlanId: null,
  status: "staged",
};
const cache = {
  async claimMediaUpload() {
    if (!row.checkinId || row.status !== "staged") return null;
    row.status = "uploading";
    return { ...row };
  },
  async uploadedMedia(_account, id, remoteId) {
    assert.equal(id, row.id);
    assert.equal(remoteId, "remote-photo");
    row.status = "uploaded";
  },
  async failedMedia(_account, id, code) {
    assert.equal(id, row.id);
    row.status = "failed";
    row.errorCode = code;
  },
  async nextMediaWakeAt() {
    return null;
  },
};
const calls = [];
const api = {
  async post(path, body) {
    calls.push([path, body]);
    if (path === "/media/upload-intents")
      return {
        id: "remote-photo",
        uploadUrl: "https://private.example/upload",
        headers: { "x-amz-checksum-sha256": "checksum" },
      };
    assert.equal(body.checkinId, "checkin-a");
    return { id: "remote-photo", status: "ready" };
  },
};
const runner = new MediaRunner(api, cache, () => "account-a");
await runner.trigger();
assert.equal(calls.length, 0, "unacknowledged checkin cannot upload photos");
row.checkinId = "checkin-a";
await runner.trigger();
assert.equal(row.status, "uploaded");
assert.equal(uploads[0][1].httpMethod, "PUT");
assert.equal(uploads[0][1].uploadType, 0);
runner.stop();
console.log(
  "Mobile media queue waits for the base record and uploads binary content.",
);
