require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '../frontend')));

// Root Route - Frontend Load Karega
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/rooms',    require('./routes/rooms.routes'));
app.use('/api/bookings', require('./routes/bookings.routes'));
app.use('/api/guests',   require('./routes/guests.routes'));
app.use('/api/pricing',  require('./routes/pricing.routes'));
app.use('/api/services', require('./routes/services.routes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🏨 Hotel Portal API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Frontend: http://localhost:${PORT}`);
});