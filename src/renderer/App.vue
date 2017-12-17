<template>
  <div id="app">
    <!-- <landing-page></landing-page> -->
    <mirror-screen></mirror-screen>
  </div>
</template>

<script>
// import LandingPage from '@/components/LandingPage'
import MirrorScreen from '@/components/MirrorScreen'

export default {
  name: 'electron-serv',
  components: {
    MirrorScreen
  }
}
</script>

<style>
/* CSS */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
}

#app {
  /* border: thin solid blue; */
}
</style>
