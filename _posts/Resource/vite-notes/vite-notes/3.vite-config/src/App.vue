<template>
  <div>
    <h1>Hello Vue</h1>
  </div>
</template>

<script>
fetch("/api/hello")
  .then((res) => res.text())
  .then((text) => console.log(text));
</script>
