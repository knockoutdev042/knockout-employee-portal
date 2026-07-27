/* ============================================================
   KNOCKOUT AGENCY LLP — Team Portfolio
   app.js: Loads employees.json, builds all UI dynamically
   ============================================================ */

(function () {
  'use strict';

  // --- Config -----------------------------------------------
  const DATA_URL = 'data/employees.json';

  // Department display config: icon + order
  const DEPT_CONFIG = {
    'Manager':               { icon: '⭐', order: 1 },
    'SEO':                   { icon: '🔍', order: 2 },
    'Email Marketing & SFMC':{ icon: '📣', order: 3 },
    'Web Development':       { icon: '💻', order: 4 },
    'UI/UX Design':          { icon: '🎨', order: 5 },
    'Graphic Design':        { icon: '✏️', order: 6 },
    'Customer Service':      { icon: '🎧', order: 7 },
    'Admin & Operations':    { icon: '🗂️', order: 8 },
    'Clerical Admin':        { icon: '📋', order: 9 },
    'Office Help':           { icon: '🏢', order: 10 },
    'HR':                    { icon: '🤝', order: 11 },
    'Salesforce':            { icon: '☁️', order: 12 },
  };

  // Avatar gradients (cycled by index)
  const GRADIENTS = [
    'linear-gradient(135deg,#E63A2E,#ff8a80)',
    'linear-gradient(135deg,#2563EB,#60a5fa)',
    'linear-gradient(135deg,#059669,#34d399)',
    'linear-gradient(135deg,#7C3AED,#a78bfa)',
    'linear-gradient(135deg,#D97706,#fbbf24)',
    'linear-gradient(135deg,#0891B2,#67e8f9)',
    'linear-gradient(135deg,#DB2777,#f9a8d4)',
    'linear-gradient(135deg,#1D4ED8,#93c5fd)',
    'linear-gradient(135deg,#065F46,#6ee7b7)',
  ];

  // --- Utilities --------------------------------------------

  function getGradient(index) {
    return GRADIENTS[index % GRADIENTS.length];
  }

  function getDeptConfig(deptName) {
    return DEPT_CONFIG[deptName] || { icon: '👤', order: 99 };
  }

  // Group employees by department, returning sorted array
  function groupByDept(employees) {
    const map = {};
    employees.forEach(emp => {
      if (!map[emp.department]) map[emp.department] = [];
      map[emp.department].push(emp);
    });
    return Object.entries(map).sort(([a], [b]) => {
      const oa = getDeptConfig(a).order;
      const ob = getDeptConfig(b).order;
      return oa !== ob ? oa - ob : a.localeCompare(b);
    });
  }

  // Convert dept name → DOM-safe id slug
  function deptId(name) {
    return 'dept-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // --- Build Hero Stats -------------------------------------
  function buildHeroStats(employees, depts) {
    const container = document.getElementById('hero-stats');
    if (!container) return;

    const stats = [
      { number: employees.length, label: 'Team Members' },
      { number: depts.length,     label: 'Departments'  },
      {
        number: employees.filter(e => e.shift === 'Day').length,
        label: 'Day Shift'
      },
      {
        number: employees.filter(e => e.shift === 'Night').length,
        label: 'Night Shift'
      },
    ];

    container.innerHTML = stats.map(s => `
      <div class="stat-item">
        <span class="stat-number">${s.number}</span>
        <span class="stat-label">${s.label}</span>
      </div>
    `).join('');
  }

  // --- Build Department Cards -------------------------------
  function buildDeptGrid(depts) {
    const grid = document.getElementById('dept-grid');
    if (!grid) return;

    grid.innerHTML = depts.map(([name, members]) => {
      const cfg = getDeptConfig(name);
      const id  = deptId(name);
      return `
        <a class="dept-card" href="#${id}" aria-label="${name} department, ${members.length} members">
          <div class="dept-icon">${cfg.icon}</div>
          <div>
            <div class="dept-name">${name}</div>
          </div>
          <div>
            <div class="dept-count">${members.length}</div>
            <div class="dept-count-label">${members.length === 1 ? 'member' : 'members'}</div>
          </div>
        </a>
      `;
    }).join('');
  }

  // --- Build Employee Card ----------------------------------
  function buildEmployeeCard(emp, avatarIndex) {
    const gradient = getGradient(avatarIndex);
    const shiftClass = emp.shift === 'Night' ? 'shift-badge--night' : 'shift-badge--day';
    const shiftIcon  = emp.shift === 'Night' ? '🌙' : '☀️';

    // Photo with onerror fallback to avatar
    const photoHtml = `
      <img
        class="employee-photo"
        src="${emp.photo}"
        alt="${emp.name}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <div class="employee-avatar" style="display:none;background:${gradient};">${emp.initials}</div>
    `;

    return `
      <div class="employee-card">
        <div class="employee-photo-wrap">
          ${photoHtml}
        </div>
        <div class="employee-info">
          <div class="employee-name">${emp.name}</div>
          ${emp.role ? `<div class="employee-role">${emp.role}</div>` : ''}
          <span class="shift-badge ${shiftClass}">${shiftIcon} ${emp.shift} Shift</span>
        </div>
      </div>
    `;
  }

  // --- Build Full Team Sections -----------------------------
  function buildTeamSections(depts) {
    const container = document.getElementById('team-sections');
    if (!container) return;

    let avatarCounter = 0;

    container.innerHTML = depts.map(([name, members]) => {
      const id = deptId(name);
      const cfg = getDeptConfig(name);
      const cardsHtml = members.map(emp => {
        const html = buildEmployeeCard(emp, avatarCounter++);
        return html;
      }).join('');

      return `
        <div class="team-department" id="${id}">
          <div class="dept-section-header">
            <span style="font-size:22px;">${cfg.icon}</span>
            <h3>${name}</h3>
            <span class="dept-badge">${members.length}</span>
          </div>
          <div class="employee-grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Footer Year ------------------------------------------
  function setYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // --- Main -------------------------------------------------
  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
      const employees = await res.json();

      const depts = groupByDept(employees);

      buildHeroStats(employees, depts);
      buildDeptGrid(depts);
      buildTeamSections(depts);
      setYear();

    } catch (err) {
      console.error('Knockout Agency — data load error:', err);
      const teamEl = document.getElementById('team-sections');
      if (teamEl) {
        teamEl.innerHTML = `
          <p style="color:#E63A2E;font-weight:600;">
            ⚠️ Could not load team data. Make sure you're serving this site via a local server
            (e.g. <code>npx serve .</code>) rather than opening index.html directly from the file system.
          </p>`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
