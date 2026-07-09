import path from "node:path";
import webpack from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

export default {
  mode: "production",
  entry: "./src/index.js",
  output: {
    clean: true,
    filename: "[name]-[hash].js",
    chunkFilename: (pathData) => {
      return pathData.chunk.name === "main"
        ? "[name].js"
        : "[name]/[name]-[contenthash].js";
    },
  },
  //   mode: "production",
  //   devtool: "eval-source-map",
  // devtool: "eval-cheap-source-map",
  // devServer: {
  //   hot: true,
  //   static: ["assets"], // 静态资源文件代理
  //   watchFiles: {
  //     paths: ["./src/**/*", "./py/*.js"],
  //     options: {
  //       usePolling: false,
  //     },
  //   },
  // },
  resolve: {
    alias: {
      // import.meta.dirname  === __dirname
      "@/utils": path.resolve(import.meta.dirname, "src/utils"),
      "@/components": path.resolve(import.meta.dirname, "src/components"),
    },
    extensions: [".js", ".jsx"],
  },
  cache: {
    type: "filesystem",
  },
  watchOptions: {
    ignored: /py/,
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: [
          {
            loader: "thread-loader",
            options: {
              workers: 10,
            },
          },
          "babel-loader",
        ],
      },
    ],
  },
  //   plugins: [
  //     new webpack.DllReferencePlugin({
  //       manifest: path.join(import.meta.dirname, "dist", "manifest.json"),
  //     }),
  //   ],
  // 优化项
  optimization: {
    // minimize: true,
    // minimizer: Terser,
    splitChunks: {
      chunks: "all",
      minSize: 20,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          // test: /index/,
          // test: /[\\/]node_modules[\\/]/,
          test: /react/,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendors: {
          // test: /index/,
          // test: /[\\/]node_modules[\\/]/,
          test: /vue/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -30,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [new BundleAnalyzerPlugin()],
  // optimization: {
  //   usedExports: false,
  //   splitChunks: {
  //     cacheGroups: {
  //       // commons: {
  //       //   name: "commons",
  //       //   chunks: "initial",
  //       //   minChunks: 1,
  //       //   priority: -20,
  //       // },

  //       // vendor: {
  //       //   test: /node_modules/,
  //       //   name: "vendors",
  //       //   chunks: "all",
  //       //   // minChunks: 1,
  //       //   // priority: 10,
  //       // },
  //       default: {
  //         minChunks: 2,
  //         priority: -20,
  //         reuseExistingChunk: true,
  //       },
  //     },
  //   },
  // },
};
