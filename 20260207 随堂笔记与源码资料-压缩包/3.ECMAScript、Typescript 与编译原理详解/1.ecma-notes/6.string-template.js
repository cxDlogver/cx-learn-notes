const name = "heyi";
const age = 18;

const tagFn = (temp, ...args) => {
  let str = "";
  for (let i = 0; i < temp.length; i++) {
    // 这里我就不考虑一些容错情况
    str += temp[i] + args[i];
  }
  return str;
};

// const result = `My name is ${name}  I'm ${age} years old.\nI'm from China.`;
const result = tagFn(
  ["My name is ", ", I'm ", " years old.\nI'm from China."],
  name,
  age,
);

console.log(result);

// =========================tag function==========

const styled = function (temp, ...args) {
  const res = tagFn(temp, ...args);
  console.log("🚀 ~ styled ~ args:", args);
  console.log("styled res: ===> ", res);
};

// styled();
const color = "red";
const border = "1px";
styled`
    color: ${color};
    border: ${border};
`;
