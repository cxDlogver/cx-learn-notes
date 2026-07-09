import webpackConfigBase from "./webpack.config.base.mjs";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { merge } from "webpack-merge";

export default merge(webpackConfigBase, {
  mode: "production",
  module: {
    rules: [
      {
        test: /\.css/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
    }),
  ],
});
