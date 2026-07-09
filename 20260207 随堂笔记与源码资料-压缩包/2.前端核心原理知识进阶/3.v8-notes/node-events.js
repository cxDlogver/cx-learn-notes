const fs = require("fs");

setTimeout(() => {
  console.log("setTimeout");
}, 0);

setImmediate(() => {
  console.log("setImmediate");
});

fs.readFile(__filename, () => {
  console.log("I/O callback");

  setTimeout(() => {
    console.log("setTimeout inside I/O");
  }, 0);

  setImmediate(() => {
    console.log("setImmediate inside I/O");
  });
});

console.log("Synchronous log");
