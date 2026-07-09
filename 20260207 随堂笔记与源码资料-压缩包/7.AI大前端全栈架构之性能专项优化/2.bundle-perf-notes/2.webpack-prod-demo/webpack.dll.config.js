import path from "node:path";
import webpack from "webpack";

export default {
  mode: "development",
  entry: "./src/components/utils.jsx",
  plugins: [
    new webpack.DllPlugin({
      name: "[name]",
      path: path.join(import.meta.dirname, "dist", "manifest.json"),
    }),
  ],
  resolve: {
    alias: {
      // import.meta.dirname  === __dirname
      "@/utils": path.resolve(import.meta.dirname, "src/utils"),
      "@/components": path.resolve(import.meta.dirname, "src/components"),
    },
    extensions: [".js", ".jsx"],
  },
  output: {
    path: path.join(import.meta.dirname, "dist"),
    filename: "[name].dll.js",
  },
};
