// webpack 中 loader 的本质是一个函数，参数源代码，字符串
// 就是对于字符串的操作
// 为了把字符串的操作做得更高级  —— 编译原理

const emojiMap = {
  ":smile:": "😊",
  ":cry:": "😢",
};

export default function emojiLoader(source) {
  let code = source;

  for (const key in emojiMap) {
    const emoji = emojiMap[key];
    console.log("🚀 ~ emojiLoader ~ emoji:", emoji);

    code = code.replace(key, emoji);
  }
  console.log("🚀 ~ emojiLoader ~ code:", code);

  return code;
}
