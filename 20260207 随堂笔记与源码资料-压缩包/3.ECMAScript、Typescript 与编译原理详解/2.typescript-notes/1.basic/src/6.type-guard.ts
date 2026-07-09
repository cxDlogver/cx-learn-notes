// 类型保护
type GenderType = "man" | "woman";

// 多个选择集中的时候
let g: GenderType = "man";

if (g === "man") {
  console.log("男");
} else {
  console.log("女");
}

// 类型保护
function isMan(g: GenderType): g is "man" {
  return g === "man";
}
function isWoMan(g: GenderType): g is "woman" {
  return g === "woman";
}

if (isMan(g)) {
  console.log(g);
  console.log("男");
} else {
  console.log("女");
}

type TextBlockProtocol = {
  type: "text";
  content: "";
  mark: "";
};
type ImageBlockProtocol = {
  type: "image";
  url: "";
};

type BlockProtocol = TextBlockProtocol | ImageBlockProtocol;

// 业务开发的时候，实现层有需要分离
// 文本内容渲染和图片内容渲染完全不同
let block: BlockProtocol

const isImageBlock = (block: BlockProtocol): block is ImageBlockProtocol => {
  return block.type === "image";
};
const isTextBlock = (block: BlockProtocol): block is TextBlockProtocol => {
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

