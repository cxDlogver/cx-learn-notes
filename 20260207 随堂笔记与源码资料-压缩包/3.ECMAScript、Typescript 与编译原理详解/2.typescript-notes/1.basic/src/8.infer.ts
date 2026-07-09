// infer 推导某些类型中的派生数据类型
function add(a: number, b: number) {
  return a + b;
}

// 需求：add 函数中参数的类型提取出来
type AddType = typeof add
let parameterType: ParameterType<AddType>
let returnType: ReturnType<AddType>
// infer 推导


// 1. 确定提供的函数符合 add 函数结构
// 2. infer 提取
// 3. 返回
type ParameterType<F> = F extends (...args: infer P) => number ? P : false

// 提取 add 函数返回值类型
type ReturnType<F> = F extends (a: number, b: number) => infer R ? R : false