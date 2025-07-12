const express = require("express");
const Devicerouter = express.Router();
const {segregatedevicedependonaccess,addownership,getConnectedDevices,handleSendCommand,sendRequest}=require("../controller/Devicecontroller")
Devicerouter.post("/segregate-device-access", segregatedevicedependonaccess);
Devicerouter.post("/add-ownership", addownership);
Devicerouter.get('/devices', getConnectedDevices);
Devicerouter.post('/send-command', handleSendCommand);
Devicerouter.post('/send-request', sendRequest);
module.exports = Devicerouter;
