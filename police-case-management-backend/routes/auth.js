const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$/;

const isBcryptHash = (value) =>
  typeof value === 'string' && BCRYPT_HASH_REGEX.test(value);

/* Route for user registration - validates unique email, police ID, and contact before saving */
router.post('/register', async (req, res) => {
  const { fullname, police_id, contact, email, city, password } = req.body;
  try {
    let userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ msg: 'User with this email already exists' });
    }
    let userByPoliceId = await User.findOne({ police_id });
    if (userByPoliceId) {
      return res.status(400).json({ msg: 'This Police ID is already registered' });
    }
    let userByContact = await User.findOne({ contact });
    if (userByContact) {
      return res.status(400).json({ msg: 'This contact number is already registered' });
    }

    const hashedPassword = await bcrypt.hash(String(password ?? ''), BCRYPT_SALT_ROUNDS);
    const user = new User({
      fullname,
      police_id,
      contact,
      email,
      city,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).json({ msg: 'Registration successful. Awaiting admin approval.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/* Authentication endpoint - validates credentials, checks approval status, and issues JWT */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    let passwordMatched = false;
    if (isBcryptHash(user.password)) {
      passwordMatched = await bcrypt.compare(String(password ?? ''), user.password);
    } else if (String(password ?? '') === String(user.password ?? '')) {
      // Backward compatibility: migrate legacy plaintext password on successful login.
      passwordMatched = true;
      user.password = await bcrypt.hash(String(password ?? ''), BCRYPT_SALT_ROUNDS);
      await user.save();
    }

    if (!passwordMatched) {
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
        email: user.email /* Include email in token payload for user identification */,
      },
    };

    jwt.sign(payload, 'yourSecretKey', (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
