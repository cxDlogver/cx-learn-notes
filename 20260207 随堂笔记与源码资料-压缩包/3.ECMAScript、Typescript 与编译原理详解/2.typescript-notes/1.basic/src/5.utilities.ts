// 面试可能会问到
// 比如：Omit、Pick、Partial、Required

// Omit，将某个对象或者接口类型中的属性去除
interface Student {
  name: string;
  age: number;
  gender: string;
}

type StudentWithoutGender = Omit<Student, "gender">;

// Pick，用来取出某个类型中的属性

type StudentWithName = Pick<Student, "name">;

// interface FreeStudent {
//   name?: string;
//   age?: number;
//   gender?: string;
// }
type FreeStudent = Partial<Student>
const student: FreeStudent = {};
