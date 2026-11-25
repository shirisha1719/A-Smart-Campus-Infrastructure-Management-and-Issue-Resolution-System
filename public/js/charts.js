/**
 * Fix My Campus - Chart.js Visual Analytics Module
 */
const AnalyticsCharts = {
  statusChart: null,
  categoryChart: null,
  buildingChart: null,
  priorityChart: null,

  initCharts(stats) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not loaded.');
      return;
    }

    this.renderStatusChart(stats);
    this.renderCategoryChart(stats.categories);
    this.renderBuildingChart(stats.buildingStats);
  },

  renderStatusChart(stats) {
    const ctx = document.getElementById('statusChartCanvas');
    if (!ctx) return;

    if (this.statusChart) {
      this.statusChart.destroy();
    }

    const data = {
      labels: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'],
      datasets: [{
        data: [
          stats.pending || 0,
          stats.assigned || 0,
          stats.inProgress || 0,
          stats.resolved || 0,
          stats.rejected || 0
        ],
        backgroundColor: [
          '#f59e0b', // Pending (Amber)
          '#6366f1', // Assigned (Indigo)
          '#0284c7', // In Progress (Sky)
          '#10b981', // Resolved (Emerald)
          '#ef4444'  // Rejected (Rose)
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 12, family: 'system-ui' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return `${context.label}: ${val} (${pct}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  },

  renderCategoryChart(categories = {}) {
    const ctx = document.getElementById('categoryChartCanvas');
    if (!ctx) return;

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    this.categoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Complaints',
          data: values,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, stepSize: 1 },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              maxRotation: 45,
              minRotation: 20
            }
          }
        }
      }
    });
  },

  renderBuildingChart(buildingStats = []) {
    const ctx = document.getElementById('buildingChartCanvas');
    if (!ctx) return;

    if (this.buildingChart) {
      this.buildingChart.destroy();
    }

    const topBuildings = buildingStats.slice(0, 6);
    const labels = topBuildings.map(b => b.code || b.name);
    const activeData = topBuildings.map(b => b.activeCount);
    const totalData = topBuildings.map(b => b.count);

    this.buildingChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Active Issues',
            data: activeData,
            backgroundColor: '#ef4444',
            borderRadius: 4
          },
          {
            label: 'Total Reported',
            data: totalData,
            backgroundColor: '#94a3b8',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, stepSize: 1 },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  }
};
