module.exports = function (source) {
  // Example loader logic
  return source.replace(/console\.log\(/g, "console.warn(");
};
