import Fontmin from "fontmin";
import path from "node:path";
import fs from "node:fs";

const text = fs
  .readFileSync(path.join(import.meta.dirname, "../index.html"))
  .toString();

const fontPath = path.join(import.meta.dirname, "../AlimamaShuHeiTi-Bold.ttf");

const destPath = path.join(import.meta.dirname, "../dist");

const fontmin = new Fontmin()
  .src(fontPath)
  .use(
    Fontmin.otf2ttf({
      text,
    }),
  )
  .use(Fontmin.glyph({ text }))
  .use(Fontmin.ttf2eot())
  .use(Fontmin.ttf2woff({ deflate: true }))
  .use(Fontmin.ttf2woff2())
  .use(Fontmin.ttf2svg())
  .dest(destPath);

fontmin.runAsync();
