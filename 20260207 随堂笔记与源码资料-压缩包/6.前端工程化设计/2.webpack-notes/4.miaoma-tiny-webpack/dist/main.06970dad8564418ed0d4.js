
    (function(modules) {
      function require(id) {
        const [fn, mapping] = modules[id];

        function localRequire(name) {
          return require(mapping[name]);
        }

        const module = { exports : {} };

        fn(localRequire, module, module.exports);

        return module.exports;
      }

      require(0);
    })({0: [
      function (require, module, exports) { "use strict";

var _module = _interopRequireDefault(require("./module1.js"));
var _module2 = _interopRequireDefault(require("./module2.js"));
var _module3 = _interopRequireDefault(require("./module3.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
console.log("This is the entry file.");
(0, _module["default"])();
(0, _module2["default"])(); },
      {"./module1.js":1,"./module2.js":2,"./module3.js":3},
    ],1: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _module = _interopRequireDefault(require("./module3.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var module1 = function module1() {
  console.log("This is module 1.");
};
var _default = exports["default"] = module1; },
      {"./module3.js":4},
    ],2: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = module2;
function module2() {
  console.log("This is module 2.");
} },
      {},
    ],3: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = module2;
function module2() {
  console.log("This is module 2.");
} },
      {},
    ],4: [
      function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = module2;
function module2() {
  console.log("This is module 2.");
} },
      {},
    ],})
  