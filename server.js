require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import Custom Modular Sub-Routers
const authRoutes = require('./routes/auth');
const calculatorRoutes = require('./routes/calculator');
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Mount Global Core App Extensions
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔀 CENTRAL CONTROL DISTRIBUTION MATRIX
app.use('/api/auth', authRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Root Hook
app.get('/', (req, res) => res.send("🚀 Fullstack Risk Decentralized API Engine Serving cleanly..."));

app.listen(PORT, () => console.log(`🚀 Automated Fullstack Risk Engine serving over Port ${PORT}`));
