const Koa = require('koa')
const KoaRouter = require('koa-router')
const logger = require('koa-logger')

var router = KoaRouter()
const app = (module.exports = new Koa())

app.use(logger())

router
  .get('/', info)
  .get('/screenshot', screenshot)
  .get('/act/touch/:x/:y', touch)

app.use(router.routes())

async function info(ctx) {
  ctx.response.body = 'info'
}
async function screenshot(ctx) {
  ctx.response.body = 'screenshot'
}
async function touch(ctx) {
  ctx.response.body = 'touch'
}
