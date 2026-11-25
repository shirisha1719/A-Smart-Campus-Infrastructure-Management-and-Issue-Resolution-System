/**
 * Fix My Campus - Student Portal Controller
 */
const StudentPortal = {
  complaints: [],
  viewMode: 'cards', // 'cards' or 'table'
  activeFilterStatus: 'All',

  async init() {
    await this.loadComplaints();
    this.setupEventListeners();
  },

  async loadComplaints() {
    try {
      const status = document.getElementById('studentFilterStatus')?.value || this.activeFilterStatus;
      const category = document.getElementById('studentFilterCategory')?.value || '';
      const search = document.getElementById('studentSearchInput')?.value || '';

      const res = await API.getComplaints({ status, category, search });
      if (res.success) {
        this.complaints = res.complaints;
        this.renderKPIs();
        this.renderComplaints();
      }
    } catch (err) {
      console.error('[Student Portal Error]', err);
    }
  },

  renderKPIs() {
    const total = this.complaints.length;
    const pending = this.complaints.filter(c => c.status === 'Pending').length;
    const active = this.complaints.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length;
    const resolved = this.complaints.filter(c => c.status === 'Resolved').length;

    const totalEl = document.getElementById('studentKpiTotal');
    const pendingEl = document.getElementById('studentKpiPending');
    const activeEl = document.getElementById('studentKpiActive');
    const resolvedEl = document.getElementById('studentKpiResolved');

    if (totalEl) totalEl.innerText = total;
    if (pendingEl) pendingEl.innerText = pending;
    if (activeEl) activeEl.innerText = active;
    if (resolvedEl) resolvedEl.innerText = resolved;
  },

  renderComplaints() {
    const container = document.getElementById('studentComplaintsContainer');
    if (!container) return;

    if (this.complaints.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-clipboard-check"></i>
          <h4>No complaints found</h4>
          <p>You have not reported any issues matching your search or filter. Report campus repairs to get maintenance on it!</p>
          <button class="btn btn-primary" onclick="App.openReportModal()">
            <i class="fa-solid fa-plus-circle"></i> Report an Issue Now
          </button>
        </div>
      `;
      return;
    }

    if (this.viewMode === 'cards') {
      container.innerHTML = `
        <div class="complaints-cards-grid">
          ${this.complaints.map(c => this.renderComplaintCard(c)).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Issue Title</th>
                <th>Category</th>
                <th>Campus Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date Reported</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${this.complaints.map(c => this.renderTableRow(c)).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  },

  renderComplaintCard(c) {
    const statusClass = `status-${c.status.toLowerCase().replace(/\s+/g, '')}`;
    const priorityClass = `priority-${c.priority.toLowerCase()}`;
    const fallbackImage = '/assets/images/sample-leak.svg';
    const displayImg = c.image_url || fallbackImage;

    const feedbackBtn = c.status === 'Resolved' && !c.feedback_rating
      ? `<button class="btn btn-sm btn-primary" onclick="App.openFeedbackModal(${c.id})"><i class="fa-solid fa-star"></i> Rate Service</button>`
      : (c.feedback_rating ? `<span class="badge" style="background:#fef3c7; color:#92400e;"><i class="fa-solid fa-star" style="color:#f59e0b"></i> ${c.feedback_rating}/5 Rated</span>` : '');

    return `
      <div class="complaint-card">
        <div class="complaint-card-image">
          <img src="${displayImg}" alt="${c.title}" onerror="this.src='${fallbackImage}'" />
          <div class="card-top-badges">
            <span class="badge ${statusClass}">
              <span class="badge-dot"></span> ${c.status}
            </span>
            <span class="badge ${priorityClass}">
              ${c.priority}
            </span>
          </div>
        </div>
        <div class="complaint-card-body">
          <div class="complaint-ticket-id">#${c.ticket_number} • ${c.category}</div>
          <h4 class="complaint-card-title">${c.title}</h4>
          <p class="complaint-card-desc">${c.description}</p>
          
          <div class="complaint-meta-row">
            <i class="fa-solid fa-location-dot"></i>
            <span>${c.building_name} ${c.room_or_zone ? `(${c.room_or_zone})` : ''}</span>
          </div>
          ${c.staff_name ? `
            <div class="complaint-meta-row">
              <i class="fa-solid fa-user-gear"></i>
              <span>Assigned: <strong>${c.staff_name}</strong></span>
            </div>
          ` : ''}
          <div class="complaint-meta-row">
            <i class="fa-solid fa-calendar"></i>
            <span>${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="complaint-card-footer">
          <button class="btn btn-sm btn-outline" onclick="App.loadComplaintDetails(${c.id})">
            <i class="fa-solid fa-timeline"></i> Track Status
          </button>
          ${feedbackBtn}
        </div>
      </div>
    `;
  },

  renderTableRow(c) {
    const statusClass = `status-${c.status.toLowerCase().replace(/\s+/g, '')}`;
    const priorityClass = `priority-${c.priority.toLowerCase()}`;

    return `
      <tr>
        <td><strong>#${c.ticket_number}</strong></td>
        <td>
          <div style="font-weight: 600;">${c.title}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${c.specific_location || ''}</div>
        </td>
        <td><span class="badge" style="background:var(--secondary-light); color:var(--text-main);">${c.category}</span></td>
        <td>${c.building_name}</td>
        <td><span class="badge ${priorityClass}">${c.priority}</span></td>
        <td>
          <span class="badge ${statusClass}">
            <span class="badge-dot"></span> ${c.status}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="App.loadComplaintDetails(${c.id})">
            <i class="fa-solid fa-eye"></i> Track
          </button>
        </td>
      </tr>
    `;
  },

  setViewMode(mode) {
    this.viewMode = mode;
    document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.view-toggle-btn[data-view="${mode}"]`)?.classList.add('active');
    this.renderComplaints();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('studentSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.loadComplaints());
    }

    const filterStatus = document.getElementById('studentFilterStatus');
    if (filterStatus) {
      filterStatus.addEventListener('change', () => this.loadComplaints());
    }

    const filterCategory = document.getElementById('studentFilterCategory');
    if (filterCategory) {
      filterCategory.addEventListener('change', () => this.loadComplaints());
    }
  }
};
