const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/stats/dashboard (Admin only)
router.get('/dashboard', requireRole('admin'), async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[Dashboard Stats Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load dashboard statistics.' });
  }
});

// GET /api/stats/summary (Accessible to logged-in users for quick KPIs)
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const complaints = await db.getComplaints();

    let myTotal = 0;
    let myPending = 0;
    let myInProgress = 0;
    let myResolved = 0;

    if (user.role === 'student') {
      const my = complaints.filter(c => c.user_id === user.id);
      myTotal = my.length;
      myPending = my.filter(c => c.status === 'Pending').length;
      myInProgress = my.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length;
      myResolved = my.filter(c => c.status === 'Resolved').length;
    } else if (user.role === 'staff') {
      const my = complaints.filter(c => c.assigned_to === user.id);
      myTotal = my.length;
      myPending = my.filter(c => c.status === 'Assigned').length;
      myInProgress = my.filter(c => c.status === 'In Progress').length;
      myResolved = my.filter(c => c.status === 'Resolved').length;
    } else {
      myTotal = complaints.length;
      myPending = complaints.filter(c => c.status === 'Pending').length;
      myInProgress = complaints.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length;
      myResolved = complaints.filter(c => c.status === 'Resolved').length;
    }

    return res.json({
      success: true,
      summary: {
        total: myTotal,
        pending: myPending,
        inProgress: myInProgress,
        resolved: myResolved
      }
    });
  } catch (err) {
    console.error('[Summary Stats Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch summary.' });
  }
});

module.exports = router;
