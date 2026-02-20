const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const UpdateCase = require('../models/UpdateCase');
const jwt = require('jsonwebtoken');
const adminAuth = require('../middleware/auth');
const {
    normalizeCasePeoplePayload,
    serializeCaseForClient,
    serializeCasesForClient,
    buildPeopleSearchOr,
    buildPeopleForAllSearchOr,
} = require('../utils/people');
const { validateCaseDateNotFuture } = require('../utils/caseDate');

// Verify any logged-in user (non-admin)
const userAuth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        req.user = jwt.verify(token, 'yourSecretKey').user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// List approved cases (exclude removed) with optional search
router.get('/', async (req, res) => {
    const { field, query } = req.query;
    let searchFilter = { isApproved: true, is_removed: { $ne: true } };
    if (query && field) {
        if (field === "for-all") {
            searchFilter.$or = [
                { case_title: { $regex: query, $options: 'i' } }, { case_type: { $regex: query, $options: 'i' } },
                { case_description: { $regex: query, $options: 'i' } },
                { case_handler: { $regex: query, $options: 'i' } },
                ...buildPeopleForAllSearchOr(query),
            ];
        } else if (field === "status") {
            searchFilter.status = query.toUpperCase();
        } else if (field === "case_date") {
            // Match exact day (ignore time)
            const searchDate = new Date(query);
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);
            searchFilter.case_date = {
                $gte: searchDate,
                $lt: nextDay
            };
        } else if (['suspects', 'victim', 'guilty_name'].includes(field)) {
            searchFilter.$or = buildPeopleSearchOr(field, query);
        } else {
            searchFilter[field] = { $regex: query, $options: 'i' };
        }
    }
    try {
        const cases = await Case.find(searchFilter).sort({ case_date: -1 });
        res.json(serializeCasesForClient(cases));
    } catch (err) { res.status(500).send('Server Error'); }
});

// List approved cases assigned to current user (exclude removed)
router.get('/me/assigned', userAuth, async (req, res) => {
    try {
        const handler = req.user.fullname;
        const cases = await Case.find({ case_handler: handler, isApproved: true, is_removed: { $ne: true } }).sort({ case_date: -1 });
        res.json(serializeCasesForClient(cases));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get a single case by id (details)
router.get('/:id', userAuth, async (req, res) => {
    try {
        const caseItem = await Case.findOne({ _id: req.params.id, is_removed: { $ne: true } });
        if (!caseItem) return res.status(404).json({ msg: 'Case not found' });
        res.json(serializeCaseForClient(caseItem));
    } catch (err) { res.status(500).send('Server Error'); }
});

// Create a new case (clients; admins auto-approve)
router.post('/', userAuth, async (req, res) => {
    try {
        const normalizedBody = normalizeCasePeoplePayload(req.body);
        const caseDateError = validateCaseDateNotFuture(normalizedBody.case_date);
        if (caseDateError) {
            return res.status(400).json({ msg: caseDateError });
        }
        const newCase = new Case({ ...normalizedBody, isApproved: req.user.isAdmin }); // Admins auto-approve
        await newCase.save();
        res.status(201).json(serializeCaseForClient(newCase));
    } catch (err) { 
        console.error('Error creating case:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});

// Submit an update request (clients)
router.post('/request-update', userAuth, async (req, res) => {
    try {
        const normalizedBody = normalizeCasePeoplePayload(req.body);
        const caseDateError = validateCaseDateNotFuture(normalizedBody.case_date);
        if (caseDateError) {
            return res.status(400).json({ msg: caseDateError });
        }
        const updateRequest = new UpdateCase(normalizedBody);
        await updateRequest.save();
        res.status(201).json({ msg: 'Update request submitted successfully. It will be reviewed by an admin.' });
    } catch (err) { 
        console.error('Error submitting update request:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});

// Update a case by id (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const normalizedBody = normalizeCasePeoplePayload(req.body);
        const caseDateError = validateCaseDateNotFuture(normalizedBody.case_date);
        if (caseDateError) {
            return res.status(400).json({ msg: caseDateError });
        }
        const caseItem = await Case.findOneAndUpdate(
            { _id: req.params.id, is_removed: { $ne: true } },
            { $set: normalizedBody },
            { new: true }
        );
        if (!caseItem) {
            return res.status(404).json({ msg: 'Case not found' });
        }
        res.json(serializeCaseForClient(caseItem));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Soft-delete a case (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const result = await Case.findByIdAndUpdate(
            req.params.id,
            { $set: { is_removed: true } },
            { new: true, strict: false }
        );
        if (!result) return res.status(404).json({ msg: 'Case not found' });
        res.json({ msg: 'Case marked as removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Restore a soft-deleted case (admin only)
router.put('/:id/restore', adminAuth, async (req, res) => {
    try {
        const result = await Case.findByIdAndUpdate(
            req.params.id,
            { $set: { is_removed: false } },
            { new: true, strict: false }
        );
        if (!result) return res.status(404).json({ msg: 'Case not found' });
        res.json({ msg: 'Case restored successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Duplicate of /me/assigned (kept for compatibility)
router.get('/me/assigned', userAuth, async (req, res) => {
    try {
        const handler = req.user.fullname;
        const cases = await Case.find({ case_handler: handler, isApproved: true, is_removed: { $ne: true } }).sort({ case_date: -1 });
        res.json(serializeCasesForClient(cases));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
