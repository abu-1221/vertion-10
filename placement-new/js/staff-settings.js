// ============================================================
//  Staff Dashboard — General Settings (Per-User Preferences)
//  Stores in localStorage keyed by staff username
// ============================================================

(function () {
  'use strict';

  const DEFAULTS = {
    theme: 'dark',
    fontFamily: 'Inter',
    fontSize: 'medium',
    uiStyle: 'comfortable',
    notifications: {
      dashboard: true,
      sound: false,
      popup: true
    }
  };

  const FONT_MAP = {
    'Inter': "'Inter', sans-serif",
    'Roboto': "'Roboto', sans-serif",
    'Space Grotesk': "'Space Grotesk', sans-serif",
    'Montserrat': "'Montserrat', sans-serif",
    'Poppins': "'Poppins', sans-serif",
    'Fira Code': "'Fira Code', monospace"
  };

  const FONT_SIZE_MAP = {
    small: '81.25%',
    medium: '87.5%',
    large: '100%'
  };

  // ─── Helpers ──────────────────────────────────────────────
  function getUsername() {
    try {
      const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      return u.username || null;
    } catch { return null; }
  }

  function storageKey() {
    const u = getUsername();
    return u ? `staff_settings_${u}` : null;
  }

  function loadSettings() {
    const key = storageKey();
    if (!key) return JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const saved = JSON.parse(raw);
      // Merge with defaults so new keys are always present
      return {
        ...JSON.parse(JSON.stringify(DEFAULTS)),
        ...saved,
        notifications: { ...DEFAULTS.notifications, ...(saved.notifications || {}) }
      };
    } catch { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }

  function saveSettings(settings) {
    const key = storageKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  // ─── Apply Settings to DOM ────────────────────────────────
  function applySettings(settings) {
    applyTheme(settings.theme);
    applyFont(settings.fontFamily, settings.fontSize);
    applyUiStyle(settings.uiStyle);
  }

  // ─── Theme ────────────────────────────────────────────────
  function applyTheme(theme) {
    let resolvedTheme = theme;
    if (theme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);

    // Inject / update override stylesheet
    let style = document.getElementById('settings-theme-override');
    if (!style) {
      style = document.createElement('style');
      style.id = 'settings-theme-override';
      document.head.appendChild(style);
    }

    if (resolvedTheme === 'light') {
      /* 10/30/60 Rule: 60% #f0f2f5/#fff | 30% #1e293b/#334155 | 10% #6366f1 */
      style.textContent = `
        :root[data-theme="light"] {
          --bg-main: #f0f2f5; --bg-surface: #ffffff; --bg-card: #ffffff;
          --bg-header: #ffffff; --bg-sidebar: #f8fafc;
          --text-main: #000000; --text-muted: #000000; --text-dim: #1a1a1a;
          --border-main: #e2e8f0; --border-light: #f1f5f9;
          --glass-bg: rgba(0,0,0,0.02); --glass-border: #e2e8f0;
          --gray-300: #333333; --gray-400: #1a1a1a; --gray-500: #000000;
          --shadow-lg: 0 10px 25px rgba(0,0,0,0.06);
        }
        [data-theme="light"] body { color: #000; background: #f0f2f5; }
        [data-theme="light"] h1,[data-theme="light"] h2,[data-theme="light"] h3,[data-theme="light"] h4,[data-theme="light"] h5 { color: #000 !important; }
        [data-theme="light"] p { color: #000; }
        [data-theme="light"] span { color: #000; }
        [data-theme="light"] label { color: #000; }
        [data-theme="light"] .sidebar { background: #fff; border-color: #e2e8f0; box-shadow: 2px 0 8px rgba(0,0,0,0.04); }
        [data-theme="light"] .nav-item span { color: #000 !important; }
        [data-theme="light"] .nav-item svg { stroke: #1a1a1a !important; }
        [data-theme="light"] .nav-item:hover { background: #f1f5f9 !important; }
        [data-theme="light"] .nav-item.active { background: rgba(99,102,241,0.1) !important; }
        [data-theme="light"] .nav-item.active span { color: #4f46e5 !important; }
        [data-theme="light"] .nav-item.active svg { stroke: #4f46e5 !important; }
        [data-theme="light"] .logo-text { color: #000 !important; }
        [data-theme="light"] .sidebar-toggle-btn { background: #f1f5f9; border-color: #e2e8f0; }
        [data-theme="light"] .logout-btn { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; }
        [data-theme="light"] .logout-btn span { color: #dc2626 !important; }
        [data-theme="light"] .logout-btn svg { stroke: #dc2626 !important; }
        [data-theme="light"] .dashboard-header { background: #fff; border-color: #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        [data-theme="light"] .header-left h1 { color: #000 !important; }
        [data-theme="light"] .user-name { color: #000 !important; }
        [data-theme="light"] .form-input { background: #f8fafc !important; color: #000 !important; border-color: #cbd5e1 !important; }
        [data-theme="light"] .form-input::placeholder { color: #000 !important; opacity: 0.6 !important; }
        [data-theme="light"] .form-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
        [data-theme="light"] .form-label { color: #000 !important; font-weight: 600; }
        [data-theme="light"] select.form-input { background-color: #f8fafc !important; }
        [data-theme="light"] select.form-input option { background: #fff; color: #000; }
        [data-theme="light"] textarea.form-input { background: #f8fafc !important; color: #000 !important; }
        [data-theme="light"] .form-card { background: #fff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        [data-theme="light"] .section-intro h2 { color: #000 !important; }
        [data-theme="light"] .section-intro p { color: #000 !important; }
        [data-theme="light"] .stat-card { background: #fff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        [data-theme="light"] .stat-value { color: #000 !important; }
        [data-theme="light"] .stat-label { color: #000 !important; }
        [data-theme="light"] .tests-table-container { border-color: #e2e8f0 !important; background: #fff; }
        [data-theme="light"] .data-table th { background: #f1f5f9 !important; color: #000 !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .data-table td { color: #000 !important; border-color: #f1f5f9 !important; }
        [data-theme="light"] .data-table tr:hover td { background: #f8fafc; }
        [data-theme="light"] .profile-card-premium { background: #fff !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .profile-username-main { color: #000 !important; }
        [data-theme="light"] .profile-h1 { color: #000 !important; }
        [data-theme="light"] .profile-info-item span { color: #000 !important; }
        [data-theme="light"] .dashboard-content { background: #f0f2f5; }
        [data-theme="light"] .content-section { color: #000; }
        [data-theme="light"] .btn-secondary { background: #f1f5f9 !important; color: #000 !important; border-color: #cbd5e1 !important; }
        [data-theme="light"] .btn-ghost { color: #000 !important; }
        [data-theme="light"] .btn-ghost:hover { background: #f1f5f9 !important; color: #000 !important; }
        [data-theme="light"] .scroll-btn { color: #000 !important; border-color: #e2e8f0 !important; background: #fff !important; }
        [data-theme="light"] .zoom-controls { border-color: #e2e8f0 !important; background: #fff !important; }
        [data-theme="light"] .btn-zoom { color: #000 !important; }
        [data-theme="light"] .settings-card { background: #fff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        [data-theme="light"] .settings-card h3 { color: #000 !important; }
        [data-theme="light"] .settings-card p { color: #000 !important; }
        [data-theme="light"] .settings-option-card { background: #f8fafc !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .settings-option-card:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
        [data-theme="light"] .settings-option-card.selected { border-color: #6366f1 !important; background: rgba(99,102,241,0.06) !important; }
        [data-theme="light"] .settings-option-card .option-title { color: #000 !important; }
        [data-theme="light"] .settings-option-card .option-desc { color: #000 !important; }
        [data-theme="light"] .settings-toggle-track { background: #cbd5e1 !important; }
        [data-theme="light"] .notif-setting-label { color: #000 !important; }
        [data-theme="light"] .notif-setting-desc { color: #000 !important; }
        [data-theme="light"] .notif-setting-row { border-color: #f1f5f9 !important; }
        [data-theme="light"] .font-size-btn { background: #f1f5f9 !important; color: #000 !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .font-size-btn.active { background: linear-gradient(135deg, #6366f1, #4f46e5) !important; color: #fff !important; }
        [data-theme="light"] .font-size-group { border-color: #e2e8f0 !important; }
        [data-theme="light"] .font-preview-strip { background: #f8fafc !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .font-preview-text { color: #000 !important; }
        [data-theme="light"] .settings-actions { border-color: #e2e8f0 !important; }
        [data-theme="light"] .settings-reset-btn { color: #000 !important; border-color: #e2e8f0 !important; background: #fff !important; }
        [data-theme="light"] .settings-reset-btn:hover { color: #dc2626 !important; border-color: #fecaca !important; background: #fef2f2 !important; }
        [data-theme="light"] .glass-panel { background: #fff !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .upload-zone { background: #f8fafc !important; border-color: #cbd5e1 !important; }
        [data-theme="light"] .upload-zone p { color: #000 !important; }
        [data-theme="light"] .app-layout { background: #f0f2f5; }
      `;
    } else {
      style.textContent = '';
    }

    // Listen for system changes
    if (theme === 'system') {
      window.__settingsSystemListener = window.__settingsSystemListener || ((e) => {
        const current = loadSettings();
        if (current.theme === 'system') applyTheme('system');
      });
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', window.__settingsSystemListener);
    }
  }

  // ─── Font ─────────────────────────────────────────────────
  function applyFont(family, size) {
    const css = FONT_MAP[family] || FONT_MAP['Inter'];
    document.documentElement.style.setProperty('--font-primary', css);
    document.body.style.fontFamily = css;

    const fsVal = FONT_SIZE_MAP[size] || FONT_SIZE_MAP['medium'];
    document.documentElement.style.fontSize = fsVal;

    // Load Google Font if not already loaded
    if (family && family !== 'Inter') {
      const fontId = 'settings-font-' + family.replace(/\s+/g, '-');
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    }
  }

  // ─── UI Style ─────────────────────────────────────────────
  function applyUiStyle(style) {
    const app = document.querySelector('.app-layout');
    if (!app) return;
    app.removeAttribute('data-ui-style');
    app.setAttribute('data-ui-style', style);

    // Inject style overrides
    let el = document.getElementById('settings-ui-style-override');
    if (!el) {
      el = document.createElement('style');
      el.id = 'settings-ui-style-override';
      document.head.appendChild(el);
    }

    if (style === 'compact') {
      el.textContent = `
        [data-ui-style="compact"] .dashboard-content { padding: 1rem 1.5rem; }
        [data-ui-style="compact"] .section-intro { margin-bottom: 1.5rem; }
        [data-ui-style="compact"] .section-intro h2 { font-size: 1.5rem; }
        [data-ui-style="compact"] .stat-card { padding: 0.875rem; gap: 0.75rem; }
        [data-ui-style="compact"] .stat-value { font-size: 1.4rem; }
        [data-ui-style="compact"] .form-card { padding: 1.25rem; margin-bottom: 1rem; }
        [data-ui-style="compact"] .stats-grid { gap: 0.75rem; margin-bottom: 1.5rem; }
        [data-ui-style="compact"] .settings-grid { gap: 1rem; }
        [data-ui-style="compact"] .settings-card { padding: 1.25rem; }
        [data-ui-style="compact"] .profile-card-premium { padding: 2rem 2rem 1.5rem; }
      `;
    } else if (style === 'modern') {
      el.textContent = `
        [data-ui-style="modern"] .dashboard-content { padding: 2.5rem 3rem; }
        [data-ui-style="modern"] .section-intro { margin-bottom: 4rem; }
        [data-ui-style="modern"] .section-intro h2 { font-size: 2.75rem; }
        [data-ui-style="modern"] .stat-card { padding: 2rem; gap: 1.5rem; border-radius: 1.5rem; }
        [data-ui-style="modern"] .stat-value { font-size: 2.25rem; }
        [data-ui-style="modern"] .form-card { padding: 2.5rem; border-radius: 1.5rem; margin-bottom: 2rem; }
        [data-ui-style="modern"] .stats-grid { gap: 1.5rem; margin-bottom: 3rem; }
        [data-ui-style="modern"] .settings-grid { gap: 2rem; }
        [data-ui-style="modern"] .settings-card { padding: 2.5rem; border-radius: 1.75rem; }
        [data-ui-style="modern"] .nav-item { padding: 1rem 1.25rem; font-size: 1rem; border-radius: 14px; }
        [data-ui-style="modern"] .profile-card-premium { padding: 4rem 4rem 3.5rem; border-radius: 2rem; }
      `;
    } else {
      el.textContent = '';
    }
  }

  // ─── UI Bindings ──────────────────────────────────────────
  function initSettingsUI() {
    const settings = loadSettings();

    // Populate form state
    setActiveOption('theme', settings.theme);
    setActiveOption('uiStyle', settings.uiStyle);
    setFontDropdown(settings.fontFamily);
    setFontSizeButtons(settings.fontSize);
    setToggle('notifDashboard', settings.notifications.dashboard);
    setToggle('notifSound', settings.notifications.sound);
    setToggle('notifPopup', settings.notifications.popup);
    updateFontPreview(settings.fontFamily, settings.fontSize);

    // Theme cards
    document.querySelectorAll('.settings-option-card[data-theme-value]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.settings-option-card[data-theme-value]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // UI Style cards
    document.querySelectorAll('.settings-option-card[data-style-value]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.settings-option-card[data-style-value]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // Font dropdown
    const fontSelect = document.getElementById('settingsFontFamily');
    if (fontSelect) {
      fontSelect.addEventListener('change', () => {
        const current = getFormValues();
        updateFontPreview(current.fontFamily, current.fontSize);
      });
    }

    // Font size buttons
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const current = getFormValues();
        updateFontPreview(current.fontFamily, current.fontSize);
      });
    });

    // Buttons
    document.getElementById('settingsSaveBtn')?.addEventListener('click', handleSave);
    document.getElementById('settingsApplyBtn')?.addEventListener('click', handleApply);
    document.getElementById('settingsResetBtn')?.addEventListener('click', handleReset);
  }

  function getFormValues() {
    const themeCard = document.querySelector('.settings-option-card[data-theme-value].selected');
    const styleCard = document.querySelector('.settings-option-card[data-style-value].selected');
    const fontSelect = document.getElementById('settingsFontFamily');
    const fontSizeBtn = document.querySelector('.font-size-btn.active');

    return {
      theme: themeCard?.dataset.themeValue || 'dark',
      fontFamily: fontSelect?.value || 'Inter',
      fontSize: fontSizeBtn?.dataset.size || 'medium',
      uiStyle: styleCard?.dataset.styleValue || 'comfortable',
      notifications: {
        dashboard: document.getElementById('notifDashboard')?.checked ?? true,
        sound: document.getElementById('notifSound')?.checked ?? false,
        popup: document.getElementById('notifPopup')?.checked ?? true
      }
    };
  }

  function handleSave() {
    const values = getFormValues();
    saveSettings(values);
    applySettings(values);
    showSettingsToast('Settings saved successfully!', 'success');
  }

  function handleApply() {
    const values = getFormValues();
    applySettings(values);
    showSettingsToast('Settings applied (not saved yet)', 'info');
  }

  function handleReset() {
    const defaults = JSON.parse(JSON.stringify(DEFAULTS));
    const key = storageKey();
    if (key) localStorage.removeItem(key);
    applySettings(defaults);

    // Reset UI form
    setActiveOption('theme', defaults.theme);
    setActiveOption('uiStyle', defaults.uiStyle);
    setFontDropdown(defaults.fontFamily);
    setFontSizeButtons(defaults.fontSize);
    setToggle('notifDashboard', defaults.notifications.dashboard);
    setToggle('notifSound', defaults.notifications.sound);
    setToggle('notifPopup', defaults.notifications.popup);
    updateFontPreview(defaults.fontFamily, defaults.fontSize);
    showSettingsToast('Settings reset to defaults', 'info');
  }

  // ─── UI Helpers ───────────────────────────────────────────
  function setActiveOption(group, value) {
    if (group === 'theme') {
      document.querySelectorAll('.settings-option-card[data-theme-value]').forEach(c => {
        c.classList.toggle('selected', c.dataset.themeValue === value);
      });
    } else if (group === 'uiStyle') {
      document.querySelectorAll('.settings-option-card[data-style-value]').forEach(c => {
        c.classList.toggle('selected', c.dataset.styleValue === value);
      });
    }
  }

  function setFontDropdown(family) {
    const select = document.getElementById('settingsFontFamily');
    if (select) select.value = family;
  }

  function setFontSizeButtons(size) {
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
  }

  function setToggle(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  }

  function updateFontPreview(family, size) {
    const preview = document.getElementById('fontPreviewText');
    if (!preview) return;
    const css = FONT_MAP[family] || FONT_MAP['Inter'];
    const sizeMap = { small: '0.85rem', medium: '1rem', large: '1.15rem' };
    preview.style.fontFamily = css;
    preview.style.fontSize = sizeMap[size] || '1rem';
    preview.textContent = `The quick brown fox jumps over the lazy dog — ${family} (${size})`;
  }

  function showSettingsToast(message, type) {
    // If showNotification from the existing codebase exists, use it
    if (typeof window.showNotification === 'function') {
      window.showNotification('Settings', message, type === 'success' ? 'success' : 'info');
      return;
    }
    // Fallback inline toast
    const toast = document.createElement('div');
    toast.className = 'settings-toast';
    toast.style.cssText = `
      position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
      padding: 1rem 1.75rem; border-radius: 12px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)'};
      color: #fff; font-weight: 600; font-size: 0.95rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.35);
      animation: settingsToastIn 0.35s ease-out;
      display: flex; align-items: center; gap: 10px;
    `;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;flex-shrink:0;">
        ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
      </svg>
      ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ─── Init on DOMContentLoaded ─────────────────────────────
  function earlyApply() {
    const settings = loadSettings();
    applySettings(settings);
  }

  // Apply as early as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      earlyApply();
      initSettingsUI();
    });
  } else {
    earlyApply();
    initSettingsUI();
  }

  // Expose for external use
  window.StaffSettings = { load: loadSettings, save: saveSettings, apply: applySettings, init: initSettingsUI };
})();
