class Person {
  static version = "1.0.0";
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  //   vu3 以前的响应式，
  get name() {
    // 控制属性的读
    return "**保密";
  }

  set name(value) {
    // 控制属性的写
    console.log(value);
  }
}

const person = new Person("heyi123", 18);
console.log(person.name);
console.log(Person.version);
