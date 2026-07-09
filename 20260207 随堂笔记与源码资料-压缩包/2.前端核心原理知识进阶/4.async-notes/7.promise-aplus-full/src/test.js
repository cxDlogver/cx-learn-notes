const Promise = require("./miaoma-promise");
console.log('🚀 ~ Promise:', Promise)

Promise.deferred = function () {
  var result = {};
  result.promise = new Promise(function (resolve, reject) {
    result.resolve = resolve;
    result.reject = reject;
  });

  return result;
};

module.exports = Promise;
