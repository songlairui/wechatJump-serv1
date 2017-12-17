import * as util from 'util'
import * as path from 'path'
import * as adb from 'adbkit'
import split from 'split'
const client = adb.createClient()

export async function listDevices() {
  console.log('[adbkit] listDevices')
  return await client.listDevices().then(async devices => {
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
    } else {
      return null
    }
  })
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

  console.log('Supports ABIs %s', abi.all.join(', '))

  return abi
}
