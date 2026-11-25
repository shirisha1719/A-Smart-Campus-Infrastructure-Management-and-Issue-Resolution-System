const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/campus/buildings
router.get('/buildings', async (req, res) => {
  try {
    const buildings = await db.getBuildings();
    return res.json({ success: true, buildings });
  } catch (err) {
    console.error('[Campus Buildings Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch campus buildings.' });
  }
});

// GET /api/campus/locations
router.get('/locations', async (req, res) => {
  try {
    const { buildingId } = req.query;
    const locations = await db.getLocations(buildingId);
    return res.json({ success: true, locations });
  } catch (err) {
    console.error('[Campus Locations Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch locations.' });
  }
});

// GET /api/campus/map-data
router.get('/map-data', async (req, res) => {
  try {
    const buildings = await db.getBuildings();
    const complaints = await db.getComplaints();

    const enriched = buildings.map(b => {
      const bComplaints = complaints.filter(c => c.building_id === b.id);
      const active = bComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Rejected');
      const critical = active.filter(c => c.priority === 'Critical').length;
      const high = active.filter(c => c.priority === 'High').length;

      return {
        ...b,
        totalIssues: bComplaints.length,
        activeIssues: active.length,
        resolvedIssues: bComplaints.filter(c => c.status === 'Resolved').length,
        criticalIssues: critical,
        highIssues: high,
        hasCritical: critical > 0
      };
    });

    return res.json({ success: true, mapBuildings: enriched });
  } catch (err) {
    console.error('[Campus Map Data Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load campus map data.' });
  }
});

module.exports = router;
