<script setup lang="ts">
import { onMounted, ref } from "vue";
import useCounterStore from "../stores/useCounterStore";
import useDetailStore from "../stores/useDetailStore";
import viteLogo from "../assets/vite.svg";
import heroImg from "../assets/hero.png";
import vueLogo from "../assets/vue.svg";

const count = ref(0);
const width = ref(0);

const countStore = useCounterStore();
const detailStore = useDetailStore();

onMounted(() => {
  const animate = () => {
    width.value += 100;
    requestAnimationFrame(animate);
  };

  // animate();
});

onMounted(() => {
  const test = () => {
    // 时间切片机制
    for (let i = 0; i < 10000; i++) {
      console.log(i);
    }
  };

  // test();
});
</script>

<template>
  {{ countStore.count }}<button @click="countStore.add()">+</button> ---
  {{ detailStore.info
  }}
  <button @click="detailStore.updateTitle()">updateTitle</button>
  <button @click="detailStore.updateFooter()">updateFooter</button>
  <img
    :style="{ transform: `scale(${width / 100})` }"
    src="https://wptcapture.webpagetest.org/hawkcaptureserver/down-wpt.ashx?test=260524_instant_3fe5095d065c4c829cf3b0079de7aa02.video&a=1_screen.jpg&s=92d31091c67b3693b952ad59b4ce4777"
  />
  <section id="center">
    <div class="hero">
      <img :src="heroImg" class="base" width="170" height="179" alt="" />
      <img :src="vueLogo" class="framework" alt="Vue logo" />
      <img :src="viteLogo" class="vite" alt="Vite logo" />
    </div>
    <div>
      <h1>Get started</h1>
      <p>Edit <code>src/App.vue</code> and save to test <code>HMR</code></p>
    </div>
    <button type="button" class="counter" @click="count++">
      Count is {{ count }}
    </button>
  </section>

  <div class="ticks"></div>

  <section id="next-steps">
    <div id="docs">
      <svg class="icon" role="presentation" aria-hidden="true">
        <use href="/icons.svg#documentation-icon"></use>
      </svg>
      <h2>Documentation</h2>
      <p>Your questions, answered</p>
      <ul>
        <li>
          <a href="https://vite.dev/" target="_blank">
            <img class="logo" :src="viteLogo" alt="" />
            Explore Vite
          </a>
        </li>
        <li>
          <a href="https://vuejs.org/" target="_blank">
            <img class="button-icon" :src="vueLogo" alt="" />
            Learn more
          </a>
        </li>
      </ul>
    </div>
    <div id="social">
      <svg class="icon" role="presentation" aria-hidden="true">
        <use href="/icons.svg#social-icon"></use>
      </svg>
      <h2>Connect with us</h2>
      <p>Join the Vite community</p>
      <ul>
        <li>
          <a href="https://github.com/vitejs/vite" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#github-icon"></use>
            </svg>
            GitHub
          </a>
        </li>
        <li>
          <a href="https://chat.vite.dev/" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#discord-icon"></use>
            </svg>
            Discord
          </a>
        </li>
        <li>
          <a href="https://x.com/vite_js" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#x-icon"></use>
            </svg>
            X.com
          </a>
        </li>
        <li>
          <a href="https://bsky.app/profile/vite.dev" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#bluesky-icon"></use>
            </svg>
            Bluesky
          </a>
        </li>
      </ul>
    </div>
  </section>

  <div class="ticks"></div>
  <section id="spacer"></section>
</template>
