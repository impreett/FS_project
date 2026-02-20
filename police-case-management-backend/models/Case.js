const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        age: { type: Number, default: null, min: 0, max: 120 }
    },
    { _id: false }
);

/* Case model schema definition */
const caseSchema = new mongoose.Schema({
    case_title: { type: String, required: true },            /* Title of the case */
    case_type: { type: String, required: true },             /* Category or type classification */
    case_description: { type: String, default: '' },         /* Detailed case description */
    suspects: { type: [personSchema], default: [] },         /* List of suspects as structured entries */
    victim: { type: [personSchema], default: [] },           /* Victim entries as structured entries */
    guilty_name: { type: [personSchema], default: [] },      /* Guilty party entries as structured entries */
    case_date: { type: Date, required: true },               /* Date when case was filed */
    case_handler: { type: String, required: true },          /* Officer responsible for the case */
    status: { type: String, required: true, enum: ['ACTIVE', 'CLOSE'] }, /* Current case status */
    isApproved: { type: Boolean, default: false },           /* Flag for administrative approval */
    is_removed: { type: Boolean, default: false }            /* Soft deletion flag to preserve records */
});

const Case = mongoose.model('Case', caseSchema);
module.exports = Case;
