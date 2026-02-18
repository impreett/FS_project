const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users/officers - return approved officers' fullnames
router.get('/officers', async (req, res) => {
    try {
        // Find approved users and return only fullname sorted A-Z
        const officers = await User.find({ isApproved: true }, 'fullname').sort({ fullname: 'asc' });
        res.json(officers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;