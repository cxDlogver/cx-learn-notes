// babel 插件的本质
// 是一个函数
import { types } from "@babel/core";
console.log("🚀 ~ types:", types);

export default function () {
  console.log("进来啦！！！");
  //   ast、ast 游历
  //   节点的访问  —— 访问者模式 visitor
  //   访问到 ArrowFunctionExpression 节点
  return {
    visitor: {
      ArrowFunctionExpression(path) {
        const newBody = types.isBlockStatement(path.node.body)
          ? path.node.body
          : types.blockStatement([types.returnStatement(path.node.body)]);
        console.log("🚀 ~ path:", path);

        // 生成新的函数表达式
        const newFunctionExpression = types.functionExpression(
          null,
          path.node.params,
          newBody,
          path.node.async,
        );

        path.replaceWith(newFunctionExpression);
      },
    },
  };
}
