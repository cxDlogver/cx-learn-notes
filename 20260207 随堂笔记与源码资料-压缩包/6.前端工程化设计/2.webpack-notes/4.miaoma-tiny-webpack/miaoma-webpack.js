// function createAsset() {} // 构建产物输出
// function createGraph() {} // 构建依赖图
// function bundle() {} // 输出 bundle

// function run() {
//   const graph = createGraph(/* 文件入口 */);
//   const result = bundle(graph);

//   //   文件 io 操作
// }

// module.exports = exports = {
//   createAsset,
//   createGraph,
//   bundle,
// };

const fs = require("fs");
const path = require("path");
const babylon = require("babylon");
const traverse = require("@babel/traverse").default;
const babel = require("@babel/core");

const config = require("./webpack.config");

let ID = 0;

function createAsset(filename) {
  const content = fs.readFileSync(filename, "utf-8");
  const ast = babylon.parse(content, { sourceType: "module" });
  const dependencies = [];

  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      console.log('🚀 ~ createAsset ~ node:', node)
      dependencies.push(node.source.value);
    },
  });
  console.log("🚀 ~ createAsset ~ dependencies:", dependencies);

  const id = ID++;

  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });
  console.log('🚀 ~ createAsset ~ code:', code)

  return {
    id,
    filename,
    dependencies,
    code,
  };
}

function createGraph(entry) {
  const mainAsset = createAsset(entry);
  const queue = [mainAsset];

  for (const asset of queue) {
    const dirname = path.dirname(asset.filename);
    asset.mapping = {};

    asset.dependencies.forEach((relativePath) => {
      const absolutePath = path.join(dirname, relativePath);
      const child = createAsset(absolutePath);
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }

  return queue;
}

function bundle(graph) {
  let modules = "";

  graph.forEach((mod) => {
    modules += `${mod.id}: [
      function (require, module, exports) { ${mod.code} },
      ${JSON.stringify(mod.mapping)},
    ],`;
  });

  return `
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
    })({${modules}})
  `;
}

function run() {
  const graph = createGraph(config.entry);
  console.log('🚀 ~ run ~ graph:', graph)
  const result = bundle(graph);

  if (!fs.existsSync(config.output.path)) {
    fs.mkdirSync(config.output.path);
  }

  const dotIndex = config.output.filename.lastIndexOf(".");
  const hashedFilename =
    config.output.filename.slice(0, dotIndex) +
    ".06970dad8564418ed0d4" +
    config.output.filename.slice(dotIndex);
  fs.writeFileSync(path.join(config.output.path, hashedFilename), result);
  console.log("Bundle created successfully!");
}

run();

module.exports = { createAsset, createGraph, bundle };
