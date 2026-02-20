const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        age: { type: Number, default: null, min: 0, max: 120 }
    },
    { _id: false }
);

/* Schema for case update requests - stores proposed changes before approval */
const updateCaseSchema = new mongoose.Schema({
    originalCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    case_title: { type: String, required: true },
    case_type: { type: String, required: true },
    case_description: { type: String, default: '' },
    suspects: { type: [personSchema], default: [] },
    victim: { type: [personSchema], default: [] },
    guilty_name: { type: [personSchema], default: [] },
    case_date: { type: Date, required: true },
    case_handler: { type: String, required: true },
    status: { type: String, required: true, enum: ['ACTIVE', 'CLOSE'] },
    requestedAt: { type: Date, required: true, default: Date.now }
});

const UpdateCase = mongoose.model('UpdateCase', updateCaseSchema);
module.exports = UpdateCase;
