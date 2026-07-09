"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 多个选择集中的时候
let g = "man";
if (g === "man") {
    console.log("男");
}
else {
    console.log("女");
}
// 类型保护
function isMan(g) {
    return g === "man";
}
function isWoMan(g) {
    return g === "woman";
}
if (isMan(g)) {
    console.log(g);
    console.log("男");
}
else {
    console.log("女");
}
// 业务开发的时候，实现层有需要分离
// 文本内容渲染和图片内容渲染完全不同
let block;
const isImageBlock = (block) => {
    return block.type === "image";
};
const isTextBlock = (block) => {
    return block.type === "text";
};
// block.
// if (isImageBlock(block)) {
//     block.
//   console.log(block);
// }
// if (isTextBlock(block)) {
//     block.
//   console.log(block);
// }
//# sourceMappingURL=6.type-guard.js.map