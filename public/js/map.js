/**
 * Fix My Campus - Interactive Campus Map & Location Picker Module
 */
const CampusMap = {
  buildings: [],
  mapData: [],
  selectedBuilding: null,
  activeCategory: 'All',

  async init(containerId = 'campusMapCanvas') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await API.getMapData();
      if (res.success) {
        this.mapData = res.mapBuildings;
        this.buildings = res.mapBuildings;
        this.renderMap(container);
      }
    } catch (err) {
      console.error('[Map Error] Failed to load map data:', err);
    }
  },

  renderMap(container) {
    // Render Campus SVG Underlay with landscape, walkways, and greens
    const svgUnderlay = `
      <svg class="campus-svg-base" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <!-- Campus boundary and lawns -->
        <rect width="1000" height="600" fill="#e2e8f0" />
        
        <!-- North Lawn Quad -->
        <path d="M 220 80 Q 500 50 780 90 L 750 240 Q 500 200 240 230 Z" fill="#dcfce7" opacity="0.8" />
        
        <!-- South Academic Oval -->
        <ellipse cx="480" cy="460" rx="280" ry="110" fill="#f0fdf4" opacity="0.9" />
        
        <!-- Lake / Campus Pond -->
        <path d="M 680 430 C 740 400, 840 440, 880 490 C 860 550, 760 560, 700 520 Z" fill="#bae6fd" stroke="#7dd3fc" stroke-width="4" />
        
        <!-- Athletic Track & Field -->
        <rect x="760" y="60" width="180" height="110" rx="55" fill="#fee2e2" stroke="#fca5a5" stroke-width="6" />
        
        <!-- Primary Campus Arterial Roads -->
        <path d="M 0 300 Q 500 280 1000 300" stroke="#cbd5e1" stroke-width="26" fill="none" stroke-linecap="round" />
        <path d="M 500 0 Q 480 300 500 600" stroke="#cbd5e1" stroke-width="22" fill="none" stroke-linecap="round" />
        
        <!-- Walkways -->
        <line x1="285" y1="200" x2="520" y2="150" stroke="#ffffff" stroke-width="8" stroke-dasharray="6,4" />
        <line x1="520" y1="150" x2="750" y2="210" stroke="#ffffff" stroke-width="8" stroke-dasharray="6,4" />
        <line x1="500" y1="290" x2="420" y2="330" stroke="#ffffff" stroke-width="8" />
        <line x1="420" y1="330" x2="200" y2="390" stroke="#ffffff" stroke-width="8" />
        <line x1="500" y1="310" x2="550" y2="430" stroke="#ffffff" stroke-width="8" />
        <line x1="550" y1="430" x2="800" y2="410" stroke="#ffffff" stroke-width="8" />

        <!-- Road divider lines -->
        <path d="M 0 300 Q 500 280 1000 300" stroke="#f8fafc" stroke-width="2" stroke-dasharray="12,12" fill="none" />
      </svg>
    `;

    // Filter buildings by active category
    const filteredBuildings = this.activeCategory === 'All' 
      ? this.mapData 
      : this.mapData.filter(b => b.category.toLowerCase() === this.activeCategory.toLowerCase());

    // Generate Building Pins
    let pinsHtml = '';
    filteredBuildings.forEach(b => {
      const isCritical = b.criticalIssues > 0;
      const criticalClass = isCritical ? 'has-critical' : '';
      const pinColor = b.color || '#2563eb';
      const badgeHtml = b.activeIssues > 0 
        ? `<div class="pin-badge" title="${b.activeIssues} active issues">${b.activeIssues}</div>` 
        : '';

      pinsHtml += `
        <div class="building-pin ${criticalClass}" 
             style="left: ${b.coordinates_x}%; top: ${b.coordinates_y}%;" 
             data-id="${b.id}"
             onclick="CampusMap.selectPin(${b.id})"
             title="${b.name}">
          <div class="pin-marker" style="background-color: ${isCritical ? '#ef4444' : pinColor}">
            <i class="fa-solid ${b.icon || 'fa-building'}"></i>
            ${badgeHtml}
          </div>
          <div class="pin-label">${b.name}</div>
        </div>
      `;
    });

    // Floating Building Info Card (hidden by default)
    const cardHtml = `
      <div id="mapBuildingCard" class="map-building-card" style="display: none;">
        <div class="map-card-header">
          <div>
            <div id="mapCardCategory" class="map-card-category">Academic</div>
            <h4 id="mapCardTitle" class="map-card-title">Building Name</h4>
          </div>
          <button class="modal-close-btn" onclick="CampusMap.closeCard()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p id="mapCardDesc" class="map-card-desc">Building description goes here.</p>
        <div class="map-card-stats">
          <div class="map-mini-stat">
            <div id="mapCardActive" class="map-mini-stat-num" style="color: #ef4444;">0</div>
            <div class="map-mini-stat-label">Active Issues</div>
          </div>
          <div class="map-mini-stat">
            <div id="mapCardResolved" class="map-mini-stat-num" style="color: #10b981;">0</div>
            <div class="map-mini-stat-label">Resolved</div>
          </div>
        </div>
        <div class="map-card-actions">
          <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="CampusMap.reportHere()">
            <i class="fa-solid fa-plus-circle"></i> Report Issue Here
          </button>
          <button class="btn btn-secondary btn-sm" onclick="CampusMap.filterIssuesHere()">
            <i class="fa-solid fa-filter"></i> View Issues
          </button>
        </div>
      </div>
    `;

    container.innerHTML = svgUnderlay + pinsHtml + cardHtml;
  },

  selectPin(buildingId) {
    const building = this.mapData.find(b => b.id === Number(buildingId));
    if (!building) return;

    this.selectedBuilding = building;

    const card = document.getElementById('mapBuildingCard');
    if (!card) return;

    document.getElementById('mapCardTitle').innerText = building.name;
    document.getElementById('mapCardCategory').innerText = `${building.category} • ${building.floors} Floors`;
    document.getElementById('mapCardDesc').innerText = building.description || 'Campus facility location.';
    document.getElementById('mapCardActive').innerText = building.activeIssues;
    document.getElementById('mapCardResolved').innerText = building.resolvedIssues;

    card.style.display = 'block';
  },

  closeCard() {
    const card = document.getElementById('mapBuildingCard');
    if (card) card.style.display = 'none';
    this.selectedBuilding = null;
  },

  reportHere() {
    if (!this.selectedBuilding) return;
    App.openReportModal(this.selectedBuilding.id);
  },

  filterIssuesHere() {
    if (!this.selectedBuilding) return;
    const bId = this.selectedBuilding.id;
    if (App.currentUser.role === 'admin') {
      App.switchTab('complaints');
      const select = document.getElementById('adminFilterBuilding');
      if (select) {
        select.value = bId;
        AdminPortal.loadData();
      }
    } else if (App.currentUser.role === 'student') {
      App.switchTab('complaints');
      const select = document.getElementById('studentFilterBuilding');
      if (select) {
        select.value = bId;
        StudentPortal.loadComplaints();
      }
    }
  },

  filterCategory(category) {
    this.activeCategory = category;
    const container = document.getElementById('campusMapCanvas');
    if (container) {
      this.renderMap(container);
    }
  },

  // Helper for Report Issue Modal: populate building selector grid
  async populateBuildingSelector(targetGridId = 'reportBuildingGrid', onSelectCallback) {
    const grid = document.getElementById(targetGridId);
    if (!grid) return;

    if (this.buildings.length === 0) {
      const res = await API.getBuildings();
      if (res.success) {
        this.buildings = res.buildings;
      }
    }

    grid.innerHTML = this.buildings.map(b => `
      <div class="building-select-card" data-id="${b.id}" onclick="CampusMap.handleBuildingCardSelect(${b.id})">
        <i class="fa-solid ${b.icon || 'fa-building'}" style="color: ${b.color || '#2563eb'};"></i>
        <div class="building-select-name">${b.name}</div>
        <div class="building-select-code">${b.code} • ${b.category}</div>
      </div>
    `).join('');
  },

  handleBuildingCardSelect(buildingId) {
    document.querySelectorAll('.building-select-card').forEach(c => c.classList.remove('selected'));
    const target = document.querySelector(`.building-select-card[data-id="${buildingId}"]`);
    if (target) target.classList.add('selected');

    const hiddenInput = document.getElementById('reportBuildingId');
    if (hiddenInput) {
      hiddenInput.value = buildingId;
      // Trigger dynamic fetch of floor/zone locations
      CampusMap.loadLocationOptions(buildingId);
    }
  },

  async loadLocationOptions(buildingId) {
    const locationSelect = document.getElementById('reportLocationId');
    if (!locationSelect) return;

    locationSelect.innerHTML = '<option value="">Loading locations...</option>';
    try {
      const res = await API.getLocations(buildingId);
      if (res.success && res.locations.length > 0) {
        let opts = '<option value="">-- Select Specific Floor / Room --</option>';
        res.locations.forEach(loc => {
          opts += `<option value="${loc.id}">${loc.floor_name} - ${loc.room_or_zone} (${loc.zone_type})</option>`;
        });
        locationSelect.innerHTML = opts;
      } else {
        locationSelect.innerHTML = '<option value="">No predefined rooms (specify below)</option>';
      }
    } catch (err) {
      locationSelect.innerHTML = '<option value="">Specify room/location details below</option>';
    }
  }
};
