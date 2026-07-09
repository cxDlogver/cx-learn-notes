import webpackConfigBase from "./webpack.config.base.mjs";

// webpack-merge

export default {
  mode: "development",
  ...webpackConfigBase, // 浅拷贝
};
