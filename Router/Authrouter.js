const express = require("express");
const Authrouter = express.Router();
const { signup, login } = require("../controller/Authcontroller");

Authrouter.post("/signup", signup);
Authrouter.post("/login", login);

module.exports = Authrouter;
