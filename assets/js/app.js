/* ============================================================
   KNOCKOUT AGENCY LLP — Team Portfolio
   app.js: Loads employees.json, builds all UI dynamically,
   and drives the details/create/edit/delete modal (backed by
   a Netlify Function that commits to data/employees.json via
   the GitHub API).
   ============================================================ */

(function () {
  'use strict';

  // --- Config -----------------------------------------------
  const DATA_URL = 'data/employees.json';
  const API_URL = '/.netlify/functions/employees';

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

  // Avatar gradients (assigned per-employee via a stable hash of their slug)
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

  // Fields shown in the read-only detail view, in order, when present
  const DETAIL_FIELDS = [
    { key: 'email',     label: 'Email' },
    { key: 'phone',     label: 'Phone' },
    { key: 'location',  label: 'Location' },
    { key: 'joinDate',  label: 'Joined' },
    { key: 'reportsTo', label: 'Reports To' },
    { key: 'bio',       label: 'About' },
  ];

  // --- State --------------------------------------------------
  let employees = [];   // in-memory source of truth, re-rendered on change
  let formMode = null;  // 'create' | 'edit' | null
  let activeSlug = null; // slug currently shown/edited in the modal

  // --- Utilities --------------------------------------------

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function getGradientForSlug(slug) {
    return GRADIENTS[hashStr(slug || '') % GRADIENTS.length];
  }

  function getDeptConfig(deptName) {
    return DEPT_CONFIG[deptName] || { icon: '👤', order: 99 };
  }

  // Group employees by department, returning sorted array
  function groupByDept(list) {
    const map = {};
    list.forEach(emp => {
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

  function findEmployee(slug) {
    return employees.find(e => e.slug === slug) || null;
  }

  // --- Toast --------------------------------------------------
  let toastTimer = null;
  function showToast(message, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast' + (type ? ` toast--${type}` : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
  }

  // --- Build Hero Stats -------------------------------------
  function buildHeroStats(list, depts) {
    const container = document.getElementById('hero-stats');
    if (!container) return;

    const stats = [
      { number: list.length, label: 'Team Members' },
      { number: depts.length, label: 'Departments' },
      { number: list.filter(e => e.shift === 'Day').length, label: 'Day Shift' },
      { number: list.filter(e => e.shift === 'Night').length, label: 'Night Shift' },
    ];

    container.innerHTML = stats.map(s => `
      <div class="stat-item">
        <span class="stat-number">${s.number}</span>
        <span class="stat-label">${s.label}</span>
      </div>
    `).join('');
  }

  // --- Build Department Cards (bento grid) -------------------
  function buildDeptGrid(depts) {
    const grid = document.getElementById('dept-grid');
    if (!grid) return;

    grid.innerHTML = depts.map(([name, members]) => {
      const cfg = getDeptConfig(name);
      const id = deptId(name);
      return `
        <a class="dept-card dept-card--orange" href="#${id}" aria-label="${escapeHtml(name)} department, ${members.length} members">
          <div class="dept-icon">${cfg.icon}</div>
          <div>
            <div class="dept-name">${escapeHtml(name)}</div>
          </div>
          <div>
            <div class="dept-count">${members.length}</div>
            <div class="dept-count-label">${members.length === 1 ? 'member' : 'members'}</div>
          </div>
        </a>
      `;
    }).join('');
  }

  // --- Build Employee Card (photo-banner style) --------------
  function buildEmployeeCard(emp) {
    const gradient = getGradientForSlug(emp.slug);
    const shiftClass = emp.shift === 'Night' ? 'shift-badge--night' : 'shift-badge--day';
    const shiftIcon = emp.shift === 'Night' ? '🌙' : '☀️';

    const photoHtml = `
      <img
        class="employee-photo"
        src="${escapeHtml(emp.photo)}"
        alt="${escapeHtml(emp.name)}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <div class="employee-avatar" style="display:none;background:${gradient};">${escapeHtml(emp.initials)}</div>
    `;

    return `
      <div class="employee-card" data-slug="${escapeHtml(emp.slug)}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="View details for ${escapeHtml(emp.name)}">
        <div class="employee-photo-wrap">
          ${photoHtml}
          <div class="employee-photo-scrim"></div>
          <span class="employee-dept-tag">${escapeHtml(emp.department)}</span>
          <div class="employee-overlay-text">
            <div class="employee-name">${escapeHtml(emp.name)}</div>
            ${emp.role ? `<div class="employee-role">${escapeHtml(emp.role)}</div>` : ''}
          </div>
        </div>
        <div class="employee-info">
          <span class="shift-badge ${shiftClass}">${shiftIcon} ${escapeHtml(emp.shift)} Shift</span>
        </div>
      </div>
    `;
  }

  // --- Build Full Team Sections -----------------------------
  function buildTeamSections(depts) {
    const container = document.getElementById('team-sections');
    if (!container) return;

    container.innerHTML = depts.map(([name, members]) => {
      const id = deptId(name);
      const cfg = getDeptConfig(name);
      const cardsHtml = members.map(emp => buildEmployeeCard(emp)).join('');

      return `
        <div class="team-department" id="${id}">
          <div class="dept-section-header">
            <span style="font-size:22px;">${cfg.icon}</span>
            <h3>${escapeHtml(name)}</h3>
            <span class="dept-badge">${members.length}</span>
          </div>
          <div class="employee-grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // Populate the <datalist> of known departments for the form
  function buildDeptDatalist() {
    const list = document.getElementById('dept-list');
    if (!list) return;
    const names = Array.from(new Set(employees.map(e => e.department))).sort();
    list.innerHTML = names.map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
  }

  // --- Render everything from current `employees` state -------
  function renderAll() {
    const depts = groupByDept(employees);
    buildHeroStats(employees, depts);
    buildDeptGrid(depts);
    buildTeamSections(depts);
    buildDeptDatalist();
  }

  // --- Footer Year ------------------------------------------
  function setYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // ============================================================
  // MODAL: view / create / edit
  // ============================================================
  const overlay = () => document.getElementById('modal-overlay');
  const viewEl = () => document.getElementById('modal-view');
  const formEl = () => document.getElementById('modal-form');
  const confirmDeleteEl = () => document.getElementById('modal-confirm-delete');

  function openModal() {
    const ov = overlay();
    if (!ov) return;
    ov.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const ov = overlay();
    if (!ov) return;
    ov.hidden = true;
    document.body.style.overflow = '';
    formMode = null;
    activeSlug = null;
    const err = document.getElementById('form-error');
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  function openViewModal(slug) {
    const emp = findEmployee(slug);
    if (!emp) return;
    activeSlug = slug;
    formMode = null;

    document.getElementById('modal-title').textContent = emp.name;
    document.getElementById('modal-role').textContent = emp.role || '';
    document.getElementById('modal-dept-badge').textContent = emp.department;

    const shiftBadge = document.getElementById('modal-shift-badge');
    shiftBadge.textContent = `${emp.shift === 'Night' ? '🌙' : '☀️'} ${emp.shift} Shift`;
    shiftBadge.className = 'shift-badge ' + (emp.shift === 'Night' ? 'shift-badge--night' : 'shift-badge--day');

    const avatarWrap = document.getElementById('modal-avatar-wrap');
    const gradient = getGradientForSlug(emp.slug);
    avatarWrap.innerHTML = `
      <img src="${escapeHtml(emp.photo)}" alt="${escapeHtml(emp.name)}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="employee-avatar" style="display:none;background:${gradient};">${escapeHtml(emp.initials)}</div>
    `;

    const detailsEl = document.getElementById('modal-details');
    const rows = DETAIL_FIELDS
      .filter(f => emp[f.key])
      .map(f => `
        <div class="detail-row${f.key === 'bio' ? ' detail-row--full' : ''}">
          <dt>${f.label}</dt>
          <dd>${escapeHtml(emp[f.key])}</dd>
        </div>
      `).join('');
    detailsEl.innerHTML = rows;

    viewEl().hidden = false;
    formEl().hidden = true;
    confirmDeleteEl().hidden = true;
    openModal();
  }

  function openFormModal(slug) {
    formMode = slug ? 'edit' : 'create';
    activeSlug = slug || null;
    const emp = slug ? findEmployee(slug) : null;

    document.getElementById('form-title').textContent = emp ? `Edit ${emp.name}` : 'Add Employee';
    const form = formEl();
    form.reset();
    const err = document.getElementById('form-error');
    err.hidden = true;
    err.textContent = '';

    if (emp) {
      form.elements.name.value = emp.name || '';
      form.elements.role.value = emp.role || '';
      form.elements.department.value = emp.department || '';
      form.elements.photo.value = emp.photo || '';
      form.elements.shift.value = emp.shift === 'Night' ? 'Night' : 'Day';
      form.elements.email.value = emp.email || '';
      form.elements.phone.value = emp.phone || '';
      form.elements.location.value = emp.location || '';
      form.elements.joinDate.value = emp.joinDate || '';
      form.elements.reportsTo.value = emp.reportsTo || '';
      form.elements.bio.value = emp.bio || '';
    }

    viewEl().hidden = true;
    form.hidden = false;
    confirmDeleteEl().hidden = true;
    openModal();
    form.elements.name.focus();
  }

  function readFormData() {
    const form = formEl();
    const fd = new FormData(form);
    const data = {};
    fd.forEach((value, key) => { data[key] = String(value).trim(); });
    return data;
  }

  async function apiRequest(method, { slug, body } = {}) {
    const url = slug ? `${API_URL}?slug=${encodeURIComponent(slug)}` : API_URL;
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let payload = null;
    try { payload = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const message = (payload && payload.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return payload;
  }

  async function handleFormSubmit(evt) {
    evt.preventDefault();
    const form = formEl();
    const errEl = document.getElementById('form-error');
    const submitBtn = document.getElementById('form-submit-btn');
    const submitLabel = document.getElementById('form-submit-label');

    if (!form.reportValidity()) return;

    const data = readFormData();
    submitBtn.disabled = true;
    submitLabel.textContent = 'Saving…';
    errEl.hidden = true;

    try {
      if (formMode === 'create') {
        const created = await apiRequest('POST', { body: data });
        employees.push(created);
        showToast(`${created.name} added. Live for everyone after the site redeploys (~30–60s).`, 'success');
      } else if (formMode === 'edit' && activeSlug) {
        const updated = await apiRequest('PUT', { slug: activeSlug, body: data });
        const idx = employees.findIndex(e => e.slug === activeSlug);
        if (idx !== -1) employees[idx] = updated;
        showToast(`${updated.name} updated. Live for everyone after the site redeploys (~30–60s).`, 'success');
      }
      renderAll();
      closeModal();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = 'Save';
    }
  }

  // --- Delete confirmation panel -------------------------------
  function openConfirmDeleteModal(slug) {
    const emp = findEmployee(slug);
    if (!emp) return;
    activeSlug = slug;
    formMode = null;

    document.getElementById('confirm-delete-name-inline').textContent = emp.name;
    document.getElementById('confirm-delete-name').textContent = emp.name;
    document.getElementById('confirm-delete-role').textContent = emp.role || emp.department;
    document.getElementById('confirm-delete-dept').textContent = emp.department;

    const gradient = getGradientForSlug(emp.slug);
    document.getElementById('confirm-delete-avatar').innerHTML = `
      <img src="${escapeHtml(emp.photo)}" alt="${escapeHtml(emp.name)}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="employee-avatar" style="display:none;background:${gradient};font-size:16px;">${escapeHtml(emp.initials)}</div>
    `;

    viewEl().hidden = true;
    formEl().hidden = true;
    confirmDeleteEl().hidden = false;
    openModal();
  }

  async function handleConfirmedDelete() {
    const emp = findEmployee(activeSlug);
    if (!emp) return;

    const deleteBtn = document.getElementById('confirm-delete-confirm-btn');
    const deleteLabel = document.getElementById('confirm-delete-label');
    deleteBtn.disabled = true;
    deleteLabel.textContent = 'Deleting…';

    try {
      await apiRequest('DELETE', { slug: emp.slug });
      employees = employees.filter(e => e.slug !== emp.slug);
      renderAll();
      closeModal();
      showToast(`${emp.name} removed. Live for everyone after the site redeploys (~30–60s).`, 'success');
    } catch (err) {
      showToast(`Could not delete: ${err.message}`, 'error');
    } finally {
      deleteBtn.disabled = false;
      deleteLabel.textContent = 'Delete';
    }
  }

  // --- Wire up modal-related events ---------------------------
  function bindModalEvents() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('form-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-edit-btn').addEventListener('click', () => openFormModal(activeSlug));
    document.getElementById('modal-delete-btn').addEventListener('click', () => openConfirmDeleteModal(activeSlug));
    document.getElementById('confirm-delete-cancel-btn').addEventListener('click', () => openViewModal(activeSlug));
    document.getElementById('confirm-delete-confirm-btn').addEventListener('click', handleConfirmedDelete);
    document.getElementById('modal-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('add-employee-btn').addEventListener('click', () => openFormModal(null));

    overlay().addEventListener('click', (e) => {
      if (e.target === overlay()) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay().hidden) closeModal();
    });

    // Event delegation for clicking/keyboard-activating employee cards
    document.getElementById('team-sections').addEventListener('click', (e) => {
      const card = e.target.closest('.employee-card');
      if (card) openViewModal(card.dataset.slug);
    });
    document.getElementById('team-sections').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.employee-card');
      if (card) {
        e.preventDefault();
        openViewModal(card.dataset.slug);
      }
    });
  }

  // --- Main -------------------------------------------------
  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
      employees = await res.json();

      renderAll();
      bindModalEvents();
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
