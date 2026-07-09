// 用来记录 pinia 调用日志

import { type PiniaPluginContext } from "pinia";

// pinia 插件本质是一个函数
// 函数柯里化，返回一函数，它才能够在调用这个内部函数的时候，给定参数，pinia 上下文参数
export const createLogger = () => {
  return (ctx: PiniaPluginContext) => {
    const store = ctx.store;

    store.$onAction(({ name, args, after, onError }) => {
      console.log("🚀 ~ createLogger ~ name:", name);
      console.log("🚀 ~ createLogger ~ args:", args);

      after(() => {
        console.log("🚀 ~ createLogger ~ after");
      });

      onError(() => {
        console.log("🚀 ~ createLogger ~ onError");
      });
    });
  };
};
