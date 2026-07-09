// gzip 压缩、brotli
import fs from "node:fs";
import path from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
// zlib 压缩
// stream 流式压缩
import { createGzip, createBrotliDecompress } from "node:zlib";
import { pipeline } from "node:stream";

const filePath = path.join(import.meta.dirname, "../src/app.txt");
const outputPath = path.join(import.meta.dirname, "../dist/app.txt.gz");

const source = createReadStream(filePath); // 可读流
const destination = createWriteStream(outputPath); // 可写流

const gzip = createGzip();
// const brotli = createBrotliDecompress();

// 管线  读取 -> 压缩 -> 写
pipeline(source, gzip, destination, () => {
  console.log("🚀 ~ 压缩完成");
});
