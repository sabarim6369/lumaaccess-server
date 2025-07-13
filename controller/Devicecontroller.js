const prisma = require('../lib/Prisma');
const { ObjectId } = require('mongodb');
const { connectedDevices } = require('../socket/socket');

const segregatedevicedependonaccess = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sentRequests: true,       // userIds this user requested access to
        receivedRequests: true,   // userIds who requested access to this user
        allowedDevices: true,     // deviceIds user shared with others
        connectedDevices: true,   // deviceIds user can access
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

  try {
    const list = []
    const user=await prisma.user.findUnique({
      where:{id:userId}
    })
    console.log(user)
  for (const [deviceId, info] of connectedDevices.entries()) {
    let statusType="onlinedevice"
    if(user.connectedDevices.includes(deviceId)){
      statusType="allowed"
    }
    else if(user.sentRequests.includes(deviceId)){
      statusType="requested"
    }
   

    list.push({
      id: deviceId,
      userId: info.userId,
      os: info.os,
      hostname: info.hostname,
      name: info.name,
      status: info.status,
      lastSeen: info.lastSeen,
      statusType
    })
  }
  console.log("Connected devices:", list)
  res.json(list)
  } catch (error) {
    console.error("❌ Error in getConnectedDevices:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendRequest = async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  if (!fromUserId || !toUserId) return res.status(400).json({ error: 'Missing fromUserId or toUserId' });
  if (fromUserId === toUserId) return res.status(400).json({ error: 'Cannot send request to yourself' });

  try {
    // Fetch users to update sentRequests and receivedRequests
    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId }, select: { sentRequests: true } });
    const toUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { receivedRequests: true } });

    if (!fromUser || !toUser) return res.status(404).json({ error: 'User(s) not found' });

    const fromUserSent = fromUser.sentRequests || [];
    const toUserReceived = toUser.receivedRequests || [];

    if (fromUserSent.includes(toUserId)) return res.status(409).json({ error: 'Request already sent' });

    // Update fromUser sentRequests
    await prisma.user.update({
      where: { id: fromUserId },
      data: { sentRequests: { push: toUserId } },
    });

    // Update toUser receivedRequests
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

module.exports = {
  segregatedevicedependonaccess,
  addownership,
  handleSendCommand,
  getConnectedDevices,
  sendRequest,
};
