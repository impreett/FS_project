const mongoose = require('mongoose');

/* Schema for case update requests - stores proposed changes before approval */
const updateCaseSchema = new mongoose.Schema({
    originalCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    case_title: { type: String, required: true },
    case_type: { type: String, required: true },
    case_description: { type: String, default: '' },
    suspects: { type: String, default: '' },
    victim: { type: String, default: '' },
    guilty_name: { type: String, default: '' },
    case_date: { type: Date, required: true },
    case_handler: { type: String, required: true },
    status: { type: String, required: true, enum: ['ACTIVE', 'CLOSE'] },
    requestedAt: { type: Date, default: Date.now }
});

const UpdateCase = mongoose.model('UpdateCase', updateCaseSchema);
module.exports = UpdateCase;