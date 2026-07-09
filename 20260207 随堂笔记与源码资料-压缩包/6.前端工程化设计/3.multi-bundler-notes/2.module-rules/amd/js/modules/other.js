// otherModule
define(["sumModule"], function (sumModule) {
  return {
    say() {
      console.log(sumModule.sum(10, 20));
    },
  };
});
