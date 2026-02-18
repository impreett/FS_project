const mongoose = require('mongoose');

/* Case model schema definition */
const caseSchema = new mongoose.Schema({
    case_title: { type: String, required: true },            /* Title of the case */
    case_type: { type: String, required: true },             /* Category or type classification */
    case_description: { type: String, default: '' },         /* Detailed case description */
    suspects: { type: String, default: '' },                 /* List of case suspects */
    victim: { type: String, default: '' },                   /* Name(s) of victims */
    guilty_name: { type: String, default: '' },              /* Name(s) of guilty parties */
    case_date: { type: Date, required: true },               /* Date when case was filed */
    case_handler: { type: String, required: true },          /* Officer responsible for the case */
    status: { type: String, required: true, enum: ['ACTIVE', 'CLOSE'] }, /* Current case status */
    isApproved: { type: Boolean, default: false },           /* Flag for administrative approval */
    is_removed: { type: Boolean, default: false }            /* Soft deletion flag to preserve records */
});

const Case = mongoose.model('Case', caseSchema);
module.exports = Case;
