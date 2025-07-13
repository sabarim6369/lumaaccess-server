const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(cors({
  origin: ['https://lumaaccess.vercel.app',"http://localhost:8080"],
  credentials: true, 
}));app.use(express.json());

const Authrouter = require('./Router/Authrouter');
const Devicerouter = require('./Router/Devicerouter');
const auth=require("./Auth/Auth")
app.use('/api/auth', Authrouter);
app.use('/api/device', Devicerouter);
app.use("/api/auth",auth)


const PORT = process.env.PORT || 8081;


const server = http.createServer(app);
require('./socket/socket').setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`✅ HTTP server running at http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running at ws://localhost:${PORT}`);
});
