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
    // Step 1: Fetch the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { Deviceconnectedtome: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Step 2: Check if deviceId already exists
    const alreadyExists = user.Deviceconnectedtome.includes(deviceId);

    // Step 3: Update only if not already there
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

    // Step 4: Upsert device info
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

module.exports = { segregatedevicedependonaccess,addownership,sendCommandToDevice };
