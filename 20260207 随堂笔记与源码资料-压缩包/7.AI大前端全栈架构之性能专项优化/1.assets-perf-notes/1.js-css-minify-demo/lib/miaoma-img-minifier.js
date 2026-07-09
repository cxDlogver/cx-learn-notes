import { CWebp, DWebp } from "cwebp";
import fs from "node:fs";
import path from "node:path";

const imgPath = path.join(import.meta.dirname, "../src/image.png");
const destPath = path.join(import.meta.dirname, "../dist/image.min.webp");

// 执行编码
const encoder = new CWebp(imgPath);

encoder.quality(50);

encoder.write(destPath);
