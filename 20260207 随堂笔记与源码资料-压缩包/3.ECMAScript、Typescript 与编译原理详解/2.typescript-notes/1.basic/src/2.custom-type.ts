// 自定义类型
// 对象 的 key，在同学们看来都是 string，react 更通用化 string、number、symbol

// 类型联合
type Key = string | number | symbol;

let key: Key = Symbol(1);

// 面向协议编程
type IdProtocol = {
  id: string;
};

type NameProtocol = {
  name: string;
};

type OptionProtocol = IdProtocol & NameProtocol

let option: OptionProtocol = {
  id: "apple",
  name: "苹果",
};

interface User {}
let user: User;
