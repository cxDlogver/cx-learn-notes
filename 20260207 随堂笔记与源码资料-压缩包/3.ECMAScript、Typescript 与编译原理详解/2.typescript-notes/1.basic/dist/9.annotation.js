"use strict";
// 注解，是面向切面编程思想
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
// 可以改变原 person 的逻辑下，增强其功能
function LogClass(constructor) {
    console.log("类的注解", constructor);
}
function LogProperty() {
    return (target, name) => {
        Reflect.set(target, name, "属性注解");
        console.log("属性的注解", target, name);
    };
}
function LogMethod() {
    return (target, name) => {
        console.log("方法的注解", target, name);
    };
}
let Person = class Person {
    name;
    say() { }
};
__decorate([
    LogProperty()
], Person.prototype, "name", void 0);
__decorate([
    LogMethod()
], Person.prototype, "say", null);
Person = __decorate([
    LogClass
], Person);
const person = new Person();
person.name;
console.log(person.name);
person.say();
//# sourceMappingURL=9.annotation.js.map