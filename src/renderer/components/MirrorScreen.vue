<template>
  <div id='page' @mousedown='mouseAct' @mouseup='mouseAct' @mousemove='mouseAct'>
    <canvas v-screen='screendata' id='screen' :width="canvasWidth" :height="canvasHeight" :style="canvasStyle"></canvas>
    <canvas v-cover='cursor' id='cover'></canvas>
    <div class="action-panel">
      <button @click="startAll">startAll</button>
      <button @click="stopAll">StopAll</button>
      <button @click="stopCap">stopCap</button>
      <button @click="startTouch">startTouch</button>
      <button @click="stopTouch">stopTouch</button>
      <button @click="startKoa">startKoa</button>
      <button @click="stopKoa">stopKoa</button>
      <button @click="startSocket">startSocket</button>
      <button @click="stopSocket">stopSocket</button>
      <button @click="debug">debug</button>
      <button @click="matchTemplate">matchTemplate</button>
      <button @click="autoClick">auto</button>
      <input type="checkbox" v-model="auto">
      <input type="range" v-model="slap" max='2000'> {{ slap }}ms
      <button @click="perform">perform</button>
      <span>boundary:{{ canvasBoundary.left }} - {{ canvasBoundary.top }} - {{ canvasBoundary.width }} - {{ canvasBoundary.height }}</span>
    </div>
    <blockquote class='info-panel'>
      {{ socketmsg }}
      <span v-for='(device,idx) in devices' :key="idx">
        {{ device['name']}} - minicap:{{deviceStatus.PID_minicap || 'noMiniCap'}} - minitouch:{{deviceStatus.PID_minitouch || 'noMiniTouch'}}
      </span>
      <span :style="{color:absXY.overScreen?'cyan':'yellow'}">cursor: {{ absXY.x }} - {{ absXY.y }}</span>
      <input v-model="quality" type="range" min="25" max="95" step="5">
    </blockquote>
  </div>
</template>
<script>
import { tagDevice, listDevices, listPidsByComm, stopMiniCap, stopMiniTouch, checkRunning, startMinicap, startMiniTouch, getRotatorMonitor, closeRotatorMonitor } from '@/util/adbkit.js'
import { genKoa, genSocket } from '@/util/servkit.js'
import { liveStream, getTouchSocket } from '@/util/getStream.js'
import _ from 'lodash'

function drawVLine(x, ctx, el) {
  ctx.beginPath();
  ctx.moveTo(x, 0)
  ctx.lineTo(x, el.height)
  ctx.stroke();
}
function drawCross(point, ctx, el) {
  let angel = 30
  let { x, y } = point
  if (!x || !y) return
  ctx.translate(x, y);
  ctx.rotate(angel * Math.PI / 180);
  ctx.translate(-x, -y);

  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(el.width, y)
  ctx.strokeStyle = '#A00'
  ctx.stroke();

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.translate(x, y);
  ctx.rotate(-angel * Math.PI / 180);
  ctx.translate(-x, -y);

  ctx.beginPath();
  ctx.moveTo(0, y)
  ctx.lineTo(el.width, y)
  // ctx.moveTo(x, 0)
  // ctx.lineTo(x, el.height)
  ctx.strokeStyle = '#4A3'
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = '#000'
}

/**
 * 直线轨迹计算
 * x - 时间 ms
 * ratio - canvas像素与触屏像素比例
 * ratio2 - canvasresize的比例
 */
function linearFn(x, ratio, ratio2) {
  if (!ratio) throw new Error('ratio invalid')
  var y = -6.232e-08 * x * x * x + 0.0001559 * x * x + 0.6601 * x - 0.7638
  if (y < 0) y = 0
  return Math.round(y / ratio)
}

export default {
  name: 'mirror-screen',
  data() {
    return {
      auto: false,
      slap: 10,
      ratio: 1,
      quality: 86,
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
      canvasBoundary: { scrollTop: 0, width: 100, height: 100, left: 0, top: 0 },
      cursor: {
        x: 0, y: 0,
        press: false,
        decorator: null,
        clickPoint: {
          x: 0, y: 0
        },
        targetPoint: {
          x: 0, y: 0
        },
        startPoint: {
          x: 0, y: 0
        },
        targetPoint2: {
          x: 0, y: 0, x0: 0
        }
      },
      configure: {
        cursorCross: false,
        markMode: false
      },
      socketmsg: '',
      cachedObj: [],
      sequence: [] // 存储待完成的 Promise
    }
  },
  async created() {
    window.vm = this
    this.mark = {
      lastTimeStamp: null,
      stream: null,
      touchSocket: null,
      theend: false,
      touchend: false,
      pressing: false
    }
    console.info('created')
    this.devices = await listDevices()
    await this.checkStatus()
    // console.info(this.devices)
    // await this.startAll()
    this.calcTouchParams()
    window.onresize = _.debounce(this.calcTouchParams, 500)
  },
  methods: {
    async autoc() {
      this.matchTemplate()
        .then(() => new Promise(r => setTimeout(r, 931 + Math.random() * 223)))
        .then(() => autoc())
    },
    async perform() {
      var slap = this.slap || 10
      console.info('slap', slap)
      let x = 200, y = 200
      if (this.mark.touchSocket && !this.configure.markMode) {
        this.mark.touchSocket.write(`r\n`)
        this.mark.touchSocket.write(`d 0 ${x} ${y} 50\n`)
        this.mark.touchSocket.write(`c\n`)
        await new Promise(r => setTimeout(r, slap))
        this.mark.touchSocket.write(`u\n`)
        this.mark.touchSocket.write(`c\n`)
      } else {
        console.info('no touch Socket')
      }
    },
    async performByDistance(d = 144) {
      let [x, y] = [159 + Math.random() * 100, 159 + Math.random() * 100]
      if (this.mark.touchSocket && !this.configure.markMode) {
        this.mark.touchSocket.write(`r\n`)
        this.mark.touchSocket.write(`d 0 ${x} ${y} 50\n`)
        this.mark.touchSocket.write(`c\n`)
        this.cursor.clickPoint.stamp = +new Date()
        let distance = 0
        while (distance < d) {
          await new Promise(r => setTimeout(r, 5))
          let deltaTime = +new Date() - this.cursor.clickPoint.stamp
          distance = linearFn(deltaTime, this.canvasBoundary.ratio, this.ratio)
          this.cursor.targetPoint.y = this.cursor.clickPoint.y - distance
          // console.info('while ing', mark.pressing, deltaTime)
        }
        console.log({ distance, d })
        this.mark.touchSocket.write(`u\n`)
        this.mark.touchSocket.write(`c\n`)
      } else {
        console.info('no touch Socket')
      }
      return ''
    },
    async startKoa() {
      if (this._server) return
      var vm = this
      // 此处绑定了上下文，不能用箭头函数
      var wsFn = function(message) {
        // console.info(this)
        // this bind 到 websocket
        // TODO protobufjs or flatbufferjs
        if ('capture' === message) {
          this.send(JSON.stringify({ width: vm.canvasWidth, height: vm.canvasHeight }))
          this.send(vm.screendata || Buffer.from(''))
        }
      }
      const app = genKoa(wsFn)
      this._server = app.listen(3456, () => {
        console.info('listening', 3456)
      })
    },
    async stopKoa() {
      if (this._server) {
        this._server.close()
        this._server = null
        console.info('koa _server ', this._server)
      }
    },
    async autoClick() {
      var vm = this
      if (!this._socket) {
        await this.startSocket() //
      }
      if (!this._socket) { throw new Error("socket server start failed") }

      if (!this.cachedObj.clients || !this.cachedObj.clients.length) {
        throw new Error('non socket connections')
      } else {
        let [x, y] = [Math.round(519 + Math.random() * 10), Math.round(1288 + Math.random() * 10)]
        if (this.mark.touchSocket && !this.configure.markMode) {
          this.mark.touchSocket.write(`r\n`)
          console.log('click', x, y)
          this.mark.touchSocket.write(`d 0 ${x} ${y} 50\n`)
          this.mark.touchSocket.write(`c\n`)

          let d = 1500
          new Promise(r => {
            vm.sequence.push(r)
          }).then(result => {
            console.log({ result })
            vm.cursor.startPoint.x = result.startPoint.x
            vm.cursor.startPoint.y = result.startPoint.y + 160
            vm.cursor.targetPoint2.x = result.targetPoint.x
            vm.cursor.targetPoint2.y = result.targetPoint.y + 160
            vm.cursor.targetPoint2.x0 = result.targetPoint.x
            d = Math.round(Math.abs(result.targetPoint.x - result.startPoint.x) / Math.cos(30 * Math.PI / 180)) - 1 + Math.pow(Math.random(), 2) * 6
            console.log({ d })
          })
          this.cursor.clickPoint.stamp = +new Date()
          await new Promise(r => setTimeout(r, 80 + Math.round(Math.pow(Math.random(), .4) * 30)))
          this.cachedObj.clients[0].write(vm.screendata || '0x0000')


          let distance = 0
          let lastmoveStamp = this.cursor.clickPoint.stamp
          while (distance < d) {
            await new Promise(r => setTimeout(r, 5))
            let currentStamp = +new Date()
            let deltaTime = currentStamp - this.cursor.clickPoint.stamp
            let deltaMove = currentStamp - lastmoveStamp
            if (deltaMove > 200) {
              this.mark.touchSocket.write(`m 0 ${x} ${y} 50\n`)
              this.mark.touchSocket.write(`c\n`)
              lastmoveStamp = currentStamp
            }
            distance = linearFn(deltaTime, this.canvasBoundary.ratio, this.ratio)
            this.cursor.targetPoint.y = this.cursor.clickPoint.y - distance
            // console.info('while ing', mark.pressing, deltaTime)
          }
          console.log({ distance, d })
          this.mark.touchSocket.write(`u\n`)
          this.mark.touchSocket.write(`c\n`)
          if (vm.auto) {
            await new Promise(r => setTimeout(r, 1230 + Math.round(Math.pow(Math.random(), .3) * 300)))
            vm.autoClick()
          }
        } else {
          console.info('no touch Socket')
        }

      }
    },
    async matchTemplate() {
      var vm = this
      if (!this._socket) {
        await this.startSocket() //
      }
      if (!this._socket) { throw new Error("socket server start failed") }

      if (!this.cachedObj.clients || !this.cachedObj.clients.length) {
        throw new Error('non socket connections')
      } else {
        this.cachedObj.clients[0].write(vm.screendata || '0x0000')
        return new Promise(r => {
          vm.sequence.push(r)
        }).then(result => {
          console.log({ result })
          vm.cursor.startPoint.x = result.startPoint.x
          vm.cursor.startPoint.y = result.startPoint.y + 160
          vm.cursor.targetPoint2.x = result.targetPoint.x
          vm.cursor.targetPoint2.y = result.targetPoint.y + 160
          vm.cursor.targetPoint2.x0 = result.targetPoint.x
          let distance = Math.round(Math.abs(result.targetPoint.x - result.startPoint.x) / Math.cos(30 * Math.PI / 180)) * vm.ratio
          console.log({ distance })
          return vm.performByDistance(distance)
        })
      }
    },
    async startSocket() {
      var vm = this
      if (vm._socket) return
      // 使用了bind，不能使用箭头函数
      var sFn = function(data) {
        console.info('socket serv:', data.toString())
        vm.socketmsg = data.toString()
        switch (data.toString()) {
          case 'capture':
            this.write(vm.screendata || '0x0000')
        }
        try {
          let info = JSON.parse(data.toString())
          switch (info.type) {
            case 'point':
              break
            case 'match':
              vm.sequence.forEach(r => r(info))
              vm.sequence.splice(0, vm.sequence.length)
              break
            default:

          }
        } catch (e) {
          console.log(e, 'not JSON msg')
        }
      }
      var server = genSocket(sFn, vm.cachedObj)
      return new Promise(r => {
        server.listen(1338, '127.0.0.1', function(...x) {
          // console.info(x, this)
          vm._socket = this
          r()
        })
      })
    },
    async stopSocket() {
      if (this._socket) {
        this._socket.close()
        this._socket = null
        console.log('_socket => ', this._socket)
      }
    },
    async checkStatus() {
      let { err, minicap, minitouch } = await checkRunning()
      console.info('checkRunning', { err, minicap, minitouch })
      if (!err) {
        this.deviceStatus.PID_minicap = minicap
        this.deviceStatus.PID_minitouch = minitouch
      }
    },

    async monitorRotate() {
      let rotatorMonitorSocket = await getRotatorMonitor()
      rotatorMonitorSocket.on('readable', async () => {
        let chunk = rotatorMonitorSocket.read()
        if (!chunk) return
        this.deviceStatus.orientation = /\d+/.exec(chunk.toString())[0]
        console.info('[  set status.orientation to ', this.deviceStatus.orientation)
        await this.stopStream()
        let result = await startMinicap({ orientation: this.deviceStatus.orientation, quality: this.quality })
        console.log('result')
        await this.gotStream()
        // this.$nextTick(function() {
        //   this.calcTouchParams()
        // })
      })
      rotatorMonitorSocket.on('close', async () => {
        await this.stopStream()
        console.info('[ rotatorMonitorSocket closed] ')
      })
    },
    async getTouchServ() {
      // let vm = this
      if (!this.mark.touchSocket) {
        this.mark.touchSocket = (await getTouchSocket({ mark: this.mark }))
      }
    },
    async gotStream() {
      var mark = this.mark
      mark.theend = false
      let vm = this
      let cb = (err, frameBody) => { // 作为传入其他函数的回掉函数，不能使用不固定的this
        vm.screendata = frameBody
      }
      if (!mark.stream) {
        mark.stream = (await liveStream({ device: this.currentdevice, mark, cb }))
      }
    },
    async stopStream() {
      console.info('stopStream')
      this.mark.theend = true
      this.mark.stream && !this.mark.stream.err && this.mark.stream.end()
    },
    async startTouch() {
      this.mark.touchend = false
      let actMsg = await startMiniTouch()
      console.info('miniTouch Serv: ', actMsg)
      if (!this.mark.touchSocket) {
        this.mark.touchSocket = (await getTouchSocket({ mark: this.mark }))
        console.info(this.mark)
      } else {
        console.info('touchSocket already')
      }
    },
    async stopCap() {
      this.mark.theend = true
      console.info(this.mark.stream)
      this.mark.stream && !this.mark.stream.err && this.mark.stream.end()
      this.mark.stream = null
      let killResult = await stopMiniCap()
      await this.checkStatus()
    },
    async stopTouch() {
      this.mark.touchend = true
      console.info(this.mark.touchSocket)
      this.mark.touchSocket && !this.mark.touchSocket.err && this.mark.touchSocket.end()
      this.mark.touchSocket = null
      let killResult = await stopMiniTouch()
      await this.checkStatus()
    },
    async startAll() {
      // let result = await startMinicap({ orientation: this.deviceStatus.orientation })
      // console.info({ result })

      this.devices = await listDevices()
      await this.monitorRotate()
      // await this.gotStream()
    },
    async stopAll() {
      console.info('stopAll')
      this.currentdevice = null
      await this.getTouchServ()
      // 停止检测屏幕旋转
      await closeRotatorMonitor()
      // 停止图像流输入
      await this.stopStream()
      this.mark.touchSocket && !this.mark.touchSocket.err && this.mark.touchSocket.end()
      this.mark.touchSocket = null
      this.mark.theend = true
      this.mark.touchend = true
    },
    async debug() {
      // await this.start()
      // let { code, message } = await startMinicap()
      // console.info({ code, message })
      await this.checkStatus()

    },
    calcTouchParams() {
      this.$nextTick(function() {
        let coverEl = this.$el.querySelector('canvas#cover')
        coverEl.width = this.$el.offsetWidth
        coverEl.height = this.$el.offsetHeight

        let targetEl = this.$el.querySelector('canvas#screen')
        // let { width, height, left, top } = targetEl.getBoundingClientRect()
        // https://jsperf.com/getcomputedstyle-vs-getboundingclientrect/3 ,性能比较。由于当前页面使用了固定的绝对定位，采用offset方式取值同样方便
        let { offsetLeft, offsetTop, clientWidth, clientHeight } = targetEl
        this.canvasBoundary.width = clientWidth
        this.canvasBoundary.height = clientHeight
        this.canvasBoundary.left = offsetLeft
        this.canvasBoundary.top = offsetTop
        if (!clientWidth || !clientHeight) return console.error('error client Width/Height')
        this.canvasBoundary.ratio = Math.ceil(1920 * 100 / Math.max(clientWidth, clientHeight)) / 100
        console.info('new Boundary Data Settled')
        clientWidth = this.canvasBoundary.width || 1
        this.ratio = Math.floor(Math.ceil(clientWidth) * 1000 / this.canvasWidth) / 1000
        console.info(`\
        CANVAS EL: width - ${clientWidth}
        IMG width: ${this.canvasWidth}
        ratio: ${this.ratio}`)
      })
    },
    async mouseAct(e) {
      // console.info(e)
      this.cursor.x = e.x
      this.cursor.y = e.y
      let { x, y } = this.absXY
      let hit = []
      if (e.target.tagName !== 'CANVAS') return
      switch (e.type) {
        case 'mousemove':
          if (this.mark.pressing) {
            if (this.mark.touchSocket && !this.configure.markMode) {
              this.mark.touchSocket.write(`m 0 ${x} ${y} 50\n`)
              this.mark.touchSocket.write(`c\n`)
            }
            this.cursor.targetPoint.y -= 1
          }
          break
        case 'mousedown':
          this.mark.pressing = false
          // console.info(this.mark)
          // console.info('mousedown', { x, y })
          // console.info(this.mark)
          // await new Promise(r => {
          // setTimeout(r, 200)
          // })
          if (this.mark.touchSocket && !this.configure.markMode) {

            console.log('click', x, y)
            this.mark.touchSocket.write(`r\n`)
            this.mark.touchSocket.write(`d 0 ${x} ${y} 50\n`)
            this.mark.touchSocket.write(`c\n`)
          }
          // this.cursorData.points.clickin = { x: ox, y: oy }
          // this.cursorData.points.clickout = null
          let stamp = +new Date()
          this.cursor.clickPoint = { x: e.x, y: e.y, stamp }
          this.cursor.targetPoint = { x: e.x, y: e.y - 20, stamp }
          this.mark.pressing = true
          var mark = this.mark
          while (mark.pressing) {
            let deltaTime = +new Date() - this.cursor.clickPoint.stamp
            this.cursor.targetPoint.y = this.cursor.clickPoint.y -
              linearFn(deltaTime, this.canvasBoundary.ratio, this.ratio)
            // console.info('while ing', mark.pressing, deltaTime)
            await new Promise(r => setTimeout(r, 10))
          }
          break
        case 'mouseup':
          // this.cursorData.points.clickout = { x: ox, y: oy }
          this.mark.pressing = false
          if (this.mark.touchSocket && !this.configure.markMode) {
            this.mark.touchSocket.write(`u\n`)
            this.mark.touchSocket.write(`c\n`)
          }
          // this.$Message.info(`mouseup @ ${x} ${y}`)
          break
      }
    }
  },

  watch: {
    canvasWidth: function(newValue, oldValue) {
      // console.info({ newValue, oldValue })
      this.calcTouchParams()
    }
  },
  computed: {
    canvasStyle() {
      if (!this.canvasHeight || !this.canvasWidth) return console.error('wrong height or width'), {}
      return {
        height: Math.round(+this.canvasHeight * 1000 / this.canvasWidth) / 10 + 'vw',
        maxWidth: Math.round(this.canvasWidth / this.canvasHeight * 1000) / 10 + 'vh'
      }
    },
    absXY() {
      let x = this.cursor.x - this.canvasBoundary.left
      let y = this.cursor.y - this.canvasBoundary.top
      let overScreen = true
      if (x < 0 || y < 0 || y > this.canvasBoundary.height || x > this.canvasBoundary.width) {
        overScreen = false
      }

      // console.info('click @ ', x, y)
      ;[x, y] = [x, y].map(n => Math.floor(this.canvasBoundary.ratio * n))
      // console.info('click @ ', x, y)
      switch (this.deviceStatus.orientation) {
        case '270':
          ;[x, y] = [y, 1920 - x]
          break
        case '90':
          ;[x, y] = [1080 - y, x]
          break
        case '180':
          ;[x, y] = [1080 - x, 1920 - y]
          break
      }
      return { x, y, overScreen }
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
    },
    cover(el, binding, vNode) {
      if (!binding.value) return
      // let BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      // var g = el.getContext('2d')
      let { x, y, clickPoint, targetPoint, startPoint, targetPoint2 } = binding.value
      let vm = vNode.context
      var ctx = el.getContext('2d')
      ctx.clearRect(0, 0, el.width, el.height)
      let dX = el.width / 2 - x
      let dY = el.height / 2 - y


      drawCross({ x, y }, ctx, el)
      // drawCross(clickPoint, ctx, el)
      drawCross(startPoint, ctx, el)
      drawCross(targetPoint2, ctx, el)
      drawVLine(targetPoint2.x0, ctx, el)

      // ctx.translate(-el.width / 2, -el.height / 2)
      // ctx.globalAlpha = 0.3
      // ctx.fillRect(100, 100, el.width - 200, el.height - 200)
      // ctx.globalAlpha = 1.0
      // drawCross({ x, y }, ctx, el)
      // ctx.translate(el.width / 2, el.height / 2)
      // ctx.rotate(-45 * Math.PI / 180);
      // ctx.translate(x, y);
      // ctx.setTransform(1, 0, 0, 1, 0, 0);
      // ctx.setTransform(1, 0, 0, 1, 0, 0);

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

.action-panel,
blockquote.info-panel {
  color: antiquewhite;
  position: absolute;
  bottom: 0;
  background: rgba(0, 0, 0, .3);
  width: 100%;
  padding: .5em .2em;
  z-index: 15;
}

.action-panel {
  bottom: auto;
  top: 0
}

#cover {
  position: absolute;
  /* background: rgba(0, 0, 0, .1); */
  z-index: 10;
}
</style>
