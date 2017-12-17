import * as util from 'util'
import * as path from 'path'
import * as adb from 'adbkit'
import split from 'split'
const client = adb.createClient()

let tracedDevices = null
const status = {
  tryingStart: false,
  tryingStartTouch: false
}

export async function listDevices() {
  // console.log('[adbkit] listDevices')
  var devices = await client.listDevices()
  if (devices.length) {
    await Promise.all(
      devices.map(async device => {
        let properities = await client.getProperties(device.id)
        device.abi = getAbi(properities)
        device.sdk = +properities['ro.build.version.sdk']
        device.name = properities['ro.product.name']
      })
    )
    return devices
  }
}
export async function checkRunning() {
  let err, result
  let device = (tracedDevices || (await listDevices()))[0]
  if (!device) return { err: new Error('no device'), result }
  result = await listPidsByComm(
    client,
    device.id,
    '',
    '/data/local/tmp/minicap'
  )
  return { err, result }
}

export async function listPidsByComm(adb, serial, comm, bin) {
  var users = { shell: true }
  let shellstdout = await adb.shell(serial, ['ps'])
  var pids = await new Promise((resolve, reject) => {
    var header = true
    var pids = []
    shellstdout
      .pipe(split())
      .on('data', chunk => {
        if (header) return (header = false), ''
        var cols = chunk.toString().split(/\s+/)
        if (cols.pop() === bin && users[cols[0]]) {
          pids.push(Number(cols[1]))
        }
        // console.info(cols[1])
      })
      .on('end', () => {
        resolve(pids)
      })
      .on('error', () => {
        reject('stream err')
      })
  })
  console.info({ pids })
  return pids
}

export async function startMinicap({ orientation } = { orientation: '0' }) {
  orientation = orientation || '0'
  if (['0', '90', '180', '270'].indexOf(orientation) === -1) orientation = '0'
  let device = (tracedDevices || (await listDevices()))[0]
  if (!device) return
  console.info('orientation in [startMiniCap]', orientation)
  await killProcsByComm(client, device.id, '', '/data/local/tmp/minicap', '')
  let command = util.format(
    'LD_LIBRARY_PATH=%s exec %s %s',
    path.dirname('/data/local/tmp/minicap.so'),
    '/data/local/tmp/minicap',
    `-P 540x960@360x640/${orientation} -S -Q 50`
  )
  let stdout = await client.shell(device.id, command)
  return new Promise((resolve, reject) => {
    let datachunk = ''
    stdout.on('error', error => {
      reject({ error, command: command })
    })
    setTimeout(() => {
      resolve({ message: 'there is no error in 100ms', code: 0 })
      status.tryingStart = false
    }, 100)
  })
  return result
}

async function waitForProcsToDie(adb, serial, comm, bin) {
  let pids = await listPidsByComm(adb, serial, comm, bin)
  if (pids && pids.length) {
    await new Promise(r => setTimeout(r, 100))
    return waitForProcsToDie(adb, serial, comm, bin)
  }
}

export async function killProcsByComm(adb, serial, comm, bin, mode) {
  // console.info('start a kill monitor')
  try {
    var pids = await listPidsByComm(adb, serial, comm, bin)
    if (!pids.length) return 'already killed'

    var stdout = await adb.shell(serial, ['kill', mode || -15].concat(pids))
    await new Promise((resolve, reject) =>
      stdout.on('end', resolve).on('error', reject)
    )
    var killResult = waitForProcsToDie(adb, serial, comm, bin)
    console.info('【杀进程结果】', killResult)
    return killResult
  } catch (e) {
    console.info('error  catched : ', e)
    console.info('还没结束，手动继续 Kill吧')
    // return killProcsByComm(adb, serial, comm, bin, -9)
  }
}
function getAbi(properties) {
  var split = list => (list ? list.split(',') : [])
  var abi = {
    primary: properties['ro.product.cpu.abi'],
    pie: +properties['ro.build.version.sdk'] >= 16,
    all: [],
    b32: [],
    b64: []
  }
  // Since Android 5.0
  if (properties['ro.product.cpu.abilist']) {
    abi.all = split(properties['ro.product.cpu.abilist'])
    abi.b64 = split(properties['ro.product.cpu.abilist64'])
    abi.b32 = split(properties['ro.product.cpu.abilist32'])
  } else {
    // Up to Android 4.4
    abi.all.push(abi.primary)
    abi.b32.push(abi.primary)
    if (properties['ro.product.cpu.abi2']) {
      abi.all.push(properties['ro.product.cpu.abi2'])
      abi.b32.push(properties['ro.product.cpu.abi2'])
    }
  }
  // console.log('Supports ABIs %s', abi.all.join(', '))
  return abi
}
