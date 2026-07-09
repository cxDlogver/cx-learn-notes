console.log("hello miaoma 123");

!(function () {
  if ("serviceWorker" in window.navigator) {
    navigator.serviceWorker.register("/sw.js");
  }
})();
