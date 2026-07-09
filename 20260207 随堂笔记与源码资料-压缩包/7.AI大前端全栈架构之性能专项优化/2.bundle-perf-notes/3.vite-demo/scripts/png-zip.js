import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import path from "node:path";

async function run() {
  const files = await imagemin(
    [path.join(import.meta.dirname, "../public/test.png")],
    {
      destination: path.join(import.meta.dirname, "../dist"),
      plugins: [
        imageminPngquant({
          quality: [0.6, 0.8],
        }),
      ],
    }
  );

  console.log(files);
  //=> [{data: <Uint8Array 89 50 4e …>, destinationPath: 'build/images/foo.jpg'}, …]
}

run();
