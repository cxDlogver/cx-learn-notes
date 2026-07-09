const promise = new Promise((resolve, reject) => {
  //   resolve("success");
  reject("error");
});

console.log(promise);
console.dir(Promise);

promise.then(
  (res) => {
    console.log(res);
  },
  (err) => {
    console.log(err);
  }
);
