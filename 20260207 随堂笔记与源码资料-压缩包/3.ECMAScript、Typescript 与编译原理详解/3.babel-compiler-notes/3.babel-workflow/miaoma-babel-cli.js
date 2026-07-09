// parser -> traverse -> generator
/**
 * 
parser 负责将源代码装换为 ast
traverse 负责将源代码 ast 使用访问者模式转为目标代码的 ast
generator 负责基于目标代码 ast 生成目标代码


@babel/parser
@babel/tranverse
@babel/generator
 */
const t = require("@babel/types");

const sourceCode = `
const name = 'miaoma'

const say = () => {
    console.log(123);
}
`;
// 要你将  const 语法变成 var
// const targetCode = sourceCode.replace("const", "var");
// console.log("🚀 ~ targetCode:", targetCode);
// 应该要用编译原理

// commonjs
// 1. 将代码转为 ast
const parser = require("@babel/parser");
const ast = parser.parse(sourceCode);

console.log("🚀 ~ ast:", JSON.stringify(ast));
const astStr = {
  type: "File",
  start: 0,
  end: 23,
  loc: {
    start: { line: 1, column: 0, index: 0 },
    end: { line: 3, column: 0, index: 23 },
  },
  errors: [],
  program: {
    type: "Program",
    start: 0,
    end: 23,
    loc: {
      start: { line: 1, column: 0, index: 0 },
      end: { line: 3, column: 0, index: 23 },
    },
    sourceType: "script",
    interpreter: null,
    body: [
      {
        type: "VariableDeclaration",
        start: 1,
        end: 22,
        loc: {
          start: { line: 2, column: 0, index: 1 },
          end: { line: 2, column: 21, index: 22 },
        },
        declarations: [
          {
            type: "VariableDeclarator",
            start: 7,
            end: 22,
            loc: {
              start: { line: 2, column: 6, index: 7 },
              end: { line: 2, column: 21, index: 22 },
            },
            id: {
              type: "Identifier",
              start: 7,
              end: 11,
              loc: {
                start: { line: 2, column: 6, index: 7 },
                end: { line: 2, column: 10, index: 11 },
                identifierName: "name",
              },
              name: "name",
            },
            init: {
              type: "StringLiteral",
              start: 14,
              end: 22,
              loc: {
                start: { line: 2, column: 13, index: 14 },
                end: { line: 2, column: 21, index: 22 },
              },
              extra: { rawValue: "miaoma", raw: "'miaoma'" },
              value: "miaoma",
            },
          },
        ],
        kind: "const", // 从 const 转为 var 就行了
      },
    ],
    directives: [],
  },
  comments: [],
};

// 2. 将源代码 ast 转为目标代码 ast
const traverse = require("@babel/traverse").default;
// ast 访问的过程，有两种实现，访问者 visitor 模式，状态机模式
/**
 * 1. 访问者模式
 */
const visitor = {
  VariableDeclaration(path) {
    console.log("\n\nvisitor kind ====>", path.node.kind);
    path.node.kind = "var";
  },
  ArrowFunctionExpression(path) {
    const newBody = t.isBlockStatement(path.node.body)
      ? path.node.body
      : t.blockStatement([t.returnStatement(path.node.body)]);
    console.log("🚀 ~ path:", path);

    // 生成新的函数表达式
    const newFunctionExpression = t.functionExpression(
      null,
      path.node.params,
      newBody,
      path.node.async,
    );

    path.replaceWith(newFunctionExpression);
  },
};
traverse(ast, visitor);
/**
 * 状态机模式，也是在 Vue3 编译用的一种思路
 */
// traverse(ast, {
//   enter(path) {
//     if (path.isVariableDeclaration({ kind: "const" })) {
//       path.node.kind = "var";
//     }
//   },
//   exit(path) {},
// });

const newAst = ast;
console.log("🚀 ~ newAst:", JSON.stringify(newAst));
const newAstStr = {
  type: "File",
  start: 0,
  end: 23,
  loc: {
    start: { line: 1, column: 0, index: 0 },
    end: { line: 3, column: 0, index: 23 },
  },
  errors: [],
  program: {
    type: "Program",
    start: 0,
    end: 23,
    loc: {
      start: { line: 1, column: 0, index: 0 },
      end: { line: 3, column: 0, index: 23 },
    },
    sourceType: "script",
    interpreter: null,
    body: [
      {
        type: "VariableDeclaration",
        start: 1,
        end: 22,
        loc: {
          start: { line: 2, column: 0, index: 1 },
          end: { line: 2, column: 21, index: 22 },
        },
        declarations: [
          {
            type: "VariableDeclarator",
            start: 7,
            end: 22,
            loc: {
              start: { line: 2, column: 6, index: 7 },
              end: { line: 2, column: 21, index: 22 },
            },
            id: {
              type: "Identifier",
              start: 7,
              end: 11,
              loc: {
                start: { line: 2, column: 6, index: 7 },
                end: { line: 2, column: 10, index: 11 },
                identifierName: "name",
              },
              name: "name",
            },
            init: {
              type: "StringLiteral",
              start: 14,
              end: 22,
              loc: {
                start: { line: 2, column: 13, index: 14 },
                end: { line: 2, column: 21, index: 22 },
              },
              extra: { rawValue: "miaoma", raw: "'miaoma'" },
              value: "miaoma",
            },
          },
        ],
        kind: "var",
      },
    ],
    directives: [],
  },
  comments: [],
};

// 3. 使用目标代码 ast 生成代码
const generator = require("@babel/generator").default;
const newCode = generator(newAst).code;
console.log("\n\n🚀 ~ newCode:", newCode);
