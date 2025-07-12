const WebSocket = require('ws');

const connectedDevices = new Map();

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'register') {
          connectedDevices.set(data.deviceId, {
            ws,
            userId: data.userId,
            os: data.os,
            hostname: data.hostname,
            name: data.name,
            status: data.status,
            lastSeen: data.lastSeen,
          });
          console.log(`✅ Registered device: ${data.deviceId}`);
        }
      } catch (err) {
        console.error('❌ Error parsing message:', err.message);
      }
    });

    ws.on('close', () => {
      for (const [deviceId, info] of connectedDevices.entries()) {
        if (info.ws === ws) {
          connectedDevices.delete(deviceId);
          console.log(`❌ Disconnected device: ${deviceId}`);
          break;
        }
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('✅ WebSocket server initialized');
}

module.exports = {
  setupWebSocketServer,
  connectedDevices,
};
