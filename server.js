const express = require('express');
const cors = require('cors');
const http = require('http');
require("dotenv").config()
const app = express();
const cookieParser = require("cookie-parser");
console.log("NODE_ENV:", process.env.NODE_ENV);

app.use(cookieParser());
// app.use(cors({
//   origin:process.env.NODE_ENV === 'development'?"http://localhost:8080":"https://lumaaccess.vercel.app",
//   credentials: true, 
// }));
app.use(cors({
  // origin:"https://lumaaccess.vercel.app",
  origin:"http://localhost:8080",
  credentials: true, 
}))
app.use(express.json());

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
