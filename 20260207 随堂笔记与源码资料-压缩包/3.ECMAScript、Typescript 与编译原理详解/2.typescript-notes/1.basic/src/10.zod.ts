import u from "./10.user.json";
import * as z from "zod";

type User = {
  name: string;
  age: number;
};
// 一定能保证，静态类型检查
const user: User = {
  name: "heyi",
  age: 18,
};
console.log(user.name, user.age);

const UserSchema = z.object({
  name: z.string().describe("用户的名称"),
  age: z.number().describe("用户的年龄"),
});

// zod 还可以通过 schema 的定义，直接推导出来 ts 类型
type ZodUser = z.infer<typeof UserSchema>

// 比如我的 user 数据来自于后端
console.log(UserSchema.parse(u));
