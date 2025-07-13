const express = require("express");
const Devicerouter = express.Router();
const {segregatedevicedependonaccess,addownership,getConnectedDevices,handleSendCommand,sendRequest,acceptRequest,rejectRequest,allowedDevices,removeAccess}=require("../controller/Devicecontroller")
Devicerouter.post("/segregate-device-access", segregatedevicedependonaccess);
Devicerouter.post("/add-ownership", addownership);
Devicerouter.get('/devices', getConnectedDevices);
Devicerouter.post('/send-command', handleSendCommand);
Devicerouter.post('/send-request', sendRequest);
Devicerouter.post("/accept-request",acceptRequest)
Devicerouter.post("/reject-request",rejectRequest)
Devicerouter.get("/alloweddevices",allowedDevices)
Devicerouter.post("/remove-access",removeAccess)
module.exports = Devicerouter;
