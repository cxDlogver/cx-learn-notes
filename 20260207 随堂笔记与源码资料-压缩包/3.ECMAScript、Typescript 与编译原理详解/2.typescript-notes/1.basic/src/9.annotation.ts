// 注解，是面向切面编程思想

// 可以改变原 person 的逻辑下，增强其功能
function LogClass(constructor: Function) {
  console.log("类的注解", constructor);
}

function LogProperty() {
  return (target: any, name: string) => {
    Reflect.set(target, name, "属性注解");
    console.log("属性的注解", target, name);
  };
}

function LogMethod() {
  return (target: any, name: string) => {
    console.log("方法的注解", target, name);
  };
}

@LogClass
class Person {
  @LogProperty()
  name?: string;

  @LogMethod()
  say() {}
}

const person = new Person();
person.name;
console.log(person.name);

person.say()
