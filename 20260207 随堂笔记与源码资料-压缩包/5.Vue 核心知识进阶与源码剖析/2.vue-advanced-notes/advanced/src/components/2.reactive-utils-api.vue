<script setup lang="ts">
import {
  isRef,
  unref,
  isReactive,
  isReadonly,
  isProxy,
  ref,
  reactive,
  readonly,
  toRef,
  toValue,
  toRefs,
} from "vue";
const count = ref(0);
const info = reactive({ name: "heyi", age: 18 });
const readonlyInfo = readonly(info);

// 判断 count 是不是一个 ref
const isRefData = isRef(count);
const isReactiveData = isReactive(info);
const isReadonlyData = isReadonly(readonlyInfo);
console.log("🚀 ~ isRefData:", isRefData);
console.log("🚀 ~ isReactiveData:", isReactiveData);
console.log("🚀 ~ isReadonlyData:", isReadonlyData);

const isProxyData1 = isProxy(info);
const isProxyData2 = isProxy(readonlyInfo);
const isProxyData3 = isProxy(count);

console.log("🚀 ~ isProxyData1, reactive:", isProxyData1);
console.log("🚀 ~ isProxyData2, readonly:", isProxyData2);
console.log("🚀 ~ isProxyData3m, ref:", isProxyData3);

const countData = unref(count);
console.log("🚀 ~ countData:", count, countData);

const age = toRef(info.age);

 /**```js
 * toValue(1) // 1
 * toValue(ref(1)) // 1
 * toValue(() => 1) // 1
 * ```
 * */
const v = toValue(count)
console.log('🚀 ~ v :', v )

// 将 reactive 对象，很多属性
const refInfos = toRefs(info)
</script>

<template>
  <div>{{ count }}--info.age:{{info.age}}-{{ age }}</div>
  <div>refInfos.age:{{ refInfos.age }}---{{ refInfos.name }}</div>
  <button @click="info.age++">info.age+</button>
  <button @click="age++">age+</button>
  <button @click="refInfos.age.value++">refInfos.age+</button>
</template>
