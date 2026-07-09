import { onMounted, reactive, UnwrapRef } from "vue";
// 一定要以 use 开头
export const useList = <T>(initial: T) => {
  const list = reactive([]);
  // const list = reactive<T[]>([]);

  onMounted(() => {
    list.push(initial)
  })

  // Composition API，对应两个函数
  const append = (data: T) => {
    list.push(data);
  };

  const remove = (index: number) => {
    list.splice(index, 1);
  };

  return {
    list,
    append,
    remove,
  };
};
