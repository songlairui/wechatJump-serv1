<template>
  <div id='page'>
    <canvas v-screen='screendata' id='screen' :width="canvasWidth" :height="canvasHeight" :style="canvasStyle"></canvas>
    <h1 @click="debug">Screen</h1>
    <blockquote class='info-panel'>
      <span v-for='(device,idx) in devices' :key="idx">
        {{ device['name']}} - {{device['id']}} - {{device['sdk']}} - minicap:{{deviceStatus.PID_minicap || 'noMiniCap'}}
      </span>
    </blockquote>
  </div>
</template>
<script>
import { listDevices, listPidsByComm, checkRunning, startMinicap } from '@/util/adbkit.js'

import { liveStream, getTouchSocket } from '@/util/getStream.js'

export default {
  name: 'mirror-screen',
  data() {
    return {
      canvasWidth: 100,
      canvasHeight: 100,
      devices: [],
      currentdevice: null,
      deviceStatus: {
        PID_minicap: [],
        PID_minitouch: [],
        orientation: '0'
      },
      screendata: null,
    }
  },
  async created() {

    this.mark = {
      lastTimeStamp: null,
      stream: null,
      touchSocket: null,
      theend: false,
      pressing: false
    }
    console.info('created')
    setInterval(this.toggleSize, 5000)
    this.devices = await listDevices()
    await this.checkStatus()
  },
  computed: {
    canvasStyle() {
      if (!this.canvasHeight || !this.canvasWidth) return console.error('wrong height or width'), {}
      let style = {
        height: Math.round(+this.canvasHeight * 1000 / this.canvasWidth) / 10 + 'vw',
        maxWidth: Math.round(this.canvasWidth / this.canvasHeight * 1000) / 10 + 'vh'
      }
      console.info(style)
      return style
    }
  },
  directives: {
    screen(el, binding, vNode) {
      // console.info('[canvas Screen]')
      if (!binding.value) return
      // console.info('render an image ---- ', +new Date())
      let BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      var g = el.getContext('2d')
      var blob = new Blob([binding.value], { type: 'image/jpeg' })
      var URL = window.URL || window.webkitURL
      var img = new Image()
      img.onload = () => {
        vNode.context.canvasWidth = img.width
        vNode.context.canvasHeight = img.height
        g.drawImage(img, 0, 0)
        // firstImgLoad = true
        img.onload = null
        img.src = BLANK_IMG
        img = null
        u = null
        blob = null
      }
      var u = URL.createObjectURL(blob)
      img.src = u
    }
  },
  methods: {
    async checkStatus() {
      let { err, result } = await checkRunning()
      console.info('checkRunning', { err, result })
      if (!err)
        this.deviceStatus.PID_minicap = result
    },
    async gotStream() {
      this.mark.theend = false
      let vm = this
      let cb = function(err, frameBody) {
        // console.info('here is a frameBody. ')
        // console.info({ vm, frameBody })
        vm.screendata = frameBody
      }
      if (!this.mark.stream) {
        this.mark.stream = (await liveStream({ device: this.currentdevice, mark: this.mark, cb }))
      }
    },
    async stopStream() {
      this.mark.theend = true
      this.mark.stream && this.mark.stream.end()
    },
    async start() {
      await this.stopStream()
      let result = await startMinicap({ orientation: this.deviceStatus.orientation })
      console.info({ result })
      await this.gotStream()
    },
    async debug() {
      await this.start()
      // let { code, message } = await startMinicap()
      // console.info({ code, message })
      await this.checkStatus()

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
