const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors({
  origin: 'https://lumaaccess.vercel.app',
  credentials: true, 
}));app.use(express.json());

const Authrouter = require('./Router/Authrouter');
const Devicerouter = require('./Router/Devicerouter');
app.use('/api/auth', Authrouter);
app.use('/api/device', Devicerouter);

const PORT = process.env.PORT || 8081;


const server = http.createServer(app);
require('./socket/socket').setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`✅ HTTP server running at http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running at ws://localhost:${PORT}`);
});
