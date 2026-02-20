const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_MONGO_URI = process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/';
const PROD_MONGO_URI = process.env.MONGO_URI_PROD || process.env.MONGO_URI || '';
const MONGO_URI = isProduction ? (PROD_MONGO_URI || LOCAL_MONGO_URI) : LOCAL_MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || "police_info";

mongoose.connect(MONGO_URI, { dbName: MONGO_DB })
    .then(() => console.log("MongoDB connected to database: " + mongoose.connection.name))
    .catch(err => console.error("MongoDB connection error:", err));

/* Register API route handlers */
app.use('/api/users', require('./routes/users'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));

app.get('/', (req, res) => {
    res.send('Police Case Management API is running...');
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
