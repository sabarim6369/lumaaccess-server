const express = require("express");
const Devicerouter = express.Router();
const {segregatedevicedependonaccess,addownership}=require("../controller/Devicecontroller")
Devicerouter.post("/segregate-device-access", segregatedevicedependonaccess);
Devicerouter.post("/add-ownership", addownership);
module.exports = Devicerouter;
