const express = require('express');
const jwt = require('jsonwebtoken');
const router=express.Router()
router.get("/me",(req,res)=>{
 const token = req.cookies.token;
console.log(token)
  if (!token) {
    console.log("dd")
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ userId: decoded.userId, email: decoded.email });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
})
 router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  });

  res.json({ message: 'Logged out successfully' });
});
 


module.exports = router;
