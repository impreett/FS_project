const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Case = require('../models/Case');
const UpdateCase = require('../models/UpdateCase');
const adminAuth = require('../middleware/auth');

// User management
router.get('/pending-users', adminAuth, async (req, res) => {
    try {
        const users = await User.find({ isApproved: false });
        res.json(users);
    } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/active-users', adminAuth, async (req, res) => {
    try {
        const users = await User.find({ isApproved: true, isAdmin: false }).sort({ fullname: 'asc' });
        res.json(users);
    } catch (err) { res.status(500).send('Server Error'); }
});

router.put('/approve-user/:id', adminAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isApproved: true });
        res.json({ msg: 'User approved successfully' });
    } catch (err) { res.status(500).send('Server Error'); }
});

router.put('/disable-user/:id', adminAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isApproved: false });
        res.json({ msg: 'User disabled successfully' });
    } catch (err) { res.status(500).send('Server Error'); }
});

router.delete('/deny-user/:id', adminAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User denied and removed successfully' });
    } catch (err) { res.status(500).send('Server Error'); }
});

// Case management
router.get('/all-cases', adminAuth, async (req, res) => {
    try {
        const cases = await Case.find({ is_removed: { $ne: true } }).sort({ case_date: -1 });
        res.json(cases);
    } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/pending-cases', adminAuth, async (req, res) => {
    try {
        const cases = await Case.find({ isApproved: false, is_removed: { $ne: true } }).sort({ case_date: -1 });
        res.json(cases);
    } catch (err) { res.status(500).send('Server Error'); }
});

router.put('/approve-case/:id', adminAuth, async (req, res) => {
    try {
        await Case.findByIdAndUpdate(req.params.id, { isApproved: true });
        res.json({ msg: 'Case approved successfully' });
    } catch (err) { res.status(500).send('Server Error'); }
});

router.delete('/deny-case/:id', adminAuth, async (req, res) => {
    try {
        await Case.findByIdAndUpdate(req.params.id, { is_removed: true });
        res.json({ msg: 'Case denied and removed successfully' });
    } catch (err) { res.status(500).send('Server Error'); }
});

// Removed cases listing for admins
router.get('/removed-cases', adminAuth, async (req, res) => {
    try {
        const cases = await Case.find({ is_removed: true }).sort({ case_date: -1 });
        res.json(cases);
    } catch (err) { res.status(500).send('Server Error'); }
});

// Get any case by ID (including removed)
router.get('/case/:id', adminAuth, async (req, res) => {
    try {
        const caseItem = await Case.findById(req.params.id);
        if (!caseItem) return res.status(404).json({ msg: 'Case not found' });
        res.json(caseItem);
    } catch (err) { res.status(500).send('Server Error'); }
});

// Update request management
router.get('/pending-updates', adminAuth, async (req, res) => {
    try {
        const updates = await UpdateCase.find().sort({ requestedAt: -1 });
        res.json(updates);
    } catch (err) { res.status(500).send('Server Error'); }
});

router.put('/approve-update/:updateId', adminAuth, async (req, res) => {
    try {
        const updateRequest = await UpdateCase.findById(req.params.updateId);
        if (!updateRequest) {
            return res.status(404).json({ msg: 'Update request not found' });
        }
        const { _id, __v, originalCaseId, ...updatedData } = updateRequest.toObject();
        await Case.findByIdAndUpdate(originalCaseId, { $set: updatedData });
        await UpdateCase.findByIdAndDelete(req.params.updateId);
        res.json({ msg: 'Update approved and applied successfully!' });
    } catch (err) { res.status(500).send('Server Error'); }
});

router.delete('/deny-update/:updateId', adminAuth, async (req, res) => {
    try {
        await UpdateCase.findByIdAndDelete(req.params.updateId);
        res.json({ msg: 'Update request denied and removed.' });
    } catch (err) { res.status(500).send('Server Error'); }
});

// Admin search route
router.get('/search-cases', adminAuth, async (req, res) => {
    try {
        const { field, query } = req.query;
        let searchFilter = { is_removed: { $ne: true } }; // non-removed by default
        if (query && field) {
            if (field === "for-all") {
                searchFilter.$or = [
                    { case_title: { $regex: query, $options: 'i' } },
                    { case_type: { $regex: query, $options: 'i' } },
                    { case_description: { $regex: query, $options: 'i' } },
                    { suspects: { $regex: query, $options: 'i' } },
                    { victim: { $regex: query, $options: 'i' } },
                    { guilty_name: { $regex: query, $options: 'i' } },
                    { case_handler: { $regex: query, $options: 'i' } }
                ];
            } else if (field === "isApproved") {
                searchFilter.isApproved = query === '1';
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
            } else {
                searchFilter[field] = { $regex: query, $options: 'i' };
            }
        }
        const cases = await Case.find(searchFilter).sort({ case_date: -1 });
        res.json(cases);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

