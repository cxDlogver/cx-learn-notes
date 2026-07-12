// commonjs
module.exports = exports = {
  sum(a: number, b: number) {
    const arr = [1, 2];
    const [a1, a2] = arr;
    console.log("🚀 ~ a1, a2:", a1, a2?.toExponential());
    return a + b;
  },
};
