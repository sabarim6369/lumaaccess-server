const express = require('express');
const cors = require('cors');
const http = require('http');
require("dotenv").config()
const app = express();
const cookieParser = require("cookie-parser");
console.log("NODE_ENV:", process.env.NODE_ENV);

app.use(cookieParser());
// Allow both localhost and production
const allowedOrigins = [
  "http://localhost:8080", 
  "http://localhost:5173", 
  "https://lumaaccess.vercel.app"
];
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, 
}));
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
