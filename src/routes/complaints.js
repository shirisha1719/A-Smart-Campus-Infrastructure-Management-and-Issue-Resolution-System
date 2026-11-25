const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const socketHandler = require('../sockets/socketHandler');

// GET /api/complaints
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, category, priority, buildingId, search, view } = req.query;

    const filters = {
      status,
      category,
      priority,
      buildingId,
      search
    };

    if (user.role === 'student') {
      filters.role = 'student';
      filters.userId = user.id;
    } else if (user.role === 'staff') {
      // staff can see assigned work, or all if requested
      if (view === 'assigned' || !view) {
        filters.role = 'staff';
        filters.assignedTo = user.id;
      }
    }
    // Admin sees all by default

    const complaints = await db.getComplaints(filters);
    return res.json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    console.error('[Get Complaints Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch complaints.' });
  }
});

// GET /api/complaints/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const complaint = await db.getComplaintById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const user = req.session.user;
    // Check access permission: students can only view their own
    if (user.role === 'student' && complaint.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this complaint.' });
    }

    const history = await db.getComplaintHistory(complaint.id);
    const feedback = await db.getFeedback(complaint.id);

    return res.json({
      success: true,
      complaint: {
        ...complaint,
        history,
        feedback
      }
    });
  } catch (err) {
    console.error('[Get Complaint By ID Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch complaint details.' });
  }
});

// POST /api/complaints (Student / Faculty report issue)
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const user = req.session.user;
    const { title, description, category, buildingId, locationId, specificLocation, priority } = req.body;

    if (!title || !description || !category || !buildingId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Title, Category, Campus Building, and Description.'
      });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const newComplaint = await db.createComplaint({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      priority: priority || 'Medium',
      buildingId: Number(buildingId),
      locationId: locationId ? Number(locationId) : null,
      specificLocation: specificLocation ? specificLocation.trim() : null,
      userId: user.id,
      imageUrl
    });

    // Create confirmation notification for student
    await db.createNotification(
      user.id,
      newComplaint.id,
      'Issue Reported Successfully',
      `Ticket #${newComplaint.ticket_number} created: "${newComplaint.title}". Campus maintenance team has been alerted.`,
      'success'
    );

    // Notify admins
    const admins = await db.getAllUsers('admin');
    for (const admin of admins) {
      await db.createNotification(
        admin.id,
        newComplaint.id,
        'New Campus Issue Reported',
        `${user.name} reported "${newComplaint.title}" at ${newComplaint.building_name}. Priority: ${newComplaint.priority}.`,
        newComplaint.priority === 'Critical' ? 'danger' : 'info'
      );
    }

    // Real-time broadcast
    socketHandler.notifyNewComplaint(newComplaint);

    return res.status(201).json({
      success: true,
      message: 'Issue reported successfully! Your ticket number is ' + newComplaint.ticket_number,
      complaint: newComplaint
    });
  } catch (err) {
    console.error('[Create Complaint Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to submit complaint. ' + err.message });
  }
});

// PUT /api/complaints/:id/status (Admin or Assigned Staff)
router.put('/:id/status', requireAuth, upload.single('resolutionImage'), async (req, res) => {
  try {
    const user = req.session.user;
    const complaintId = req.params.id;
    const { status, note } = req.body;

    const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const complaint = await db.getComplaintById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Authorization: Admin or Assigned Staff
    if (user.role !== 'admin' && !(user.role === 'staff' && complaint.assigned_to === user.id)) {
      return res.status(403).json({ success: false, message: 'Only campus admins or assigned staff can update this complaint status.' });
    }

    let resolutionImageUrl = null;
    if (req.file) {
      resolutionImageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await db.updateComplaintStatus(complaintId, status, user.id, note, resolutionImageUrl);

    // Notify student reporter
    await db.createNotification(
      complaint.user_id,
      complaint.id,
      `Status Update: ${status}`,
      `Your ticket #${complaint.ticket_number} is now "${status}". ${note ? `Note: ${note}` : ''}`,
      status === 'Resolved' ? 'success' : (status === 'Rejected' ? 'danger' : 'info')
    );

    // Socket real-time update
    socketHandler.notifyComplaintUpdate(updated, 'status', `Status changed to ${status} by ${user.name}`);

    return res.json({
      success: true,
      message: `Complaint #${complaint.ticket_number} status updated to ${status}.`,
      complaint: updated
    });
  } catch (err) {
    console.error('[Update Status Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

// PUT /api/complaints/:id/priority (Admin only)
router.put('/:id/priority', requireRole('admin'), async (req, res) => {
  try {
    const user = req.session.user;
    const complaintId = req.params.id;
    const { priority, reason } = req.body;

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority level.' });
    }

    const complaint = await db.getComplaintById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const updated = await db.updateComplaintPriority(complaintId, priority, user.id, reason);

    // Socket broadcast
    socketHandler.notifyComplaintUpdate(updated, 'priority', `Priority changed to ${priority}`);

    return res.json({
      success: true,
      message: `Priority set to ${priority}.`,
      complaint: updated
    });
  } catch (err) {
    console.error('[Update Priority Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update priority.' });
  }
});

// PUT /api/complaints/:id/assign (Admin only)
router.put('/:id/assign', requireRole('admin'), async (req, res) => {
  try {
    const adminUser = req.session.user;
    const complaintId = req.params.id;
    const { staffId, priority, comment } = req.body;

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Please select a maintenance staff member to assign.' });
    }

    const staff = await db.findUserById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Selected user is not a valid maintenance staff member.' });
    }

    const complaint = await db.getComplaintById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const updated = await db.assignComplaint(complaintId, staffId, adminUser.id, priority, comment);

    // Notify staff member
    await db.createNotification(
      staff.id,
      complaint.id,
      'New Work Order Assigned',
      `You were assigned ticket #${complaint.ticket_number}: "${complaint.title}" at ${complaint.building_name}.`,
      'warning'
    );

    // Notify student reporter
    await db.createNotification(
      complaint.user_id,
      complaint.id,
      'Assigned to Maintenance Staff',
      `Your ticket #${complaint.ticket_number} has been assigned to ${staff.name} (${staff.specialization || 'Maintenance'}).`,
      'info'
    );

    // Socket broadcast
    socketHandler.notifyComplaintUpdate(updated, 'assignment', `Assigned to ${staff.name}`);

    return res.json({
      success: true,
      message: `Work order #${complaint.ticket_number} assigned to ${staff.name}.`,
      complaint: updated
    });
  } catch (err) {
    console.error('[Assign Complaint Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to assign complaint.' });
  }
});

// POST /api/complaints/:id/feedback (Student feedback after resolution)
router.post('/:id/feedback', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const complaintId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5 stars.' });
    }

    const complaint = await db.getComplaintById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (complaint.user_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the reporter can provide feedback on this complaint.' });
    }

    const feedback = await db.addFeedback(complaintId, user.id, rating, comment);

    // Add to history
    await db.addComplaintHistory(complaintId, user.id, 'Feedback Submitted', `Student submitted ${rating}-star rating: "${comment || 'No comment'}"`, complaint.status);

    // Notify assigned staff
    if (complaint.assigned_to) {
      await db.createNotification(
        complaint.assigned_to,
        complaint.id,
        'Feedback Received',
        `${user.name} rated work on #${complaint.ticket_number}: ${rating} / 5 stars.`,
        'success'
      );
    }

    const updated = await db.getComplaintById(complaintId);
    socketHandler.notifyComplaintUpdate(updated, 'feedback', `Student submitted ${rating}-star rating`);

    return res.json({
      success: true,
      message: 'Thank you for your feedback! Your review helps improve campus maintenance.',
      feedback
    });
  } catch (err) {
    console.error('[Feedback Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
  }
});

module.exports = router;
