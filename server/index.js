const express = require('express');
const cookieSession = require('cookie-session');
require('dotenv').config();

const logRoutes = require('./middleware/logRoutes');
const checkAdmin = require('./middleware/checkAdmin');
const checkAuthenticated = require('./middleware/checkAuthenticated');

const authControllers = require('./controllers/authControllers');
const recipientControllers = require('./controllers/recipientControllers');
const cycleControllers = require('./controllers/cycleControllers');
const disbursementControllers = require('./controllers/disbursementControllers');
const fundingPoolControllers = require('./controllers/fundingPoolControllers');
const auditLogControllers = require('./controllers/auditLogControllers');

const app = express();
const PORT = process.env.PORT || 8080;

// ====================================
// Middleware
// ====================================

app.use(logRoutes);
app.use(cookieSession({ name: 'session', secret: process.env.SESSION_SECRET }));
app.use(express.json());

// ====================================
// Auth routes
// ====================================

app.post('/api/auth/recipient/register', authControllers.recipientRegister);
app.post('/api/auth/recipient/login', authControllers.recipientLogin);
app.post('/api/auth/admin/login', authControllers.adminLogin);
app.get('/api/auth/me', authControllers.getMe);
app.delete('/api/auth/logout', authControllers.logout);

// ====================================
// Recipient routes
// ====================================

app.get('/api/recipients', checkAdmin, recipientControllers.listRecipients);
app.get('/api/recipients/:id', checkAuthenticated, recipientControllers.getRecipient);
app.post('/api/recipients', checkAdmin, recipientControllers.enrollRecipient);
app.patch('/api/recipients/:id/revoke', checkAdmin, recipientControllers.revokeRecipient);
app.patch('/api/recipients/:id/reinstate', checkAdmin, recipientControllers.reinstateRecipient);

// ====================================
// Disbursement cycle routes (admin only)
// ====================================

app.get('/api/cycles', checkAdmin, cycleControllers.listCycles);
app.get('/api/cycles/:id', checkAdmin, cycleControllers.getCycle);
app.post('/api/cycles', checkAdmin, cycleControllers.createCycle);
app.post('/api/cycles/:id/trigger', checkAdmin, cycleControllers.triggerCycle);

// ====================================
// Disbursement routes
// ====================================

app.get('/api/recipients/:id/disbursements', checkAuthenticated, disbursementControllers.listByRecipient);
app.get('/api/disbursements/:id', checkAuthenticated, disbursementControllers.getDisbursement);

// ====================================
// Funding pool routes (admin only)
// ====================================

app.get('/api/funding-pool', checkAdmin, fundingPoolControllers.getPool);
app.post('/api/funding-pool/sync', checkAdmin, fundingPoolControllers.syncPool);

// ====================================
// Audit log routes (admin only)
// ====================================

app.get('/api/audit-log', checkAdmin, auditLogControllers.listAuditLog);

// ====================================
// Global error handler
// ====================================

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ message: 'Internal Server Error' });
});

// ====================================
// Listen
// ====================================

app.listen(PORT, () => console.log(`ChainBase server running at http://localhost:${PORT}`));
