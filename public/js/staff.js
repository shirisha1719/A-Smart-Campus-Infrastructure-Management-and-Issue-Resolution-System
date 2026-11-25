/**
 * Fix My Campus - Maintenance Staff Portal Controller
 */
const StaffPortal = {
  assignedOrders: [],
  activeFilter: 'all',

  async init() {
    await this.loadData();
    this.setupEventListeners();
  },

  async loadData() {
    try {
      const res = await API.getComplaints({ view: 'assigned' });
      if (res.success) {
        this.assignedOrders = res.complaints;
        this.renderKPIs();
        this.renderOrders();
      }
    } catch (err) {
      console.error('[Staff Portal Error]', err);
    }
  },

  renderKPIs() {
    const total = this.assignedOrders.length;
    const assigned = this.assignedOrders.filter(c => c.status === 'Assigned').length;
    const inProgress = this.assignedOrders.filter(c => c.status === 'In Progress').length;
    const resolved = this.assignedOrders.filter(c => c.status === 'Resolved').length;

    const totalEl = document.getElementById('staffKpiTotal');
    const assignedEl = document.getElementById('staffKpiAssigned');
    const inProgressEl = document.getElementById('staffKpiProgress');
    const resolvedEl = document.getElementById('staffKpiResolved');

    if (totalEl) totalEl.innerText = total;
    if (assignedEl) assignedEl.innerText = assigned;
    if (inProgressEl) inProgressEl.innerText = inProgress;
    if (resolvedEl) resolvedEl.innerText = resolved;
  },

  renderOrders() {
    const container = document.getElementById('staffOrdersContainer');
    if (!container) return;

    let filtered = this.assignedOrders;
    if (this.activeFilter === 'pending') {
      filtered = filtered.filter(c => c.status === 'Assigned');
    } else if (this.activeFilter === 'progress') {
      filtered = filtered.filter(c => c.status === 'In Progress');
    } else if (this.activeFilter === 'resolved') {
      filtered = filtered.filter(c => c.status === 'Resolved');
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-screwdriver-wrench"></i>
          <h4>No work orders in this view</h4>
          <p>You have no assigned tasks matching this filter. Great job staying on top of maintenance!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="complaints-cards-grid">
        ${filtered.map(order => this.renderOrderCard(order)).join('')}
      </div>
    `;
  },

  renderOrderCard(order) {
    const statusClass = `status-${order.status.toLowerCase().replace(/\s+/g, '')}`;
    const priorityClass = `priority-${order.priority.toLowerCase()}`;
    const fallbackImage = '/assets/images/sample-leak.svg';
    const displayImg = order.image_url || fallbackImage;

    let actionButtons = '';
    if (order.status === 'Assigned') {
      actionButtons = `
        <button class="btn btn-sm btn-primary" onclick="StaffPortal.startWork(${order.id})">
          <i class="fa-solid fa-play"></i> Start Work
        </button>
      `;
    } else if (order.status === 'In Progress') {
      actionButtons = `
        <button class="btn btn-sm btn-success" onclick="AdminPortal.openStatusModal(${order.id}, 'In Progress')">
          <i class="fa-solid fa-circle-check"></i> Mark Resolved
        </button>
      `;
    } else if (order.status === 'Resolved') {
      actionButtons = `
        <span class="badge status-resolved"><i class="fa-solid fa-check"></i> Completed</span>
      `;
    }

    return `
      <div class="complaint-card" style="border-left: 4px solid ${order.priority === 'Critical' ? '#ef4444' : '#2563eb'};">
        <div class="complaint-card-image">
          <img src="${displayImg}" alt="${order.title}" onerror="this.src='${fallbackImage}'" />
          <div class="card-top-badges">
            <span class="badge ${statusClass}">
              <span class="badge-dot"></span> ${order.status}
            </span>
            <span class="badge ${priorityClass}">
              ${order.priority}
            </span>
          </div>
        </div>
        <div class="complaint-card-body">
          <div class="complaint-ticket-id">#${order.ticket_number} • ${order.category}</div>
          <h4 class="complaint-card-title">${order.title}</h4>
          <p class="complaint-card-desc">${order.description}</p>
          
          <div class="complaint-meta-row">
            <i class="fa-solid fa-building"></i>
            <span><strong>${order.building_name}</strong></span>
          </div>
          <div class="complaint-meta-row">
            <i class="fa-solid fa-location-crosshairs"></i>
            <span>${order.specific_location || order.room_or_zone || 'Campus Area'}</span>
          </div>
          <div class="complaint-meta-row">
            <i class="fa-solid fa-user"></i>
            <span>Reported by: ${order.reporter_name} (${order.reporter_phone || 'No phone'})</span>
          </div>
        </div>
        <div class="complaint-card-footer">
          <button class="btn btn-sm btn-outline" onclick="App.loadComplaintDetails(${order.id})">
            <i class="fa-solid fa-circle-info"></i> Details
          </button>
          <div>
            ${actionButtons}
          </div>
        </div>
      </div>
    `;
  },

  async startWork(complaintId) {
    const formData = new FormData();
    formData.append('status', 'In Progress');
    formData.append('note', 'Maintenance technician began on-site diagnostics and repair work.');

    try {
      const res = await API.updateComplaintStatus(complaintId, formData);
      if (res.success) {
        App.showToast('Work Started', `Ticket #${res.complaint.ticket_number} is now In Progress.`, 'info');
        this.loadData();
      }
    } catch (err) {
      App.showToast('Error', err.message, 'error');
    }
  },

  setFilter(filterName) {
    this.activeFilter = filterName;
    document.querySelectorAll('.staff-filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.staff-filter-btn[data-filter="${filterName}"]`)?.classList.add('active');
    this.renderOrders();
  },

  setupEventListeners() {
    // listeners if needed
  }
};
