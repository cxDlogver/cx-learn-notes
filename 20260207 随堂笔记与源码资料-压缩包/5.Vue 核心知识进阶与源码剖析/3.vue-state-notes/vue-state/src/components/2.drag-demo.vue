<script setup lang="ts">
import { useDrag } from '@/composable/useDrag';

const {rect, rectRef} = useDrag()

</script>

<template>
  <div
    class="rect"
    ref="rectRef"
    :style="{
      backgroundColor: rect.isDraging ? 'blue' : 'red',
      // transition: 'transform .1s linear',
      transform: `translate(${rect.offset.x}px, ${rect.offset.y}px)`,
    }"
  ></div>
</template>

<style scoped>
.rect {
  position: absolute;
  width: 100px;
  height: 100px;
  background-color: red;
}
</style>
