const prisma = require('../lib/Prisma');
const { ObjectId } = require('mongodb');
const {connectedDevices}=require("../socket/socket")
const segregatedevicedependonaccess = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      requestedDevices: user.Requesteddevice || [],
      allowedDevices: user.Alloweddevice || [],
      connectedToMeDevices: user.Deviceconnectedtome || [],
    });
  } catch (error) {
    console.error("Error segregating device access:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const addownership = async (req, res) => {
  const { deviceId, userId, deviceName, os, hostname } = req.body;

  console.log("Adding ownership for deviceId:", deviceId, "and userId:", userId);

  if (!deviceId || !userId || !deviceName || !os || !hostname) {
    return res.status(400).json({ error: "All device details and userId are required." });
  }

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId format." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { Deviceconnectedtome: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const alreadyExists = user.Deviceconnectedtome.includes(deviceId);

    let updatedUser = user;
    if (!alreadyExists) {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          Deviceconnectedtome: {
            push: deviceId,
          },
        },
      });
    }

    await prisma.device.upsert({
      where: { deviceId },
      update: {
        name: deviceName,
        os,
        hostname,
      },
      create: {
        deviceId,
        name: deviceName,
        os,
        hostname,
        ownerId: userId,
      },
    });

    return res.status(200).json({
      message: alreadyExists
        ? "Device already associated with user. Updated device info."
        : "Device added to user's ownership and saved.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error adding ownership:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

function sendCommandToDevice(deviceId, commandType) {
  const deviceInfo = connectedDevices.get(deviceId);
  if (!deviceInfo) {
    return console.log(`❌ Device ${deviceId} not found.`);
  }

  if (deviceInfo.ws.readyState === 1) {
    deviceInfo.ws.send(JSON.stringify({ type: commandType }));
    console.log(`🚀 Sent "${commandType}" to device ${deviceId}`);
  }
}
const handleSendCommand = (req, res) => {
  const { deviceId, commandType } = req.body;
  if (!deviceId || !commandType) {
    return res.status(400).json({ error: 'Missing deviceId or commandType' });
  }

  sendCommandToDevice(deviceId, commandType);
  res.json({ status: 'Command sent if device is connected' });
};
const getConnectedDevices = async (req, res) => {
  const userId = req.query.userid;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        Requesteddevice: true,
        Alloweddevice: true,
        Deviceconnectedtome: true,
        Incomingrequests: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { Requesteddevice, Alloweddevice, Deviceconnectedtome,Incomingrequests } = user;

    const connected = [];
    const requested_by_me = [];
    const shared_by_me = [];
    const others = [];
        const allDevices = [];
        const incomingrequest=[]
        


    for (const [deviceId, info] of connectedDevices.entries()) {
      let statusType = "other";

      if (Deviceconnectedtome.includes(deviceId)) {
        statusType = "allowed";
        connected.push({ ...info, id: deviceId, statusType });
      } else if (Requesteddevice.includes(deviceId)) {
        statusType = "requested_by_me";
        requested_by_me.push({ ...info, id: deviceId, statusType });
      } else if (Alloweddevice.includes(deviceId)) {
        statusType = "shared_by_me";
        shared_by_me.push({ ...info, id: deviceId, statusType });
      } 
      else if(Incomingrequests.includes(deviceId)){
        statusType = "incoming_request";
        incomingrequest.push({ ...info, id: deviceId, statusType });

      }
      else {
        others.push({ ...info, id: deviceId, statusType });
      }
            allDevices.push({ ...info, id: deviceId, statusType });
    }

    res.json({
      connected,
      requested_by_me,
      shared_by_me,
      others,
        allDevices,
      counts: {
        connected: connected.length,
        requested_by_me: requested_by_me.length,
        shared_by_me: shared_by_me.length,
        others: others.length,
      },
    });
  } catch (err) {
    console.error("Error in getConnectedDevices:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


const sendRequest = async (req, res) => {
  const { deviceId, fromUserId, toUserId } = req.body;
console.log("Sending request for deviceId:", deviceId, "fromUserId:", fromUserId, "toUserId:", toUserId);
  if (!deviceId || !fromUserId || !toUserId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    await prisma.user.update({
      where: { id: fromUserId },
      data: {
        Requesteddevice: {
          push: deviceId,
        },
      },
    });

    await prisma.user.update({
      where: { id: toUserId },
      data: {
        Incomingrequests: {
          push: fromUserId,
        },
      },
    });

    res.status(200).json({ message: "Request sent" });
  } catch (err) {
    console.error("Error sending request", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { segregatedevicedependonaccess,addownership,handleSendCommand, getConnectedDevices,sendRequest };
