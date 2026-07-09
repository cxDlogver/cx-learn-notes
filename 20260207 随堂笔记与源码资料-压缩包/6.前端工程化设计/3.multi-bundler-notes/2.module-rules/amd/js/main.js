!(function () {
  require.config({
    baseUrl: "js/",
    paths: {
      sumModule: "./modules/sum",
      otherModule: "./modules/other",
      testModule: "./modules/test",
    },
  });

  //   调用模块
  require(["otherModule"], function (otherModule) {
    otherModule.say();
  });

  //   调用 test 模块
  require(["testModule"], function (testModule) {
    console.log("umd name", testModule.name);
  });
})();
