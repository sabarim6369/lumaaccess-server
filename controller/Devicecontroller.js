const prisma = require('../lib/Prisma');

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
  const { deviceId, userId } = req.body;

  if (!deviceId || !userId) {
    return res.status(400).json({ error: "deviceId and userId are required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        Deviceconnectedtome: {
          push: deviceId,
        },
      },
    });

    return res.status(200).json({
      message: "Device added to user's ownership list.",
      user,
    });
  } catch (error) {
    console.error("Error adding ownership:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = { segregatedevicedependonaccess,addownership };
