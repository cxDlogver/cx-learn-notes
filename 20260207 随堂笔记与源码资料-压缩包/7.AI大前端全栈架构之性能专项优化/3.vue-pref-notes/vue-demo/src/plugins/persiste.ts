export function createPersistedStatePlugin() {
  return ({ store }) => {
    console.log("🚀 ~ createPersistedStatePlugin ~ store:", store);
    const key = store.$id;

    const fromStorage = localStorage.getItem(key);
    // 如果取到了缓存，就更新到 store 中
    if (fromStorage) {
      store.$patch(JSON.parse(fromStorage));
    }

    // 状态变化时，应该同步到 localStorage
    store.$subscribe((_, state) => {
      localStorage.setItem(key, JSON.stringify(state));
    });
  };
}
