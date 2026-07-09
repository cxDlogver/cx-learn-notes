<script setup lang="ts">
import {
  customRef,
  effectScope,
  markRaw,
  onScopeDispose,
  reactive,
  ref,
  shallowReactive,
  shallowReadonly,
  shallowRef,
  triggerRef,
  watchEffect,
} from "vue";

// 浅层 reactive 响应式数据
const data = shallowReactive({
  count: 0, // 关注点只有这一个数据作为响应式数据，其他可以不管
  basic: {
    info: {
      block: {},
    },
  },
  basic2: {
    info: {
      block: {},
    },
  },
});

// 浅层只读数据
const readonlyData = shallowReadonly(data);

const data2 = shallowRef({
  basic: {
    info: {
      block: {
        count: 0, // 关注点只有这一个数据作为响应式数据，其他可以不管
      },
    },
  },
  basic2: {
    info: {
      block: {},
    },
  },
});

const handleData2CountAdd = () => {
  data2.value.basic.info.block.count++;

  triggerRef(data2);
};

// markRaw，标记为普通数据，并且不能作为响应数据
const data3Raw = markRaw({ data: 1 });
const data3 = reactive(data3Raw);
console.log("🚀 ~ data3:", data3Raw, data3);

// 有好几个副作用
// 1. 修改浏览器的标题
// 2. 修改 body 背景色
const bgTitleScope = effectScope();
bgTitleScope.run(() => {
  // const count = ref(0);
  watchEffect(() => {
    document.title = `${data.count}`;
  });

  watchEffect(() => {
    document.body.style.backgroundColor = `rgba(0,0,0,${1 / data.count})`;
  });

  watchEffect(() => {
    console.log("🚀 ~ data.count:", data.count);
    if (data.count === 5) {
      bgTitleScope.stop();
    }
  });

  onScopeDispose(() => {
    console.log("副作用清除了...");
  });
});
</script>

<template>
  <div>{{ data.count }}</div>
  <button @click="data.count++">data.count++</button>
  <div>{{ data2.basic.info.block.count }}</div>
  <button @click="handleData2CountAdd">
    data2.value.basic.info.block.count++
  </button>

  <div>{{ data3.data }}</div>

  <button @click="data3.data++">data3.data++</button>
</template>
