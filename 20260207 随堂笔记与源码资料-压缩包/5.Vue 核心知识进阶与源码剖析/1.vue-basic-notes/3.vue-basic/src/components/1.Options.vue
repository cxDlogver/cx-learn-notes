<script lang="ts">
export default {
  data() {
    return {
      count: 1,
      isShow: true,
      lists: [1, 2, 3, 4, 5],
    };
  },
  computed: {
    //计算属性，状态派生
    double() {
      return this.count * 2;
    },
  },
  methods: {
    add() {
      this.count++;
    },
    toggle() {
      this.isShow = !this.isShow;
    },
    append() {
      this.lists.push(this.lists.length);
    },
  },
  // 侦听器，当 count 变化后，我要修改浏览器标题  document.title = count
  watch: {
    count(newVal, oldVal) {
      console.log('🚀 ~ newVal:', newVal)
      document.title = newVal; // 副作用
    },
  },
  beforeCreate() {
    console.log('beforeCreate')
  },
  created() {
    console.log('created')
  },
  beforeUpdate() {
    console.log('beforeUpdate')
  },
  updated() {
    console.log('updated')
  },
  beforeMount() {
    console.log('beforeMount')
  },
  mounted() {
    console.log('mounted')
    // 获取 canvas，画图
    const canvasDom = this.$refs.canvas as HTMLCanvasElement
    console.log('🚀 ~ canvasDom:', canvasDom, /* this.$props, this.$emit */)
    const ctx = canvasDom.getContext('2d')

    ctx?.beginPath()
    ctx?.moveTo(0, 0)
    ctx?.lineTo(100, 100)

    ctx?.stroke()

    ctx?.closePath()
  }
};
</script>

<template>
  {{ count }} --- {{ double }}
  <div v-if="isShow">{{ isShow }}</div>
  <ul>
    <li v-for="(item, index) in lists">{{ index }}---{{ item }}</li>
  </ul>
  <canvas ref="canvas" />
  <button v-on:click="add">+</button>
  <button @click="add">+</button>
  <button @click="toggle">toggle</button>
  <button @click="append">增加内容</button>
</template>
