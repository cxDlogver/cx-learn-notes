<template>
  <div>
    <h1>Hello Vue :smile:</h1>
    <h2>Hello Vue :cry:</h2>
  </div>
</template>

<script>
fetch("/api/hello")
  .then((res) => res.text())
  .then((text) => console.log(text));

// track
</script>
