const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const adminAuth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Require a valid token (non-admin)
const userAuth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        jwt.verify(token, 'yourSecretKey');
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Submit a public report (no auth)
router.post('/public', async (req, res) => {
    try {
        const { email, reportText } = req.body;
        if (!email || !reportText) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }
        const newReport = new Report({ email, reportText });
        await newReport.save();
        res.status(201).json({ msg: 'Report submitted successfully.' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Submit a report (logged-in users)
router.post('/', userAuth, async (req, res) => {
    try {
        // Read email from request body (not token)
        const { email, reportText } = req.body;
        if (!email || !reportText || reportText.length < 50) {
            return res.status(400).json({ msg: 'Please fill out all fields correctly.' });
        }
        const newReport = new Report({ email, reportText });
        await newReport.save();
        res.status(201).json({ msg: 'Report submitted successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin: list all reports
router.get('/', adminAuth, async (req, res) => {
    try {
        const reports = await Report.find().sort({ date: -1 });
        res.json(reports);
    } catch (err) { res.status(500).send('Server Error'); }
});

// Admin: delete report by id
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        await Report.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Report marked as read.' });
    } catch (err) { res.status(500).send('Server Error'); }
});

module.exports = router;
