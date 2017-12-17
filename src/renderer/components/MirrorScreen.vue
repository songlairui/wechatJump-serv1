<template>
  <div id='page'>
    <canvas id='screen' :width="width + 'px'" :height="height+'px'" :style="canvasStyle"></canvas>
    <h1 @click="debug">Screen</h1>
    <blockquote class='info-panel'>
      <span v-for='(device,idx) in devices' :key="idx">
        {{ device['name']}} - {{device['id']}} - {{device['sdk']}}
      </span>
    </blockquote>
  </div>
</template>
<script>
import { listDevices } from '@/util/adbkit.js'
export default {
  name: 'mirror-screen',
  data() {
    return {
      width: 200,
      height: 100,
      devices: []
    }
  },
  async created() {
    console.info('created')
    setInterval(this.toggleSize, 5000)
    this.devices = await listDevices()
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
    async debug() {
      let devices = await listDevices()
      console.info({ devices })
    },
    toggleSize() {
      // console.info('toggleSize', this.width)
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

blockquote.info-panel {
  position: absolute;
  bottom: 0;
  background: rgba(0, 0, 0, .3);
  width: 100%;
  padding: .5em .2em;
}
</style>
