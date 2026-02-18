const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* Route for user registration - validates unique email, police ID, and contact before saving new user */
router.post('/register', async (req, res) => {
  const { fullname, police_id, contact, email, city, password } = req.body;
  try {
    let userByEmail = await User.findOne({ email });
    if (userByEmail) { return res.status(400).json({ msg: 'User with this email already exists' }); }
    let userByPoliceId = await User.findOne({ police_id });
    if (userByPoliceId) { return res.status(400).json({ msg: 'This Police ID is already registered' }); }
    let userByContact = await User.findOne({ contact });
    if (userByContact) { return res.status(400).json({ msg: 'This contact number is already registered' }); }
    const user = new User({ fullname, police_id, contact, email, city, password });
    await user.save();
    res.status(201).json({ msg: 'Registration successful. Awaiting admin approval.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/* Authentication route - validates credentials, checks approval status and issues JWT token */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user || password !== user.password) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    if (!user.isApproved) {
        return res.status(403).json({ msg: 'Your account has not been approved by an admin yet.' });
    }

    const payload = {
      user: {
        id: user.id,
        fullname: user.fullname,
        isAdmin: user.isAdmin,
        email: user.email /* Including email in token payload for user identification */
      }
    };

    jwt.sign(payload, 'yourSecretKey', { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
