import { hello } from "@/components/hello";

const say = () => {
  console.log(123);
};

const render = () => {
  document.body.innerHTML = "你好，妙码";
};

console.log(say);

render();
