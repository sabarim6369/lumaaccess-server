const prisma = require('../lib/Prisma');
const { ObjectId } = require('mongodb');
const { connectedDevices } = require('../socket/socket');
const {images,camera} = require('../socket/socket');

const segregatedevicedependonaccess = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sentRequests: true,      
        receivedRequests: true,   
        allowedDevices: true,    
        connectedDevices: true,  
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({
      sentRequests: user.sentRequests || [],
      receivedRequests: user.receivedRequests || [],
      allowedDevices: user.allowedDevices || [],
      connectedDevices: user.connectedDevices || [],
    });
  } catch (error) {
    console.error('Error segregating device access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const addownership = async (req, res) => {
  const { deviceId, userId, deviceName, os, hostname } = req.body;
  if (!deviceId || !userId || !deviceName || !os || !hostname)
    return res.status(400).json({ error: 'All device details and userId are required.' });

  if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid userId format.' });

  try {
    await prisma.device.upsert({
      where: { deviceId },
      update: { name: deviceName, os, hostname, ownerId: userId },
      create: { deviceId, name: deviceName, os, hostname, ownerId: userId },
    });

   

    return res.status(200).json({ message: 'Device ownership added or updated.' });
  } catch (error) {
    console.error('Error adding ownership:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Send command to connected device
function sendCommandToDevice(deviceId, commandType) {
  const deviceInfo = connectedDevices.get(deviceId);
  if (!deviceInfo) return console.log(`❌ Device ${deviceId} not found.`);

  if (deviceInfo.ws.readyState === 1) {
    deviceInfo.ws.send(JSON.stringify({ type: commandType }));
    console.log(`🚀 Sent "${commandType}" to device ${deviceId}`);
  }
}

const handleSendCommand = (req, res) => {
  const { deviceId, commandType } = req.body;
  if (!deviceId || !commandType) return res.status(400).json({ error: 'Missing deviceId or commandType' });

  sendCommandToDevice(deviceId, commandType);
  res.json({ status: 'Command sent if device is connected' });
};



const getConnectedDevices = async (req, res) => {
  const userId = req.query.userid;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
console.log(images);
  try {
    const list = [];
    const incomingrequest = [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    for (const [deviceId, info] of connectedDevices.entries()) {
      const deviceowner = await prisma.device.findUnique({
        where: { deviceId },
      });

      if (!deviceowner) continue;

      const deviceownerid = deviceowner.ownerId;

      let statusType = "onlinedevice";
console.log(deviceownerid)
      // If it's the user's own device, automatically mark as allowed
      if (deviceownerid === userId) {
        statusType = "allowed";
      } else if (user.connectedDevices.includes(deviceownerid)) {
        statusType = "allowed";
      } else if (user.sentRequests.includes(deviceownerid)) {
        statusType = "requested";
      } else if (user.receivedRequests.includes(deviceownerid)) {
        statusType = "incomingrequest";
      }

      list.push({
        id: deviceId,
        userId: info.userId,
        os: info.os,
        hostname: info.hostname,
        name: info.name,
        status: info.status,
        lastSeen: info.lastSeen,
        statusType,
      });
    }

    for (const requesterId of user.receivedRequests) {
      // const isAlreadyHandled = list.some((d) => d.userId === requesterId);
      // if (isAlreadyHandled) continue;

      // Fetch requester basic info
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (requester) {
        incomingrequest.push({
          id: requester.id,
          status: "offline",
          statusType: "incomingrequest",
          name: requester.name,
          email: requester.email,
        });
      }
    }

    const connectedevice = list.filter((e) => e.statusType === "allowed");
    const requesteddevice = list.filter((e) => e.statusType === "requested");
    const liveincomingrequest = list.filter((e) => e.statusType === "incomingrequest");
    console.log(connectedevice)
console.log("✅✅✅",incomingrequest)
console.log("consoling the images",images)
    res.json({
      list,
      connectedevice,
      requesteddevice,
      incomingrequest: [...liveincomingrequest, ...incomingrequest],
       images: Object.fromEntries(images),
    });
  } catch (error) {
    console.error("❌ Error in getConnectedDevices:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getimages=async(req,res)=>{
console.log(images);
 res.json({
       images: Object.fromEntries(images),
    });
}
const getlivevideo=async(req,res)=>{
console.log(camera);
 res.json({
       camera: Object.fromEntries(camera),
    });
}


const sendRequest = async (req, res) => {
  console.log("🤣🤣🤣🤣🤣",req.body)
  const { fromUserId, toUserId } = req.body;

  if (!fromUserId || !toUserId) return res.status(400).json({ error: 'Missing fromUserId or toUserId' });
  // if (fromUserId === toUserId) return res.status(400).json({ error: 'Cannot send request to yourself' });

  try {
    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId }, select: { sentRequests: true } });
    const toUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { receivedRequests: true } });
console.log(fromUser,toUser)
    if (!fromUser || !toUser){
      console.log("insie")
      return res.status(404).json({ error: 'User(s) not found' });
    }

    const fromUserSent = fromUser.sentRequests || [];
    const toUserReceived = toUser.receivedRequests || [];

    if (fromUserSent.includes(toUserId)) return res.status(409).json({ error: 'Request already sent' });

    await prisma.user.update({
      where: { id: fromUserId },
      data: { sentRequests: { push: toUserId } },
    });

    await prisma.user.update({
      where: { id: toUserId },
      data: { receivedRequests: { push: fromUserId } },
    });

    res.status(201).json({ message: 'Request sent successfully' });
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const acceptRequest = async (req, res) => {
  console.log(req.body);
  const { userId, requesterId } = req.body;

  if (!userId || !requesterId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
     
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove requester from user's receivedRequests
    await prisma.user.update({
      where: { id: userId },
      data: {
        receivedRequests: {
          set: user.receivedRequests.filter((id) => id !== requesterId),
        },
      },
    });

    // Get all device IDs owned by the user (device owner)
    const ownedDevices = await prisma.device.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const deviceIds = ownedDevices.map((d) => d.id);

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester) return res.status(404).json({ error: "Requester not found" });

    await prisma.user.update({
      where: { id: requesterId },
      data: {
        connectedDevices: {
          set: Array.from(new Set([...requester.connectedDevices, userId])),
        },
      },
    });
      await prisma.user.update({
      where: { id: userId },
      data: {
        allowedDevices: {
          set: Array.from(new Set([...user.allowedDevices, requesterId])),
        },
      },
    });
  await prisma.deviceAccess.create({
    data: {
      ownerId: userId,
      userId: requesterId,
    },
  });
    res.json({ message: "Request accepted" });
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const rejectRequest = async (req, res) => {
  const { userId, requesterId } = req.body;
  console.log(req.body);

  if (!userId || !requesterId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { receivedRequests: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove requesterId from user's receivedRequests
    await prisma.user.update({
      where: { id: userId },
      data: {
        receivedRequests: {
          set: user.receivedRequests.filter(id => id !== requesterId),
        },
      },
    });

    // Fetch requester to get sentRequests
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { sentRequests: true }
    });

    if (!requester) return res.status(404).json({ error: "Requester not found" });

    // Remove userId from requester's sentRequests
    await prisma.user.update({
      where: { id: requesterId },
      data: {
        sentRequests: {
          set: requester.sentRequests.filter(id => id !== userId),
        },
      },
    });

    res.json({ message: "Request rejected" });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const allowedDevices = async (req, res) => {
  const userId = req.query.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        allowedDevices: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const allowedUsers = await prisma.user.findMany({
      where: {
        id: {
          in: user.allowedDevices,
        },
      },
    });

    res.json(allowedUsers);
  } catch (error) {
    console.error("Error fetching allowed devices:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const removeAccess = async (req, res) => {
  const { userId, targetUserId } = req.body;

  if (!userId || !targetUserId) {
    return res.status(400).json({ error: "Missing userId or targetUserId" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { allowedDevices: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id: userId },
      data: {
        allowedDevices: {
          set: user.allowedDevices.filter(id => id !== targetUserId),
        },
      },
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { connectedDevices: true,sentRequests:true },
    });

    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        connectedDevices: {
          set: targetUser.connectedDevices.filter(id => id !== userId),
        },
         sentRequests: {
      set: targetUser.sentRequests.filter(id => id !== userId),
    },
      },
    });

    res.json({ message: "Access successfully removed" });

  } catch (error) {
    console.error("Error removing access:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

 const updatePermissionAccess = async (req, res) => {
  const { ownerId, targetUserId, permissions } = req.body;

  if (!ownerId || !targetUserId || !permissions) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const existing = await prisma.deviceAccess.findFirst({
      where: {
        ownerId,
        userId: targetUserId,
      },
    });

    if (existing) {
  await prisma.deviceAccess.update({
  where: { id: existing.id },
  data: {
    ...permissions, // only the ones being updated (e.g., { screen: true })
  },
});

      return res.status(200).json({ message: "Permissions updated" });
    } else {
      await prisma.deviceAccess.create({
        data: {
          ownerId,
          userId: targetUserId,
          ...permissions,
        },
      });
      return res.status(201).json({ message: "Permissions created" });
    }
  } catch (error) {
    console.error("Error updating permissions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const allowpermittedstuffs = async (req, res) => {
  const { ownerId, targetId } = req.body;

  if (!ownerId || !targetId) {
    return res.status(400).json({ error: "Missing ownerId or targetId" });
  }

  try {
    const detail = await prisma.deviceAccess.findFirst({
      where: {
        ownerId: ownerId,
        userId: targetId,
      },
    });
console.log(detail)
    if (!detail) {
      return res.status(404).json({ error: "Permission record not found" });
    }

    res.status(200).json(detail);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  segregatedevicedependonaccess,
  addownership,
  handleSendCommand,
  getConnectedDevices,
  sendRequest,
  rejectRequest,
  acceptRequest,
  allowedDevices,
  removeAccess,
  updatePermissionAccess,
  allowpermittedstuffs,
  getimages,
  getlivevideo,
};

