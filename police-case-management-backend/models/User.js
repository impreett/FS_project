const mongoose = require('mongoose');

/* User model schema definition */
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    police_id: { type: String, required: true, unique: true, maxlength: 8 },
    contact: { type: String, required: true, unique: true, length: 10 },
    email: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    /* No length restriction to accommodate secure hashed passwords */
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }, /* Flag to identify administrative users */
    isApproved: { type: Boolean, default: false } /* Flag to control user access pending administrative approval */
});

const User = mongoose.model('User', userSchema);
module.exports = User;