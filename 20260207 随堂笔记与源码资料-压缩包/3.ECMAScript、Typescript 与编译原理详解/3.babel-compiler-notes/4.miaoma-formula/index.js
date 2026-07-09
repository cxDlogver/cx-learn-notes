// input => tokenizer(lexer) ---  tokens // 词法分析
// tokens => parser ---           ast    // 语法分析，生成 ast

// ast => transformer(traverse) --- newAst // 代码转换

// 最终环节分为两个分支，代码生成、代码执行
// newAst  =>  generator         --- newCode // 代码生成
// newAst  =>  interpreter       --- 执行结果 // 解释器（执行器），代码执行

/**
 * ADD(1,2)                                            // 1 + 2  编译过程   12+
 * ADD(1, MINUS(3, 2))                                 // 1 + (3 - 2)      1(32-)+
 * Subtract(Add(3, Multiply(4, 2)), Divide(6, 2), 1)   // 3+4*2-6/2-1
 *
 * 逆波兰表示法   1 + 2 用什么数据结构来表示？   12+
 */

// const code = "ADD(888,2)";
// const code = "ADD(1, MINUS(3, 2))";
const code = "MULTIPLY(ADD(10, MINUS(30, 20)), 2)";


// 1. token 定义
const FN_NAME_TOKEN = /[a-zA-Z]/;
const NUMBER_TOKEN = /\d/;
const PAREN_TOKEN = /\(/;
const ATI_PAREN_TOKEN = /\)/;
const COMMA_TOKEN = /\,/;

// 做词法分析，tokenizer、lexer
function tokenizer(code) {
  // token 集合
  const tokens = [];
  let current = 0; // 指针

  while (current < code.length) {
    let char = code[current];

    // 分析你这个字符，是什么，有没有可能组成函数名、数字、...
    console.log(char);

    // 先匹配数字
    // 123456
    if (NUMBER_TOKEN.test(char)) {
      let number = "";
      while (NUMBER_TOKEN.test(char)) {
        number += char;
        char = code[++current];
      }

      tokens.push({
        type: "number",
        value: parseInt(number),
      });
    }

    // 匹配函数名
    if (FN_NAME_TOKEN.test(char)) {
      let fnName = "";
      while (FN_NAME_TOKEN.test(char)) {
        fnName += char;
        char = code[++current];
      }

      tokens.push({
        type: "function",
        value: fnName,
      });
    }

    // 匹配括号和逗号
    if (
      PAREN_TOKEN.test(char) ||
      ATI_PAREN_TOKEN.test(char) ||
      COMMA_TOKEN.test(char)
    ) {
      tokens.push({
        // type: "paren",
        type: char,
        value: char,
      });
      current++;
      continue;
    }

    // 处理空格
    if (char === " ") {
      current++;
      continue;
    }

    throw new TypeError("I dont know what this character is: " + char);
  }

  return tokens;
}

// Vue   v u e

const tokens = tokenizer(code);
console.log("🚀 ~ tokens:", tokens);

// 转换器 parser
function parser(tokens) {
  let current = 0;

  //   递归解析
  function walk() {
    let token = tokens[current];

    // 处理数字
    if (token.type === "number") {
      current++;
      return {
        type: "NumberLiteral",
        value: token.value,
      };
    }

    // 处理函数
    if (token.type === "function") {
      current++;
      let node = {
        type: "CallExpression",
        name: token.value,
        params: [],
      };

      token = tokens[++current];
      //   一直循环往复的收集参数，知道遇到右括号位置
      while (token.type !== ")") {
        node.params.push(walk());
        token = tokens[current];

        // 注意一点，如果遇到了参数中间的逗号，也需要跳过
        if (token.type === ",") {
          console.log("🚀 ~ token:", token);
          current++;
        }
      }

      current++; // 跳过右括号
      return node;
    }
  }

  let ast = {
    type: "Program",
    body: [],
  };

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  return ast;
}

const ast = parser(tokens);
console.log("🚀 ~ ast:", JSON.stringify(ast));

// ADD(888,2)
const ast1Str = {
  type: "Program",
  body: [
    {
      type: "CallExpression",
      name: "ADD",
      params: [
        { type: "NumberLiteral", value: 888 },
        { type: "NumberLiteral", value: 2 },
      ],
    },
  ],
};

// ADD(1, MINUS(3, 2))
const ast2Str = {
  type: "Program",
  body: [
    {
      type: "CallExpression",
      name: "ADD",
      params: [
        { type: "NumberLiteral", value: 1 },
        {
          type: "CallExpression",
          name: "MINUS",
          params: [
            { type: "NumberLiteral", value: 3 },
            { type: "NumberLiteral", value: 2 },
          ],
        },
      ],
    },
  ],
};

// 将 ast 拿过来进行计算
const ADDPlugin = (a, b) => a + b;
const MINUSPlugin = (a, b) => a - b;

const visitor = new Map([
  ["ADD", ADDPlugin],
  ["MINUS", MINUSPlugin],
]);

function interpreter(ast) {
  function traverse(node) {
    switch (node.type) {
      case "NumberLiteral": {
        return node.value;
      }
      case "CallExpression": {
        let args = node.params.map(traverse);
        console.log("🚀 ~ traverse ~ node:", node.name);
        console.log("🚀 ~ traverse ~ args:", args);
        const fn = visitor.get(node.name);
        const res = fn.call(null, ...args);

        return res;
      }
    }
  }

  return traverse(ast.body[0]);
}

const MULTIPLYPlugin = (a, b) => a * b;

visitor.set("MULTIPLY", MULTIPLYPlugin);

const result = interpreter(ast);
console.log("🚀 ~ result:", result);
