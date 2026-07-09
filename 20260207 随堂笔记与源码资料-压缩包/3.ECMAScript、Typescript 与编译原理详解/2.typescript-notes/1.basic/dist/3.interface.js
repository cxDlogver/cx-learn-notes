"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 接口
// 对象的进一步抽象
class Human {
    gender = 18;
    say(msg) {
        console.log("说话" + msg);
    }
}
// 接下来就是可以将接口作为类型约束，也可以作为类的实际实现样板
class Human2 {
    gender = "10";
    say(msg) {
        console.log(msg);
    }
}
//# sourceMappingURL=3.interface.js.map