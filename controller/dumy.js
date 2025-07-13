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
// const getConnectedDevices = async (req, res) => {
//   const userId = req.query.userid;

//   if (!userId) {
//     return res.status(400).json({ error: "Missing userId" });
//   }

//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         Requesteddevice: true,
//         Alloweddevice: true,
//         Deviceconnectedtome: true,
//         Incomingrequests: true,
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const {
//       Requesteddevice,
//       Alloweddevice,
//       Deviceconnectedtome,
//       Incomingrequests,
//     } = user;

//     const connected = [];
//     const requested_by_me = [];
//     const shared_by_me = [];
//     const others = [];
//     const allDevices = [];
//     const incomingrequest = [];

//     const seenDevices = new Set(); // to avoid duplicate in `incomingrequest` and others

//     for (const [deviceId, info] of connectedDevices.entries()) {
//       let statusType = "other";

//       if (Deviceconnectedtome.includes(deviceId)) {
//         statusType = "allowed";
//         connected.push({ ...info, id: deviceId, statusType });
//       } else if (Requesteddevice.includes(deviceId)) {
//         statusType = "requested_by_me";
//         requested_by_me.push({ ...info, id: deviceId, statusType });
//       } else if (Alloweddevice.includes(deviceId)) {
//         statusType = "shared_by_me";
//         shared_by_me.push({ ...info, id: deviceId, statusType });
//       } else if (Incomingrequests.includes(deviceId)) {
//         statusType = "incoming_request";
//         incomingrequest.push({ ...info, id: deviceId, statusType });
//       } else {
//         others.push({ ...info, id: deviceId, statusType });
//       }

//       seenDevices.add(deviceId);
//       allDevices.push({ ...info, id: deviceId, statusType });
//     }

//     for (const deviceId of Incomingrequests) {
//       if (!seenDevices.has(deviceId)) {
//         incomingrequest.push({
//           id: deviceId,
//           statusType: "incoming_request",
//           name: "Offline Device",
//           status: "offline",
//           hostname: "Unknown",
//           os: "Unknown",
//         });
//       }
//     }

//     res.json({
//       connected,
//       requested_by_me,
//       shared_by_me,
//       incomingrequest,
//       others,
//       allDevices,
//       counts: {
//         connected: connected.length,
//         requested_by_me: requested_by_me.length,
//         shared_by_me: shared_by_me.length,
//         incomingrequest: incomingrequest.length,
//         others: others.length,
//       },
//     });
//   } catch (err) {
//     console.error("Error in getConnectedDevices:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


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
        receivedRequests: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

   const {
  Requesteddevice = [],
  Alloweddevice = [],
  Deviceconnectedtome = [],
  receivedRequests = [],
} = user;

    const connected = [];
    const requested_by_me = [];
    const shared_by_me = [];
    const others = [];
    const allDevices = [];
    const incomingrequest = [];

    const seenDevices = new Set();

    const incomingRequestDeviceIds = (receivedRequests || []).map((r) => r.deviceId);
    const fromUserIds = (receivedRequests || []).map((r) => r.fromUserId);

    const fromUsers = await prisma.user.findMany({
      where: {
        id: { in: fromUserIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const userMap = new Map(fromUsers.map((u) => [u.id, u]));

    // Loop through all connected devices
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
      } else if (incomingRequestDeviceIds.includes(deviceId)) {
        statusType = "incoming_request";
        const req = receivedRequests.find((r) => r.deviceId === deviceId);
        const sender = userMap.get(req?.fromUserId);
        incomingrequest.push({
          ...info,
          id: deviceId,
          statusType,
          requestInfo: req,
          senderInfo: sender || null,
        });
      } else {
        others.push({ ...info, id: deviceId, statusType });
      }

      seenDevices.add(deviceId);
      allDevices.push({ ...info, id: deviceId, statusType });
    }

    // Handle offline incoming requests
    for (const req of receivedRequests || []) {
      const deviceId = req.deviceId;

      if (!seenDevices.has(deviceId)) {
        const sender = userMap.get(req.fromUserId);
        incomingrequest.push({
          id: deviceId,
          statusType: "incoming_request",
          name: req.deviceName || "Offline Device",
          status: "offline",
          hostname: "Unknown",
          os: "Unknown",
          requestInfo: req,
          senderInfo: sender || null,
        });
      }
    }

    res.json({
      connected,
      requested_by_me,
      shared_by_me,
      incomingrequest,
      others,
      allDevices,
      counts: {
        connected: connected.length,
        requested_by_me: requested_by_me.length,
        shared_by_me: shared_by_me.length,
        incomingrequest: incomingrequest.length,
        others: others.length,
      },
    });
  } catch (err) {
    console.error("Error in getConnectedDevices:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


const sendRequest = async (req, res) => {
  const { deviceId, fromUserId, toUserId, deviceName } = req.body;

  if (!deviceId || !fromUserId || !toUserId || !deviceName) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const toUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { receivedRequests: true },
    });

    const currentRequests = toUser?.receivedRequests || [];

    const exists = currentRequests.some(
      (r) => r.deviceId === deviceId && r.fromUserId === fromUserId
    );

    if (exists) {
      return res.status(409).json({ error: "Request already exists" });
    }
 
    const updatedRequests = [
      ...currentRequests,
      { fromUserId, deviceId, deviceName, timestamp: new Date().toISOString() },
    ];

    await prisma.user.update({
      where: { id: toUserId },
      data: { receivedRequests: updatedRequests },
    });

    res.status(201).json({ message: "Request sent" });
  } catch (error) {
    console.error("❌ Error sending request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



module.exports = { segregatedevicedependonaccess,addownership,handleSendCommand, getConnectedDevices,sendRequest };