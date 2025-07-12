
const express = require('express')
const cors = require('cors')
const http = require('http')
const WebSocket = require('ws')

const app = express()
app.use(cors())
app.use(express.json())
const Authrouter = require("./Router/Authrouter");
const Devicerouter = require("./Router/Devicerouter");
app.use("/api/auth", Authrouter);
app.use("/api/device", Devicerouter);

const PORT = process.env.PORT || 8081
const connectedDevices = new Map()
app.use("/api/auth", Authrouter);

app.get('/devices', (req, res) => {
  const list = []
  for (const [deviceId, info] of connectedDevices.entries()) {
    list.push({
      id: deviceId,
      userId: info.userId,
      os: info.os,
      hostname: info.hostname,
      name: info.name,
      status: info.status,
      lastSeen: info.lastSeen,
    })
  }
  console.log("Connected devices:", list)
  res.json(list)
})

app.post('/send-command', (req, res) => {
  const { deviceId, commandType } = req.body
  if (!deviceId || !commandType) {
    return res.status(400).json({ error: 'Missing deviceId or commandType' })
  }

  sendCommandToDevice(deviceId, commandType)
  res.json({ status: 'Command sent if device is connected' })
})

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })
function heartbeat() {
  this.isAlive = true;
}
wss.on('connection', (ws) => {
    ws.isAlive = true;
  ws.on('pong', heartbeat);
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
        console.log(`✅ Registered device: ${data.deviceId}`)
      }
    } catch (err) {
      console.error('❌ Error parsing message:', err.message)
    }
  })

  ws.on('close', () => {
    for (const [deviceId, info] of connectedDevices.entries()) {
      if (info.ws === ws) {
        connectedDevices.delete(deviceId)
        console.log(`❌ Disconnected device: ${deviceId}`)
        break
      }
    }
  })
})

function sendCommandToDevice(deviceId, commandType) {
  
  const deviceInfo = connectedDevices.get(deviceId)
  if (!deviceInfo) {
    return console.log(`Device ${deviceId} not found.`)
  }
  if (deviceInfo.ws.readyState === WebSocket.OPEN) {
    deviceInfo.ws.send(JSON.stringify({ type: commandType }))
    console.log(`🚀 Sent "${commandType}" to device ${deviceId}`)
  }
}
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);


wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`)
})

module.exports = { connectedDevices, sendCommandToDevice }
