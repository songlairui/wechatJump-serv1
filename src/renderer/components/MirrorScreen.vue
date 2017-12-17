<template>
  <div id='page'>
    <h1>Screen</h1>
    <canvas id='screen' :width="width + 'px'" :height="height+'px'" :style="canvasStyle"></canvas>
  </div>
</template>
<script>
export default {
  name: 'mirror-screen',
  data() {
    return {
      width: 200,
      height: 100
    }
  },
  created() {
    console.info('created')
    setInterval(this.toggleSize, 2500)
  },
  computed: {
    canvasStyle() {
      if (!this.height || !this.width) return console.error('wrong height or width'), {}
      let style = {
        height: Math.round(+this.height * 1000 / this.width) / 10 + 'vw',
        maxWidth: Math.round(this.width / this.height * 1000) / 10 + 'vh'
      }
      console.info(style)
      return style
    }
  },
  methods: {
    toggleSize() {
      console.info('toggleSize', this.width)
      if (this.width === 200) {
        this.width = 100
        this.height = 200
      } else {
        this.width = 200
        this.height = 100
      }
    }
  }
}
</script>
<style>
h1 {
  position: absolute;
  z-index: 9;
}

#page {
  min-height: 100%;
  position: relative;
}

canvas#screen {
  background: lightblue;
  /* transition: all .4s; */
  width: 100vw;
  /*  需要计算  */
  height: 56.25vw;
  /* 100/56.25 = 1.778 */
  max-height: 100vh;
  /* 需要计算  */
  max-width: 177.78vh;
  /* 16/9 = 1.778 */
  margin: auto;
  position: absolute;
  top: 0;
  bottom: 0;
  /* vertical center */
  left: 0;
  right: 0;
  /* horizontal center */
}
</style>
