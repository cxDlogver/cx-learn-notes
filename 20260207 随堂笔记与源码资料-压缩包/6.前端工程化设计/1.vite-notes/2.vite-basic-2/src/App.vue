<script lang="ts" setup>
fetch("/api/topics")
  .then((res) => {
    return res.json();
  })
  .then((res) => console.log(res));
</script>

<template>heyi</template>
