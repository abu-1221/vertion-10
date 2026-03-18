/**
 * ═══════════════════════════════════════════════════════════
 *  JMC-Test — Student Analytics Engine
 *  User-friendly performance insights & visual analytics
 * ═══════════════════════════════════════════════════════════
 */

const AnalyticsEngine = {
  data: { tests: [], charts: {} },

  colors: {
    primary: '#667eea',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    gradients: [
      ['#667eea', '#764ba2'],
      ['#10b981', '#059669'],
      ['#f59e0b', '#d97706'],
      ['#8b5cf6', '#6d28d9'],
      ['#06b6d4', '#0891b2'],
      ['#ec4899', '#db2777'],
    ],
    barColors: ['#667eea', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444', '#f97316']
  },

  async init() {
    console.log('[Analytics] Initializing...');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    try {
      if (window.DB) {
        this.data.tests = await window.DB.getStudentResults(user.username);
      } else {
        this.data.tests = user.testsCompleted || [];
      }
    } catch (e) {
      console.error('[Analytics] Fetch error:', e);
      this.data.tests = [];
    }

    const hasData = this.data.tests && this.data.tests.length > 0;

    // Toggle visibility
    const chartsGrid = document.querySelector('.analytics-charts-grid');
    const emptyState = document.getElementById('analyticsEmptyState');
    const timeline = document.getElementById('analyticsTimeline');

    if (hasData) {
      if (chartsGrid) chartsGrid.style.display = '';
      if (emptyState) emptyState.style.display = 'none';
      if (timeline) timeline.style.display = '';
    } else {
      if (chartsGrid) chartsGrid.style.display = 'none';
      if (emptyState) emptyState.style.display = '';
      if (timeline) timeline.style.display = 'none';
    }

    this.renderOverview(hasData);
    if (hasData) {
      this.renderTimeline();
      this.renderTestHistory();
    }
    this.destroyCharts();
    this.renderLineChart(hasData);
    this.renderPieChart(hasData);
    this.renderBarChart(hasData);

    console.log(`[Analytics] Rendered with ${this.data.tests.length} tests.`);
  },

  destroyCharts() {
    Object.values(this.data.charts).forEach(c => c && c.destroy());
    this.data.charts = {};
  },

  // ═══════════════ OVERVIEW CARDS ═══════════════
  renderOverview(hasData) {
    const container = document.getElementById('analyticsOverview');
    if (!container) return;

    const tests = this.data.tests;
    const total = tests.length;
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = total - passed;
    const avgScore = total > 0 ? Math.round(tests.reduce((s, t) => s + t.score, 0) / total) : 0;
    const bestScore = total > 0 ? Math.round(Math.max(...tests.map(t => t.score))) : 0;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    container.innerHTML = `
      <div class="analytics-stat-card">
        <div class="analytics-stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 22px; height: 22px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </div>
        <div class="analytics-stat-content">
          <span class="analytics-stat-value">${total}</span>
          <span class="analytics-stat-label">Tests Taken</span>
        </div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 22px; height: 22px;"><polyline points="22 4 12 14.01 9 11.01"/><path d="M22 12a10 10 0 11-5.93-9.14"/></svg>
        </div>
        <div class="analytics-stat-content">
          <span class="analytics-stat-value">${passed}</span>
          <span class="analytics-stat-label">Qualified</span>
        </div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 22px; height: 22px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div class="analytics-stat-content">
          <span class="analytics-stat-value">${failed}</span>
          <span class="analytics-stat-label">Not Qualified</span>
        </div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 22px; height: 22px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="analytics-stat-content">
          <span class="analytics-stat-value">${avgScore}%</span>
          <span class="analytics-stat-label">Average Score</span>
        </div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 22px; height: 22px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div class="analytics-stat-content">
          <span class="analytics-stat-value">${bestScore}%</span>
          <span class="analytics-stat-label">Best Score</span>
        </div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-icon" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 22px; height: 22px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
        <div class="analytics-stat-content">
          <span class="analytics-stat-value">${passRate}%</span>
          <span class="analytics-stat-label">Pass Rate</span>
        </div>
      </div>
    `;
  },

  // ═══════════════ SCORE TIMELINE ═══════════════
  renderTimeline() {
    const container = document.getElementById('scoreTimeline');
    const avgBadge = document.getElementById('avgScoreBadge');
    if (!container) return;

    const tests = this.data.tests;
    const avg = tests.length > 0 ? Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length) : 0;
    if (avgBadge) avgBadge.textContent = `Avg: ${avg}%`;

    container.innerHTML = tests.map((t, i) => {
      const date = t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `Test ${i + 1}`;
      const passed = t.status === 'passed';
      return `
        <div class="timeline-item" title="${t.testName || 'Test'} — ${t.company || ''}" style="flex-shrink: 0; min-width: 140px;">
          <span class="timeline-score ${passed ? 'passed' : 'failed'}">${Math.round(t.score)}%</span>
          <span class="timeline-date">${date}</span>
          <span class="timeline-test">${(t.company || t.testName || 'Test').substring(0, 12)}</span>
          <span class="timeline-badge ${passed ? 'pass' : 'fail'}">${passed ? '✓ Pass' : '✗ Fail'}</span>
        </div>
      `;
    }).join('');

    // Smooth wheel scrolling
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      container.scrollBy({
        left: e.deltaY * 3,
        behavior: 'smooth'
      });
    }, { passive: false });
  },

  // ═══════════════ TEST HISTORY BREAKDOWN ═══════════════
  renderTestHistory() {
    const container = document.getElementById('testHistoryBreakdown');
    if (!container) return;

    if (this.data.tests.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">No tests completed yet.</p>';
      return;
    }

    container.innerHTML = this.data.tests.map((t, i) => {
      const passed = t.status === 'passed';
      const date = t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--';
      const correct = t.correctCount || 0;
      const total = t.totalQuestions || (t.questions ? (typeof t.questions === 'string' ? JSON.parse(t.questions) : t.questions).length : 0);
      const barWidth = Math.min(t.score, 100);

      return `
        <div class="history-row ${passed ? 'pass' : 'fail'}">
          <div class="history-rank">#${i + 1}</div>
          <div class="history-info">
            <div class="history-name">${t.testName || 'Untitled Test'}</div>
            <div class="history-meta">${t.company || ''} • ${date}</div>
          </div>
          <div class="history-progress">
            <div class="history-bar">
              <div class="history-bar-fill" style="width: ${barWidth}%; background: ${passed ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)'};"></div>
            </div>
            <span class="history-fraction">${correct}/${total} correct</span>
          </div>
          <div class="history-score ${passed ? 'pass' : 'fail'}">${Math.round(t.score)}%</div>
          <div class="history-status">
            <span class="status-pill ${passed ? 'pass' : 'fail'}">${passed ? 'Qualified' : 'Not Qualified'}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // ═══════════════ LINE CHART ═══════════════
  renderLineChart(hasData) {
    const ctx = document.getElementById('lineChart')?.getContext('2d');
    if (!ctx) return;

    const tests = this.data.tests;
    const scores = hasData ? tests.map(t => Math.round(t.score)) : [0];
    const labels = hasData ? tests.map((t, i) => t.company ? t.company.substring(0, 8) : `Test ${i + 1}`) : ['--'];

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.01)');

    this.data.charts.line = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Score %',
          data: scores,
          borderColor: '#667eea',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 9,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.8)',
            cornerRadius: 10,
            padding: 14,
            borderColor: 'rgba(102,126,234,0.3)',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: ctx => `Score: ${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { family: 'Inter', size: 11 },
              callback: v => v + '%',
              stepSize: 25
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  },

  // ═══════════════ PIE/DOUGHNUT CHART ═══════════════
  renderPieChart(hasData) {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;

    const tests = this.data.tests;
    const passed = hasData ? tests.filter(t => t.status === 'passed').length : 0;
    const failed = hasData ? tests.length - passed : 0;
    const passRate = hasData && tests.length > 0 ? Math.round((passed / tests.length) * 100) : 0;

    // Update center label
    const centerEl = document.getElementById('donutCenterLabel');
    if (centerEl) {
      centerEl.querySelector('.donut-center-value').textContent = `${passRate}%`;
    }

    this.data.charts.pie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Qualified', 'Not Qualified'],
        datasets: [{
          data: hasData ? [passed, failed] : [0, 1],
          backgroundColor: ['#10b981', 'rgba(239, 68, 68, 0.7)'],
          borderWidth: 0,
          hoverOffset: 8,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.7)',
              font: { family: 'Inter', size: 12 },
              padding: 20,
              usePointStyle: true,
              pointStyleWidth: 10
            }
          },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} test${ctx.parsed !== 1 ? 's' : ''}`
            }
          }
        }
      }
    });
  },

  // ═══════════════ BAR CHART ═══════════════
  renderBarChart(hasData) {
    const ctx = document.getElementById('barChart')?.getContext('2d');
    if (!ctx) return;

    const tests = this.data.tests;
    const labels = hasData ? tests.map(t => (t.company || t.testName || 'Test').substring(0, 10)) : ['--'];
    const scores = hasData ? tests.map(t => Math.round(t.score)) : [0];
    const bgColors = hasData ? tests.map((t, i) => {
      return t.status === 'passed' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.6)';
    }) : ['rgba(255,255,255,0.1)'];
    const borderColors = hasData ? tests.map(t => {
      return t.status === 'passed' ? '#10b981' : '#ef4444';
    }) : ['rgba(255,255,255,0.2)'];

    this.data.charts.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Score %',
          data: scores,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 50
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            cornerRadius: 10,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: ctx => `Score: ${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter', size: 11 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { family: 'Inter', size: 11 },
              callback: v => v + '%',
              stepSize: 25
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => AnalyticsEngine.init());
window.initEnhancedAnalytics = () => AnalyticsEngine.init();
window.AnalyticsEngine = AnalyticsEngine;
