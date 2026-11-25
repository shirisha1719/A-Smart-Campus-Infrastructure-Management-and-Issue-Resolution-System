/**
 * Comprehensive Automated Test Suite for Fix My Campus
 */
require('dotenv').config();
const http = require('http');

async function runTests() {
  console.log('=======================================================');
  console.log(' Starting Fix My Campus Comprehensive API Test Suite');
  console.log('=======================================================');

  const db = require('../src/config/db');
  await db.initDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Database & User Model Tests
    console.log('\n[1] Testing User Model & Authentication...');
    const adminUser = await db.findUserByEmail('admin@campus.edu');
    assert(adminUser !== null, 'Admin user exists in database');
    assert(adminUser.role === 'admin', 'Admin user role is admin');

    const staffUser = await db.findUserByEmail('electrician@campus.edu');
    assert(staffUser !== null, 'Staff user exists in database');
    assert(staffUser.role === 'staff', 'Staff user role is staff');
    assert(staffUser.specialization === 'Electrical', 'Staff specialization is Electrical');

    const studentUser = await db.findUserByEmail('student@campus.edu');
    assert(studentUser !== null, 'Student user exists in database');
    assert(studentUser.role === 'student', 'Student user role is student');

    // Register a new student
    const testEmail = `test.student.${Date.now()}@campus.edu`;
    const newStudent = await db.createUser({
      name: 'Test Student Automated',
      email: testEmail,
      password: 'TestPassword123!',
      role: 'student',
      identifier: 'STU-AUTO-01',
      department: 'Computer Science'
    });
    assert(newStudent && newStudent.id > 0, 'New student created successfully');

    // 2. Campus Buildings & Locations Tests
    console.log('\n[2] Testing Campus Buildings & Locations...');
    const buildings = await db.getBuildings();
    assert(buildings.length >= 8, `Loaded ${buildings.length} campus buildings (minimum 8 expected)`);
    assert(buildings.some(b => b.code === 'ENG'), 'Engineering Hall found');
    assert(buildings.some(b => b.code === 'LIB'), 'Central Library found');

    const locations = await db.getLocations(1); // Engineering Hall
    assert(locations.length > 0, `Loaded ${locations.length} locations for Engineering Hall`);

    // 3. Complaint Reporting Workflow
    console.log('\n[3] Testing Complaint Lifecycle & Roles...');
    const testComplaint = await db.createComplaint({
      title: 'Broken projector in Robotics Lab G-04',
      description: 'Projector blinks on and off repeatedly during lecture presentation.',
      category: 'Electrical',
      priority: 'Medium',
      buildingId: 1,
      locationId: 1,
      specificLocation: 'Robotics Lab G-04 East Wall',
      userId: newStudent.id
    });
    assert(testComplaint && testComplaint.ticket_number.startsWith('FMC-'), `Complaint created with ticket: ${testComplaint.ticket_number}`);
    assert(testComplaint.status === 'Pending', 'Initial complaint status is Pending');

    // Admin updates priority
    const prioritized = await db.updateComplaintPriority(testComplaint.id, 'High', adminUser.id, 'Crucial for morning lectures');
    assert(prioritized.priority === 'High', 'Admin successfully changed priority to High');

    // Admin assigns to maintenance staff
    const assigned = await db.assignComplaint(testComplaint.id, staffUser.id, adminUser.id, 'High', 'Assigned to David Miller');
    assert(assigned.assigned_to === staffUser.id, 'Ticket assigned to electrician staff');
    assert(assigned.status === 'Assigned', 'Status automatically progressed to Assigned');

    // Staff marks In Progress
    const inProgress = await db.updateComplaintStatus(testComplaint.id, 'In Progress', staffUser.id, 'Technician replaced HDMI cable and testing bulb power supply');
    assert(inProgress.status === 'In Progress', 'Status progressed to In Progress');

    // Staff marks Resolved with proof notes
    const resolved = await db.updateComplaintStatus(testComplaint.id, 'Resolved', staffUser.id, 'Replaced lamp ballast and tested 1080p video feed for 30 minutes.', '/assets/images/sample-resolved-wifi.svg');
    assert(resolved.status === 'Resolved', 'Status completed as Resolved');
    assert(resolved.resolved_at !== null, 'resolved_at timestamp populated');

    // Student leaves feedback
    const feedback = await db.addFeedback(testComplaint.id, newStudent.id, 5, 'Super fast turnaround! The projector works flawlessly now.');
    assert(feedback.rating === 5, 'Student 5-star rating recorded');

    // Verify Audit Timeline History
    const history = await db.getComplaintHistory(testComplaint.id);
    assert(history.length >= 4, `Audit timeline tracked ${history.length} lifecycle transitions`);
    assert(history.some(h => h.action_title.includes('Assigned')), 'Assignment event recorded in audit history');
    assert(history.some(h => h.status === 'Resolved'), 'Resolution event recorded in audit history');

    // 4. Analytics & Dashboard Statistics
    console.log('\n[4] Testing Dashboard Analytics & KPIs...');
    const stats = await db.getDashboardStats();
    assert(stats.total > 0, `Total complaints calculated: ${stats.total}`);
    assert(stats.resolved > 0, `Resolved count: ${stats.resolved}`);
    assert(stats.resolutionRate > 0, `Resolution rate percentage: ${stats.resolutionRate}%`);
    assert(stats.avgResolutionHours >= 0, `Average resolution time: ${stats.avgResolutionHours} hrs`);
    assert(Object.keys(stats.categories).length > 0, 'Category breakdown contains categories');
    assert(stats.buildingStats.length > 0, 'Building stats populated');

    // 5. Notifications System
    console.log('\n[5] Testing Real-time Notification Dispatch...');
    const notif = await db.createNotification(newStudent.id, testComplaint.id, 'Work Completed', 'Your projector issue has been fixed.', 'success');
    assert(notif && notif.id > 0, 'Notification successfully created');

    const userNotifs = await db.getNotifications(newStudent.id);
    assert(userNotifs.length > 0, 'Retrieved user notifications list');
    assert(!userNotifs[0].is_read, 'Notification initially unread');

    await db.markNotificationRead(notif.id, newStudent.id);
    const updatedNotifs = await db.getNotifications(newStudent.id);
    const readNotif = updatedNotifs.find(n => n.id === notif.id);
    assert(readNotif.is_read == true, 'Notification marked as read');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n=======================================================');
  console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=======================================================');

  if (failed === 0) {
    console.log(' ALL SUITE TESTS PASSED SUCCESSFULLY! APPLICATION IS READY.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
