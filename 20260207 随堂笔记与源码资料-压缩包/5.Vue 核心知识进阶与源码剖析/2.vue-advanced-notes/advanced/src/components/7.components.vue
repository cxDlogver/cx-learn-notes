<script setup lang="ts">
import { ref, useId } from "vue";
import ComponentsChild from "./7.components-child.vue";

const isShow = ref(false);
const isAllShow = ref(true);

const isModalShow = ref(false);

const divId = useId();

const divRef = ref();
</script>

<template>
  <div v-if="isAllShow">
    <KeepAlive>
      <ComponentsChild v-if="isShow" />
    </KeepAlive>
  </div>
  <button @click="isShow = !isShow">toogle</button>
  <button @click="isAllShow = !isAllShow">toogle all show</button>

  <Teleport to="body">
    <div class="modal" v-if="isModalShow">
      <div class="mask"></div>
      <div class="modal-content">
        <button @click="isModalShow = !isModalShow">X</button>
      </div>
    </div>
  </Teleport>
  <button @click="isModalShow = !isModalShow">显示 Model</button>

  <!-- <div ref="divRef">123</div>
  <div v-if="isShow">
    <Teleport :to="divRef">
      <div>123 的星弟</div>
    </Teleport>
  </div> -->
  <div :class="divId">123</div>
  <Teleport :to="`.${divId}`">
    <div>123 的星弟</div>
  </Teleport>
</template>

<style>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* transform: translate(-50%, -50%);
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); */
}
.modal .mask {
  position: absolute;
  z-index: -1;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
}
</style>
