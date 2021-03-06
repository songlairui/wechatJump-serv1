const Koa = require('koa')
const KoaRouter = require('koa-router')
const net = require('net')
const route = require('koa-route')
const logger = require('koa-logger')
const fs = require('fs')
const path = require('path')
const extname = path.extname
const websockify = require('koa-websocket')

export function genKoa(
  wsFn = m => console.info(m),
  info = info_default,
  screenshot = screenshot_default,
  touch = touch_default
) {
  var router = KoaRouter()
  const app = websockify(new Koa())
  app.use(logger())
  router
    .get('/screenshot', screenshot)
    .get('/act/touch/:x/:y', touch)
    .get('*', info)
  app.use(router.routes())
  app.ws.use(
    route.all('/test/:id', function(ctx) {
      // `ctx` is the regular koa context created from the `ws` onConnection `socket.upgradeReq` object.
      // the websocket is added to the context on `ctx.websocket`.
      ctx.websocket.send('Hello World')
      ctx.websocket.on('message', wsFn.bind(ctx.websocket))
    })
  )
  return app
}

export function genSocket(
  sFn = m => console.log(m.toString()),
  cachedObj = {}
) {
  var socketClients = []
  cachedObj.clients = socketClients
  var server = net.createServer(function(socket) {
    socket.name = socket.remoteAddress + ':' + socket.remotePort
    socketClients.push(socket)
    console.info('client collected')
    socket.write('Echo server\r\n')
    // Handle incoming messages from clients.
    socket.on('data', sFn.bind(socket))

    // Remove the client from the list when it leaves
    socket.on('end', function() {
      socketClients.splice(socketClients.indexOf(socket), 1)
      console.info('1 client closed')
    })
  })
  return server
}

async function info_default(ctx) {
  const fpath = path.join(__dirname, '..', 'static', 'index.html')
  ctx.type = extname(fpath)
  ctx.body = fs.createReadStream(fpath)
}
async function screenshot_default(ctx) {
  ctx.response.body = 'screenshot'
}
async function touch_default(ctx) {
  ctx.response.body = 'touch'
}

/**
 * thunkify stat
 */

function stat(file) {
  return new Promise(function(resolve, reject) {
    fs.stat(file, function(err, stat) {
      if (err) {
        reject(err)
      } else {
        resolve(stat)
      }
    })
  })
}
