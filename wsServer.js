const WebSocket = require('ws')

const connectedDevices = new Map()

const wss = new WebSocket.Server({ port: 8082 })

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)

      if (data.type === 'register') {
        connectedDevices.set(data.deviceId, {
          ws,
          userId: data.userId,
          os: data.os,
          hostname: data.hostname,
              name: data.name,
    status: data.status,
    lastSeen: data.lastSeen,

        })
      }

    } catch (err) {
      console.error('Error parsing message:', err)
    }
  })

  ws.on('close', () => {
    for (const [deviceId, info] of connectedDevices.entries()) {
      if (info.ws === ws) {
        connectedDevices.delete(deviceId)
        break
      }
    }
  })
})
function sendCommandToDevice(deviceId, commandType) {
  const deviceInfo = connectedDevices.get(deviceId)
  if (!deviceInfo) {
    console.log(`Device ${deviceId} not found or not connected.`)
    return
  }

  const ws = deviceInfo.ws
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: commandType }))
    console.log(`Sent command "${commandType}" to device ${deviceId}`)
  } else {
    console.log(`WebSocket not open for device ${deviceId}`)
  }
}

console.log('WebSocket server running on ws://localhost:8082')

module.exports = { connectedDevices,sendCommandToDevice }
