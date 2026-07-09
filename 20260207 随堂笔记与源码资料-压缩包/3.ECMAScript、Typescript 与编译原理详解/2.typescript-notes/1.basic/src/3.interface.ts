// 接口
// 对象的进一步抽象
class Human {
  gender = 18;
  say(msg: string) {
    console.log("说话" + msg);
  }
}

// class Human {
//     gender:string // 类型是 string
//     say() { // 一个函数，参数 msg string，没有返回
//         console.log('说话')
//     }
// }
interface IHuman {
  gender: string; // 类型是 string
  say(msg: string): void;
}

// 接下来就是可以将接口作为类型约束，也可以作为类的实际实现样板
class Human2 implements IHuman {
  gender = "10";
  say(msg: string): void {
    console.log(msg);
  }
}
