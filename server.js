const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const Authrouter = require('./Router/Authrouter');
const Devicerouter = require('./Router/Devicerouter');
app.use('/api/auth', Authrouter);
app.use('/api/device', Devicerouter);

const PORT = process.env.PORT || 8081;

const { connectedDevices } = require('./socket/socket');
const { sendCommandToDevice } = require('./controller/Devicecontroller');

app.get('/devices', (req, res) => {
  const list = [];
  for (const [deviceId, info] of connectedDevices.entries()) {
    list.push({
      id: deviceId,
      userId: info.userId,
      os: info.os,
      hostname: info.hostname,
      name: info.name,
      status: info.status,
      lastSeen: info.lastSeen,
    });
  }
  res.json(list);
});

app.post('/send-command', (req, res) => {
  const { deviceId, commandType } = req.body;
  if (!deviceId || !commandType) {
    return res.status(400).json({ error: 'Missing deviceId or commandType' });
  }

  sendCommandToDevice(deviceId, commandType);
  res.json({ status: 'Command sent if device is connected' });
});

const server = http.createServer(app);
require('./socket/socket').setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`✅ HTTP server running at http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running at ws://localhost:${PORT}`);
});
