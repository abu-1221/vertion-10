// Dashboard JavaScript
// Shared logic for both Student and Staff dashboards

// ===== PERFORMANCE: Global Debounce Utility =====
// Used by search handlers, scroll listeners, and resize events
// to reduce unnecessary function calls on mobile
window.debounce = function(fn, delay = 150) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// ===== PERFORMANCE: Passive event listeners for scroll/touch =====
// Boost scrolling performance on mobile by marking wheel/touch events passive
document.addEventListener('DOMContentLoaded', () => {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.addEventListener('wheel', () => {}, { passive: true });
    mainContent.addEventListener('touchstart', () => {}, { passive: true });
    mainContent.addEventListener('touchmove', () => {}, { passive: true });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  initSidebar();
  initNavigation();
  initLogout();
  initUserInfo();

  // Feature-specific initializations
  // We strictly check user type to prevent errors on the wrong dashboard
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  if (user.type === "student") {
    initAvailabilityToggle();
    initSalaryRange();
    initCharts();
    loadAvailableTests();  // Initial load of tests
    loadCompletedTests();
    checkIncompleteTests();
    // Initialize analytics before loading tests
    if (typeof initEnhancedAnalytics === "function") {
      setTimeout(initEnhancedAnalytics, 100);
    }
    initRealtimeUpdates(); // Start listening for new tests
  }
  // Staff logic is handled in staff-dashboard.js,
  // but dashboard.js provides the shared shell (sidebar, auth, etc)
});

// Check if user is authenticated — blocks access after logout
function checkAuth() {
  const user = sessionStorage.getItem("user") || localStorage.getItem("user");
  const isStudentPage = window.location.pathname.includes("student-dashboard");
  const isStaffPage = window.location.pathname.includes("staff-dashboard");

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const userData = JSON.parse(user);
    if (isStudentPage && userData.type !== "student") {
      window.location.replace("staff-dashboard.html");
    } else if (isStaffPage && userData.type !== "staff") {
      window.location.replace("student-dashboard.html");
    }
  } catch (e) {
    console.error("Session parse error:", e);
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    window.location.replace("login.html");
  }

  // Prevent back-button re-entry after logout
  window.addEventListener("popstate", () => {
    const stillLoggedIn = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!stillLoggedIn) {
      window.location.replace("login.html");
    }
  });
}

// Initialize sidebar toggle for mobile and desktop collapse
function initSidebar() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebarLogoBottom = document.getElementById('sidebarLogoBottom'); // New element

  // Mobile Toggle
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      const isActive = sidebar.classList.toggle("active");
      menuToggle.classList.toggle("active", isActive);
      if (overlay) overlay.classList.toggle("active", isActive);
    });

    if (overlay) {
      overlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        menuToggle.classList.remove("active");
        overlay.classList.remove("active");
      });
    }
  }

  const sidebarLogoTop = document.getElementById('sidebarLogoTop'); // Correct element

  // Desktop Collapse Toggle (Button & Logo)
  const toggleSidebar = () => {
    const isCollapsed = sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-minimized");
    localStorage.setItem("sidebarCollapsed", isCollapsed);
  };

  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
  }

  if (sidebarLogoTop && sidebar) {
    sidebarLogoTop.addEventListener("click", toggleSidebar);
  }

  // Restore state from localStorage
  if (localStorage.getItem("sidebarCollapsed") === "true") {
    sidebar.classList.add("collapsed");
    document.body.classList.add("sidebar-minimized");
  }
}

// Initialize navigation between sections
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item:not(.ai-buddy-btn)");
  const sectionTitle = document.getElementById("sectionTitle");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Show corresponding section
      const sectionId = item.dataset.section + "-section";
      document.querySelectorAll(".content-section").forEach((section) => {
        section.classList.remove("active");
      });
      document.getElementById(sectionId)?.classList.add("active");

      // Update title
      if (sectionTitle) {
        sectionTitle.textContent = item.querySelector("span").textContent;
      }

      // Close mobile sidebar
      document.getElementById("sidebar")?.classList.remove("active");
      document.getElementById("menuToggle")?.classList.remove("active");
      document.getElementById("sidebarOverlay")?.classList.remove("active");

      // Reinitialize charts for analytics section (Student only)
      if (item.dataset.section === "analytics") {
        if (window.AnalyticsEngine) {
          window.AnalyticsEngine.init();
        }
      }

      // Reload tests for availability section
      if (item.dataset.section === "availability") {
        loadAvailableTests();
      }

      // Reload completed tests for tests section
      if (item.dataset.section === "tests") {
        loadCompletedTests();
      }

      // Reload certification history
      if (item.dataset.section === "certification") {
        loadCertificationHistory();
      }

      // Reload performance data if reports section
      if (item.dataset.section === "reports") {
        // We can pre-load or just rely on the onclick
      }

      // Staff: Reload manage tests
      if (item.dataset.section === "manage-tests" && typeof loadTests === 'function') {
        loadTests();
      }


    });
  });
}

// ===== PROFESSIONAL LOGOUT SYSTEM =====
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  // Inject logout modal into DOM (once)
  if (!document.getElementById("logoutModal")) {
    const modalEl = document.createElement("div");
    modalEl.id = "logoutModal";
    modalEl.className = "logout-modal-overlay";
    modalEl.innerHTML = `
      <div class="logout-modal">
        <div class="logout-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <h3 class="logout-modal-title">Confirm Logout</h3>
        <p class="logout-modal-text">Are you sure you want to log out of JMC TEST? Your current session will be ended.</p>
        <div class="logout-modal-actions">
          <button type="button" class="logout-modal-btn cancel" id="logoutCancelBtn">Cancel</button>
          <button type="button" class="logout-modal-btn confirm" id="logoutConfirmBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>

        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  const modal = document.getElementById("logoutModal");
  const cancelBtn = document.getElementById("logoutCancelBtn");
  const confirmBtn = document.getElementById("logoutConfirmBtn");

  // Open modal
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    modal.classList.add("active");
  });

  // Cancel
  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  // Click overlay to cancel
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      modal.classList.remove("active");
    }
  });

  // Confirm logout
  confirmBtn.addEventListener("click", () => {
    performLogout();
  });
}
function performLogout() {
  const confirmBtn = document.getElementById("logoutConfirmBtn");
  // Immediate logout as requested by user for speed
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span class="spinner-sm"></span><span>Logging out...</span>`;
  }

  // 1. Clear ALL session data
  sessionStorage.clear();
  localStorage.removeItem("user");
  localStorage.removeItem("token");

  // 2. Clear cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  // 3. Replace history to prevent back-button re-entry
  window.history.replaceState(null, "", "index.html");

  // 4. Set flag for logout awareness (optional)
  sessionStorage.setItem("loggedOut", "true");

  // 5. Redirect to Landing Page (original theme)
  window.location.href = "index.html";
}



// Real-time Event Listener for Students
function initRealtimeUpdates() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (user.type !== 'student') return;

  console.log("[Realtime] Fetching current tests and subscribing to updates...");

  // Initial load
  if (typeof loadAvailableTests === 'function') {
    loadAvailableTests();
  }

  // SSE connection to the backend
  const apiBase = window.DB?.API_URL || "/api";
  const eventSource = new EventSource(`${apiBase}/realtime/updates`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("[Realtime] Received event:", data);

      if (data.type === 'test_published') {
        // Automatically refresh available tests list — silently, no notification
        if (typeof loadAvailableTests === 'function') {
          loadAvailableTests();
        }
      }
    } catch (err) {
      console.error("[Realtime] Error processing event:", err);
    }
  };

  eventSource.onerror = (err) => {
    console.warn("[Realtime] EventSource connection issue. Standard browser reconnect will follow.");
  };
}

function showRealtimeNotification(data) {
  // Check for existing notification
  if (document.querySelector('.realtime-notification')) return;

  const notification = document.createElement("div");
  notification.className = "realtime-notification bounce-in";
  notification.innerHTML = `
    <div class="notif-content">
      <div class="notif-icon">${data.icon || '🔥'}</div>
      <div class="notif-info">
        <span class="notif-title">${data.title || 'New Test Published!'}</span>
        <span class="notif-desc">${data.message || `${data.testName} (${data.company})`}</span>
      </div>
    </div>
    <button class="notif-close">&times;</button>
  `;

  document.body.appendChild(notification);

  // Auto remove
  const timer = setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  }, 6000);

  notification.querySelector(".notif-close").onclick = () => {
    clearTimeout(timer);
    notification.remove();
  };
}

// Display user info
function initUserInfo() {
  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = JSON.parse(userStr || "{}");
  const userAvatar = document.getElementById("userAvatar");
  const userNameEl = document.getElementById("userName");

  if (user) {
    // Header Info (Username Only as requested)
    if (userNameEl) userNameEl.textContent = user.username || "User";

    const initials = (user.name || user.username || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    if (userAvatar) userAvatar.textContent = initials.substring(0, 2);

    // Profile Section Info
    const profHeaderName = document.getElementById("profileHeaderName");
    const profAvatar = document.getElementById("profileAvatarLarge");
    const profUsername = document.getElementById("profileUsername");
    const profFullName = document.getElementById("profileFullName");
    const profRegNo = document.getElementById("profileRegNo");
    const profStaffRole = document.getElementById("profileStaffRole");
    const profStaffDeptFull = document.getElementById("profileStaffDeptFull");
    const profDeptGrid = document.getElementById("profileDeptGrid");
    const profEmail = document.getElementById("profileEmail");
    const profJoined = document.getElementById("profileJoined");

    // Student Specific Fields
    const profYear = document.getElementById("profileYear");
    const profSection = document.getElementById("profileSection");
    const profBatch = document.getElementById("profileBatch");
    const profStream = document.getElementById("profileStream");

    // profHeaderName removed to avoid redundant headings as per requirements
    if (profAvatar) profAvatar.textContent = initials.substring(0, 2);
    if (profUsername) profUsername.textContent = user.name || user.username;
    if (profFullName) profFullName.textContent = user.name || user.username;
    
    // Strict Data Integrity: Always display the raw, user-entered email exactly as it is 
    // without any automated domain modification or appending.
    if (profEmail) profEmail.textContent = user.email || '---';

    // Register Date (Joined)
    if (profJoined) {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        profJoined.textContent = date.toLocaleDateString('en-US', options);
      } else {
        profJoined.textContent = "Jan 2024";
      }
    }

    if (profRegNo) {
      const regNo = user.details?.registerNumber || user.details?.staffCode || user.username || '---';
      profRegNo.textContent = regNo;
    }

    // Populate Fields based on User Type — strict raw data as requested
    if (user.type === 'student' && user.details) {
      if (profYear) profYear.textContent = user.details.year || '---';
      if (profSection) profSection.textContent = user.details.section || '---';
      if (profBatch) profBatch.textContent = user.details.batch || '---';
      if (profStream) profStream.textContent = user.details.streamType || '---';
      if (profDeptGrid) profDeptGrid.textContent = user.details.department || '---';
    } else if (user.type === 'staff' && user.details) {
      if (profStaffRole) profStaffRole.textContent = user.details.designation || '---';
      if (profStaffDeptFull) profStaffDeptFull.textContent = user.details.department || '---';
    }

    // Restoration of Profile Picture if exists
    const savedPhoto = localStorage.getItem(`profile_photo_${user.username}`);
    const displayImg = document.getElementById("profilePictureDisplay");
    const initialsSpan = document.getElementById("profileInitials");
    
    if (savedPhoto && displayImg) {
      displayImg.src = savedPhoto;
      displayImg.style.display = "block";
      if (initialsSpan) initialsSpan.style.display = "none";
    } else {
      if (displayImg) displayImg.style.display = "none";
      if (initialsSpan) initialsSpan.style.display = "none"; // Keep area empty as requested
    }
  }
}

// Handle Profile Photo Upload — ONE-TIME ONLY
window.handleProfilePhotoUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");

  // Block if already uploaded
  if (user.username && localStorage.getItem(`profile_photo_${user.username}`)) {
    if (typeof showNotification === 'function') {
      showNotification('Upload Locked', 'Profile image has already been set and cannot be changed.', 'error');
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Image = e.target.result;

    if (user.username) {
      localStorage.setItem(`profile_photo_${user.username}`, base64Image);
      // Mark as locked
      localStorage.setItem(`profile_photo_locked_${user.username}`, 'true');

      // Update UI
      const displayImg = document.getElementById("profilePictureDisplay");
      const initials = document.getElementById("profileInitials");
      if (displayImg) {
        displayImg.src = base64Image;
        displayImg.style.display = "block";
      }
      if (initials) initials.style.display = "none";

      // Disable upload button after successful upload
      lockProfilePhotoUI();

      if (typeof showNotification === 'function') {
        showNotification('Photo Saved', 'Profile image uploaded successfully. This cannot be changed.', 'success');
      }
    }
  };
  reader.readAsDataURL(file);
};

// Lock the profile photo upload UI
function lockProfilePhotoUI() {
  const uploadLabel = document.querySelector('label[for="profilePhotoInput"]');
  const fileInput = document.getElementById('profilePhotoInput');
  if (uploadLabel) {
    uploadLabel.style.display = 'none';
  }
  if (fileInput) {
    fileInput.disabled = true;
  }
}

// Check on page load if photo is already locked
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
    if (user.username && localStorage.getItem(`profile_photo_locked_${user.username}`)) {
      lockProfilePhotoUI();
    }
  }, 500);
});

// Helper: Get ordinal suffix
function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Helper: Format date
function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options).replace(/\//g, '-');
}

// Availability toggle (Student Only)
function initAvailabilityToggle() {
  const toggle = document.getElementById("availabilityToggle");
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.querySelector(".status-indicator");

  if (toggle && statusText) {
    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        statusText.textContent = "Available for Placement";
        statusIndicator?.classList.add("available");
        statusIndicator?.classList.remove("unavailable");
      } else {
        statusText.textContent = "Not Available";
        statusIndicator?.classList.remove("available");
        statusIndicator?.classList.add("unavailable");
      }
    });
  }
}

// Salary range slider (Student Only)
function initSalaryRange() {
  const range = document.getElementById("salaryRange");
  const value = document.getElementById("salaryValue");

  if (range && value) {
    range.addEventListener("input", () => {
      value.textContent = range.value;
    });
  }
}

// Initialize charts - now handled by js/analytics.js
function initCharts() {
  // Stub: chart initialization is handled by analytics.js
  // This prevents errors when called from the shared dashboard init
}

// ==========================================
// UPDATED TEST TAKING LOGIC (SPA Integration)
// ==========================================

// Load available tests for students
async function loadAvailableTests() {
  const container = document.getElementById("availableTestsList");
  if (!container) return;

  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    // PRECISE FILTER: Only show the "Availability" test as requested
    const availableTests = (await window.DB.getTests(user.username));

    if (!availableTests || availableTests.length === 0) {
      container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--gray-500); border: 1px dashed rgba(255,255,255,0.05); border-radius: 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p style="font-size: 1.1rem; font-weight: 500; color: rgba(255,255,255,0.7);">No Tests Available</p>
                    <p style="font-size: 0.9rem; opacity: 0.5;">There are no tests scheduled for you at this time. Check back later.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = availableTests
      .map((test) => {
        const formattedDate = test.createdAt
          ? new Date(test.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
          : "Recently";
        
        // Clean fragments like '>' or code symbols from names
        const cleanName = (test.name || '').replace(/^[>#\s\-*!@]+/, '').trim();
        const cleanCompany = (test.company || '').replace(/^[>#\s\-*!@]+/, '').trim();

        const staffName = test.createdBy || "Staff";
        const qCount = Array.isArray(test.questions) ? test.questions.length :
          (typeof test.questions === 'string' ? JSON.parse(test.questions || '[]').length : 0);

        const diff = test.difficulty || 'Medium';
        const diffColorMap = { 'Easy': '#10b981', 'Medium': '#f59e0b', 'Hard': '#ef4444' };
        const diffColor = diffColorMap[diff] || '#f59e0b';

        return `
                <div class="drive-item" style="animation: fadeInUp 0.4s ease-out both;">
                    <div class="drive-logo" style="background: var(--gradient-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem;">
                         ${cleanCompany ? cleanCompany.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div class="drive-info">
                        <h4 style="margin: 0 0 4px 0; font-size: 1.1rem;">${cleanName}
                             <span style="display:inline-block; font-size: 0.65rem; font-weight: 800; color: ${diffColor}; background: ${diffColor}15; border: 1px solid ${diffColor}30; padding: 2px 8px; border-radius: 6px; margin-left: 8px; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;">${diff}</span>
                        </h4>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--gray-400);">
                            <span style="color: var(--blue-400); font-weight: 500;">${cleanCompany}</span> • 
                            ${staffName} • 
                            ${formattedDate} • 
                            ${test.duration}m • 
                            ${qCount} questions
                        </p>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="window.confirmStartTest(${test.id})" style="border-radius: 8px; padding: 0.6rem 1.75rem; font-weight: 600;">
                        Take Test
                    </button>
                </div>
            `;
      })
      .join("");
  } catch (e) {
    console.error("Error loading tests:", e);
    container.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--ef4444);">Failed to synchronize assesssments. Please refresh.</p>`;
  }
}

// 1. Professional Confirmation Dialog
async function confirmStartTest(testId) {
  // Remove any previous confirm dialogs
  document.querySelectorAll('.test-confirm-overlay').forEach(el => el.remove());

  // Show loading indicator or fetch test first
  const test = await window.DB.getTestById(testId);
  if (!test) {
    alert("Failed to load test details. Please try again.");
    return;
  }

  const confirmOverlay = document.createElement('div');
  confirmOverlay.className = 'modal-overlay test-confirm-overlay';
  confirmOverlay.style.cssText = 'display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); z-index:9999;';
  confirmOverlay.innerHTML = `
        <div class="modal-content glass-panel bounce-in" style="max-width: 520px; text-align: center; padding: 2.5rem; background: #1a1b2e; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">🚀</div>
            <h2 style="margin-bottom: 0.5rem; color: #fff; font-size: 1.4rem;">${test.name}</h2>
            <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 1.5rem; font-size: 0.85rem; color: rgba(255,255,255,0.6);">
                <span>⏱ ${test.duration} mins</span>
                <span>📋 ${Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'string' ? JSON.parse(test.questions).length : 0)} Questions</span>
            </div>

            ${test.syllabusUrl ? `
            <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; text-align: left;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" style="width: 20px; height: 20px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 00 2 2h12a2 2 0 00 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    <span style="font-weight: 700; color: #fff; font-size: 0.9rem;">Syllabus / Reference Material</span>
                </div>
                <p style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin: 0 0 12px 32px; line-height: 1.4;">
                    Review the supporting material before starting. It will not be accessible during the test.
                </p>
                <div style="margin-left: 32px;">
                    <a href="${test.syllabusUrl}" target="_blank" class="btn btn-sm" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 5px 15px; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Open Material
                    </a>
                </div>
            </div>
            ` : ''}

            <p style="color: rgba(255,255,255,0.4); margin-bottom: 1.5rem; font-size: 0.8rem; line-height: 1.6;">
                This is a <strong style="color:#f59e0b;">one-time attempt</strong>. Once you start, the timer begins and you cannot pause or re-enter this test.
            </p>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-ghost" id="confirmCancelBtn" style="flex:1; border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem; font-size: 0.9rem;">Wait, Go Back</button>
                <button class="btn btn-primary" id="finalProceedBtn" style="flex:1; padding: 0.8rem; font-weight: 700; font-size: 0.9rem;">I'm Ready, Start</button>
            </div>
        </div>
    `;
  document.body.appendChild(confirmOverlay);

  // Cancel button
  confirmOverlay.querySelector('#confirmCancelBtn').onclick = function () {
    confirmOverlay.remove();
  };

  // Start button
  confirmOverlay.querySelector('#finalProceedBtn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation: spin 0.8s linear infinite; margin-right: 8px;"></span> Starting...';

    try {
      await startProfessionalTest(testId);
      // Only remove confirm dialog AFTER test overlay is successfully shown
      confirmOverlay.remove();
    } catch (err) {
      console.error('[TEST-START] Error:', err);
      btn.disabled = false;
      btn.innerHTML = 'Retry';
      // Show error in the dialog itself
      const errorDiv = confirmOverlay.querySelector('.test-start-error');
      if (errorDiv) {
        errorDiv.textContent = err.message || 'Failed to start test. Please try again.';
      } else {
        const errEl = document.createElement('p');
        errEl.className = 'test-start-error';
        errEl.style.cssText = 'color: #ef4444; font-size: 0.85rem; margin-top: 1rem; padding: 0.75rem; background: rgba(239,68,68,0.1); border-radius: 8px;';
        errEl.textContent = err.message || 'Failed to start. Please try again.';
        btn.parentElement.after(errEl);
      }
    }
  };
}

// 2. Professional Test Logic
let activeTestInterval = null;
let activeTestAnswers = {};
let activeTestStartTime = null;
let questionTimes = {};
window.currentActiveTest = null;
let currentQuestionIndex = 0;

async function startProfessionalTest(testId) {
  const overlay = document.getElementById('test-taking-overlay');
  if (!overlay) {
    throw new Error('Test interface element not found. Please refresh the page.');
  }

  // Step 1: Fetch test data directly by ID
  console.log('[TEST-START] Fetching test data for ID:', testId);
  const test = await window.DB.getTestById(testId);
  if (!test) {
    throw new Error('Could not load test data. The test may have been removed.');
  }
  console.log('[TEST-START] Test loaded:', test.name, '| Questions type:', typeof test.questions);

  // Step 2: Parse questions safely
  try {
    if (typeof test.questions === 'string') {
      test.questions = JSON.parse(test.questions);
    }
    if (!Array.isArray(test.questions)) {
      throw new Error('Questions data is not in the expected format.');
    }
    test.questions = test.questions.filter(q => q && q.question && q.question.trim());
  } catch (e) {
    console.error("[TEST-START] Question parsing failed:", e);
    throw new Error('Test questions could not be loaded. Please contact staff.');
  }

  if (test.questions.length === 0) {
    throw new Error('This test has no questions configured. Please contact staff.');
  }
  console.log('[TEST-START] Parsed', test.questions.length, 'questions successfully.');

  // Step 3: Lock the attempt on the backend
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.username) {
    throw new Error('Session expired. Please log in again.');
  }

  console.log('[TEST-START] Locking attempt for user:', user.username);
  const lockRes = await window.DB.startAttempt(testId, user.username);

  if (lockRes.error) {
    console.error('[TEST-START] Lock rejected:', lockRes.error);
    throw new Error(lockRes.error);
  }
  console.log('[TEST-START] Attempt locked successfully.');

  // Step 4: Initialize state
  window.currentActiveTest = test;
  activeTestAnswers = {};
  questionTimes = {};
  currentQuestionIndex = 0;
  activeTestStartTime = Date.now();

  // Step 5: Build test interface UI
  const overlayDiff = test.difficulty || 'Medium';
  const overlayDiffColors = { 'Easy': '#10b981', 'Medium': '#f59e0b', 'Hard': '#ef4444' };
  const overlayDiffColor = overlayDiffColors[overlayDiff] || '#f59e0b';

  overlay.innerHTML = `
    <div class="test-header">
      <div class="test-title-info">
        <h2>${test.name} <span style="display:inline-block; font-size: 0.6rem; font-weight: 800; color: ${overlayDiffColor}; background: ${overlayDiffColor}15; border: 1px solid ${overlayDiffColor}30; padding: 2px 8px; border-radius: 6px; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;">${overlayDiff}</span></h2>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5);">${test.company} • ${test.questions.length} Questions • ${test.duration} min</div>
      </div>
      <div class="test-timer" id="testTimeDisplay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span id="professionalTime">${test.duration}:00</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="quitTest()" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Quit</button>
    </div>
    <div class="test-main">
      <div class="test-content">
        <div class="test-progress-strip">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="testMainProgressBar" style="width: 0%"></div>
          </div>
        </div>
        <div id="questionDisplayArea"></div>
      </div>
      <div class="test-sidebar">
        <div class="sidebar-card">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; margin-right:8px;"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
            Navigation
          </h3>
          <div class="progress-grid" id="testProgressGrid"></div>
        </div>
        <div class="sidebar-card">
          <h3>Summary</h3>
          <div class="stats-summary">
            <div class="stat-row">
              <span><span class="stat-pill" style="background: #10b981;"></span>Answered</span>
              <span class="stat-count" id="countAnswered">0</span>
            </div>
            <div class="stat-row">
              <span><span class="stat-pill" style="background: #f59e0b;"></span>Remaining</span>
              <span class="stat-count" id="countRemaining">${test.questions.length}</span>
            </div>
            <div class="stat-row">
              <span><span class="stat-pill" style="background: #ef4444;"></span>Skipped</span>
              <span class="stat-count" id="countSkipped">0</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: auto; background: #10b981; border: none; padding: 1rem; font-weight: 700; border-radius: 10px;" onclick="finishProfessionalTest()">Submit Test</button>
      </div>
    </div>
  `;

  // Step 6: Show the overlay
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  console.log('[TEST-START] Test overlay is now VISIBLE.');

  // Step 7: Start countdown timer
  const durationSecs = test.duration * 60;
  if (activeTestInterval) clearInterval(activeTestInterval);
  activeTestInterval = setInterval(() => {
    const elapsed = Date.now() - activeTestStartTime;
    const remaining = Math.max(0, (durationSecs * 1000) - elapsed);
    if (remaining <= 0) {
      clearInterval(activeTestInterval);
      processSTLESubmission(true);
      return;
    }
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const sec = (totalSec % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('professionalTime');
    if (timerEl) timerEl.textContent = `${m}:${sec}`;

    const timerDisplay = document.getElementById('testTimeDisplay');
    if (timerDisplay && m < 5) timerDisplay.style.color = '#ef4444';
  }, 1000);

  // Step 8: Render first question
  renderProfessionalQuestion(0);

  // Step 9: Refresh dashboard lists in background (removes test from availability)
  loadAvailableTests();
  loadCompletedTests();

  console.log('[TEST-START] Full test interface initialized successfully.');
}


function renderProfessionalQuestion(index) {
  const test = window.currentActiveTest;
  const q = test.questions[index];
  currentQuestionIndex = index;
  const container = document.getElementById('questionDisplayArea');
  if (!container) return;

  // Track time start for this question
  if (!questionTimes[index]) questionTimes[index] = { start: Date.now(), total: 0 };
  else questionTimes[index].start = Date.now();

  const isCoding = q.type === 'coding';
  const letters = ['A', 'B', 'C', 'D'];

  let contentHtml = '';

  if (isCoding) {
    const allowedLangs = q.allowed_languages || ['c', 'cpp', 'python', 'java', 'javascript'];
    contentHtml = `
      <div class="test-question-container bounce-in">
          <div class="question-header">
              <span class="question-number-badge">Question ${index + 1} of ${test.questions.length} • CODING</span>
          </div>
          <div class="question-text">${q.question}</div>
          
          <div class="coding-grid-layout" id="workbench-${index}">
              <!-- INPUT GRID -->
              <div class="grid-region input-grid">
                  <div class="grid-header">
                      <div class="grid-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
                          STUDENT_ENTRY_WORKSPACE
                      </div>
                      <div class="grid-controls">
                          <select class="grid-select" id="langSelect-${index}" onchange="handleLanguageChange(${index}, this.value)">
                              ${allowedLangs.map(l => `<option value="${l}">${l.toUpperCase()}</option>`).join('')}
                          </select>
                      </div>
                  </div>
                  <div class="editor-workspace">
                      <div class="line-numbers" id="line-numbers-${index}">1</div>
                      <textarea id="codeEditor-${index}" class="grid-textarea" 
                          placeholder="/* Write your code here... */"
                          oninput="handleCodeInput(${index}, this)"
                          onkeydown="handleTabKey(event, this)"
                          spellcheck="false"
                      >${activeTestAnswers[index] || getBoilerplate(allowedLangs[0])}</textarea>
                  </div>
                  <div class="grid-status-bar">
                      <span>Ln 1, Col 1</span>
                      <span>UTF-8</span>
                  </div>
              </div>

              <!-- ACTION ROW: Revealed on Type -->
              <div class="grid-button-row ${activeTestAnswers[index] ? 'visible' : ''}" id="actions-${index}">
                  <button class="btn-compile" onclick="compileCode(${index})">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                      COMPILE CODE
                  </button>
                  <button class="btn-run" onclick="runCode(${index})">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M5 3l14 9-14 9V3z"/></svg>
                      RUN PROGRAM
                  </button>
                  <div id="runStatus-${index}" style="margin-left: auto; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 8px;"></div>
              </div>

              <!-- STDIN INPUT -->
              <div class="stdin-grid" style="margin-top: 5px; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2);">
                  <div class="grid-header" style="background: rgba(255,255,255,0.02); padding: 5px 12px; font-size: 0.65rem; color: #3b82f6; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05);">
                      STANDARD_INPUT_STDIN
                  </div>
                  <textarea id="stdin-${index}" class="grid-textarea" 
                      placeholder="Enter program input here (e.g. if code uses input() or cin)..."
                      style="height: 50px; min-height: 50px; background: transparent; border: none; font-size: 0.8rem; color: #94a3b8; padding: 8px; width: 100%; outline: none; font-family: monospace; resize: none;"
                  ></textarea>
              </div>

              <!-- OUTPUT GRID -->
              <div class="output-grid" id="output-${index}" style="margin-bottom: 5px;">
                  <div class="terminal-header">
                      <div class="t-tab active" onclick="switchTerminalTab(${index}, 'console')">Execution Console</div>
                      <div class="t-tab" onclick="switchTerminalTab(${index}, 'debug')">Debug Monitor</div>
                  </div>
                  <div class="terminal-body" id="outputContent-${index}">
                      Run your code to see results here.
                  </div>
              </div>

              <!-- SUBMITTED OUTPUT: Final Output Box -->
              <div class="stdin-grid" style="border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2);">
                  <div class="grid-header" style="background: rgba(16, 185, 129, 0.05); padding: 5px 12px; font-size: 0.65rem; color: #10b981; font-weight: 800; border-bottom: 1px solid rgba(16, 185, 129, 0.2);">
                      FINAL_SUBMISSION_OUTPUT
                  </div>
                  <textarea id="finalOutput-${index}" class="grid-textarea" 
                            placeholder="Paste the final output produced by your code here. This is what will be evaluated..."
                            spellcheck="false"
                            oninput="handleFinalOutputInput(${index}, this)"
                            style="height: 60px; min-height: 60px; font-size: 0.8rem; border: none; background: transparent; padding: 10px; width: 100%; color: #94a3b8; outline: none; font-family: monospace; resize: none;"></textarea>
              </div>
          </div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="test-question-container bounce-in">
          <div class="question-header">
              <span class="question-number-badge">Question ${index + 1} of ${test.questions.length}</span>
          </div>
          <div class="question-text">${q.question}</div>
          <div class="options-grid">
              ${(q.options || []).map((opt, i) => `
                  <div class="option-item ${activeTestAnswers[index] === letters[i] ? 'selected' : ''}" 
                       onclick="selectProfessionalAnswer(${index}, '${letters[i]}')">
                       <div class="option-label">${letters[i]}</div>
                       <div class="option-text">${opt || `Option ${letters[i]}`}</div>
                  </div>
              `).join('')}
              ${!(q.options && q.options.length) ? '<p style="color: #ef4444; font-size: 0.9rem;">No options defined for this question.</p>' : ''}
          </div>
      </div>
    `;
  }

  container.innerHTML = `
      ${contentHtml}
      <div class="test-actions">
          <button class="btn btn-ghost" ${index === 0 ? 'disabled' : ''} onclick="prevQuestion()" style="border: 1px solid rgba(255,255,255,0.1);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Previous
          </button>
          <div style="display: flex; gap: 1rem;">
              ${index < test.questions.length - 1 ? `
                  <button class="btn btn-primary" onclick="nextQuestion()" style="padding: 0.75rem 2rem;">
                      Next
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
              ` : `
                  <button class="btn btn-primary" style="background: #10b981; border: none; padding: 0.75rem 2rem;" onclick="finishProfessionalTest()">Submit Assessment</button>
              `}
          </div>
      </div>
  `;

  if (isCoding) {
    setTimeout(() => {
      const textarea = document.getElementById(`codeEditor-${index}`);
      if (textarea) autoExpandEditor(textarea, index);
    }, 50);
  }

  updateProgressUI();
}

// Helper: Handle Tab Key in Editor
window.handleTabKey = function (e, textarea) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 4;
  }
};

// Helper: Handle Code Input Realtime
window.handleCodeInput = function (index, textarea) {
  activeTestAnswers[index] = textarea.value;
  autoExpandEditor(textarea, index);

  // Update character/status
  const statusBar = textarea.closest('.grid-region').querySelector('.grid-status-bar');
  if (statusBar) {
    const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
    statusBar.innerHTML = `<span>Ln ${lineCount}, Chars ${textarea.value.length}</span><span>UTF-8</span>`;
  }

  // Reveal actions
  const actions = document.getElementById(`actions-${index}`);
  if (actions && textarea.value.trim().length > 0) {
    actions.classList.add('visible');
  }
};

window.handleLanguageChange = function (index, lang) {
  const el = document.getElementById(`codeEditor-${index}`);
  if (el) {
    const templates = getBoilerplateTemplates();
    const currentVal = el.value.trim();
    const isBoilerplate = Object.values(templates).some(t => t.trim() === currentVal);

    if (!currentVal || isBoilerplate) {
      el.value = getBoilerplate(lang);
      activeTestAnswers[index] = el.value;
      handleCodeInput(index, el);
    }
  }
};

function getBoilerplateTemplates() {
  return {
    'c': '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}',
    'cpp': '#include <iostream>\n\nint main() {\n    std::cout << "Hello World" <<::endl;\n    return 0;\n}',
    'java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
    'python': 'print("Hello World")',
    'javascript': 'console.log("Hello World");',
    'nodejs': 'console.log("Hello World");'
  };
}

function getBoilerplate(lang) {
  return getBoilerplateTemplates()[lang.toLowerCase()] || '';
}

// Helper: Auto-expand Editor
window.autoExpandEditor = function (textarea, index) {
  textarea.style.height = 'auto';
  const scrollHeight = textarea.scrollHeight;
  textarea.style.height = Math.max(300, scrollHeight) + 'px';

  // Update line numbers
  const lineNumbers = document.getElementById(`line-numbers-${index}`);
  if (lineNumbers) {
    const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
    let html = '';
    for (let i = 1; i <= lineCount; i++) html += i + '<br>';
    lineNumbers.innerHTML = html;
  }
};

// Helper: Handle Final Output Input
window.handleFinalOutputInput = function (index, textarea) {
  window.actualOutputs = window.actualOutputs || {};
  window.actualOutputs[index] = textarea.value.trim();
};

// UI: Switch Terminal Tabs
window.switchTerminalTab = function (index, tab) {
  const tabs = document.querySelectorAll(`#workbench-${index} .t-tab`);
  tabs.forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const content = document.getElementById(`outputContent-${index}`);
  if (!content) return;

  if (tab === 'debug') {
    content.style.color = '#fbbf24';
    const q = window.currentActiveTest.questions[index];
    content.textContent = `[DEBUG MONITOR]\n> Environment: Production-Edge\n> Languages Allowed: ${(q.allowed_languages || []).join(', ')}\n> Constraints: 2s / 128MB\n> Expected Output Size: ${q.expectedOutput ? q.expectedOutput.length : 0} bytes`;
  } else {
    content.style.color = '#e2e8f0';
    content.textContent = window.executionHistory && window.executionHistory[index] ? window.executionHistory[index] : "Run your code to see results here.";
  }
};

// EXECUTION: Compile Code
window.compileCode = async function (index) {
  const code = activeTestAnswers[index];
  const language = document.getElementById(`langSelect-${index}`)?.value || 'python';
  const statusEl = document.getElementById(`runStatus-${index}`);
  const outputGrid = document.getElementById(`output-${index}`);
  const outputContent = document.getElementById(`outputContent-${index}`);

  if (!code || !code.trim()) {
    alert("Please write some code first.");
    return;
  }

  statusEl.innerHTML = '<span class="spinner-sm" style="display:inline-block;width:12px;height:12px;border:2px solid #fbbf24;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> COMPILING...';
  statusEl.style.color = '#fbbf24';
  outputGrid.classList.add('visible');
  outputContent.textContent = "Compiling your source code...";

  const stdin = document.getElementById(`stdin-${index}`)?.value || '';

  try {
    const data = await window.DB.executeCode(code, language, true, stdin);

    window.executionHistory = window.executionHistory || {};
    window.actualOutputs = window.actualOutputs || {};

    if (data.success || data.status === 'Success') {
      statusEl.innerHTML = '<span style="color:#10b981;">✓ COMPILE SUCCESS</span>';
      outputContent.textContent = data.output || "No compilation errors.";
      outputContent.style.color = '#10b981';
      window.executionHistory[index] = data.output || "No compilation errors.";
      window.actualOutputs[index] = (data.output || "No compilation errors.").trim();
    } else {
      statusEl.innerHTML = '<span style="color:#ef4444;">✕ COMPILE ERROR</span>';
      outputContent.textContent = data.error || "Syntax Error";
      outputContent.style.color = '#ef4444';
      window.executionHistory[index] = outputContent.textContent;
      window.actualOutputs[index] = outputContent.textContent.trim();
    }
  } catch (e) {
    statusEl.textContent = "✕ CONNECTION ERROR";
    outputContent.textContent = "Failed to reach compilation server.";
  }
};

// EXECUTION: Run Code
window.runCode = async function (index) {
  const code = activeTestAnswers[index];
  const language = document.getElementById(`langSelect-${index}`)?.value || 'python';
  const statusEl = document.getElementById(`runStatus-${index}`);
  const outputGrid = document.getElementById(`output-${index}`);
  const outputContent = document.getElementById(`outputContent-${index}`);

  if (!code || !code.trim()) {
    alert("Please write some code first.");
    return;
  }

  statusEl.innerHTML = '<span class="spinner-sm" style="display:inline-block;width:12px;height:12px;border:2px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> RUNNING...';
  statusEl.style.color = '#3b82f6';
  outputGrid.classList.add('visible');
  outputContent.textContent = "Executing program...";

  const stdin = document.getElementById(`stdin-${index}`)?.value || '';

  try {
    const data = await window.DB.executeCode(code, language, false, stdin);

    window.executionHistory = window.executionHistory || {};
    window.actualOutputs = window.actualOutputs || {};

    if (data.success) {
      statusEl.innerHTML = '<span style="color:#10b981;">✓ EXECUTION SUCCESS</span>';
      outputContent.textContent = data.output || "(no output)";
      outputContent.style.color = '#10b981';
      window.executionHistory[index] = data.output;
      window.actualOutputs[index] = (data.output || '').trim();

      const finalOutEl = document.getElementById(`finalOutput-${index}`);
      if (finalOutEl) finalOutEl.value = (data.output || '').trim();
    } else {
      statusEl.innerHTML = '<span style="color:#ef4444;">✕ RUNTIME ERROR</span>';
      const errorMsg = (data.status || 'Runtime Error') + (data.error ? ': ' + data.error : '');
      const combinedOutput = errorMsg + (data.output ? '\n' + data.output : '');

      outputContent.textContent = (data.error || "Error") + "\n" + (data.output || "");
      outputContent.style.color = '#ef4444';
      window.executionHistory[index] = outputContent.textContent;
      window.actualOutputs[index] = combinedOutput.trim();

      const finalOutEl = document.getElementById(`finalOutput-${index}`);
      if (finalOutEl) finalOutEl.value = combinedOutput.trim();
    }
  } catch (e) {
    statusEl.textContent = "✕ CONNECTION ERROR";
    outputContent.textContent = "Failed to reach execution server.";
  }
};

function selectProfessionalAnswer(index, answer) {
  activeTestAnswers[index] = answer;
  // Track time spent
  if (questionTimes[index]) {
    questionTimes[index].total += (Date.now() - questionTimes[index].start);
    questionTimes[index].start = Date.now();
  }
  renderProfessionalQuestion(index);
}

function prevQuestion() { if (currentQuestionIndex > 0) renderProfessionalQuestion(currentQuestionIndex - 1); }
function nextQuestion() { if (currentQuestionIndex < window.currentActiveTest.questions.length - 1) renderProfessionalQuestion(currentQuestionIndex + 1); }

function updateProgressUI() {
  const test = window.currentActiveTest;
  const grid = document.getElementById('testProgressGrid');
  if (!grid) return;

  let answeredCount = 0;
  let skippedCount = 0;

  grid.innerHTML = test.questions.map((_, i) => {
    let status = '';
    if (i === currentQuestionIndex) {
      status = 'active';
    } else if (activeTestAnswers[i]) {
      status = 'answered';
      answeredCount++;
    } else if (i < currentQuestionIndex) {
      status = 'skipped';
      skippedCount++;
    }

    return `<div class="progress-dot ${status}" onclick="renderProfessionalQuestion(${i})">${i + 1}</div>`;
  }).join('');

  // Update Stats
  const countAnswered = document.getElementById('countAnswered');
  const countRemaining = document.getElementById('countRemaining');
  const countSkipped = document.getElementById('countSkipped');
  const progressBar = document.getElementById('testMainProgressBar');

  const total = test.questions.length;
  const currentAnswered = Object.keys(activeTestAnswers).length;

  if (countAnswered) countAnswered.textContent = currentAnswered;
  if (countRemaining) countRemaining.textContent = total - currentAnswered;
  if (countSkipped) countSkipped.textContent = skippedCount;

  if (progressBar) {
    const progressPercent = (currentAnswered / total) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }
}

function quitTest() {
  const answered = Object.keys(activeTestAnswers).length;
  const total = window.currentActiveTest ? window.currentActiveTest.questions.length : 0;

  if (confirm(`Are you sure you want to quit? This will be marked as your final attempt and you will NOT be able to re-enter. You have answered ${answered} of ${total} questions. Proceed?`)) {
    // If they quit, we process it as a final submission
    processSTLESubmission();
  }
}

// STLE Step 3: Professional Submission Modal
function finishProfessionalTest() {
  const test = window.currentActiveTest;
  if (!test) return;

  // Prevent multiple modals
  if (document.getElementById('stleConfirmModal')) return;

  const answeredCount = Object.keys(activeTestAnswers).length;
  const totalCount = test.questions.length;

  const modal = document.createElement('div');
  modal.id = 'stleConfirmModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);';
  modal.innerHTML = `
    <div class="glass-panel bounce-in" style="max-width: 440px; width: 90%; padding: 2.5rem; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: #1a1b2e;">
      <div style="width: 64px; height: 64px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Confirm Submission?</h3>
      <p style="color: var(--gray-400); font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem;">
        You have answered <strong>${answeredCount}</strong> of ${totalCount} questions. Once submitted, you cannot change your answers.
      </p>
      <div style="display: flex; gap: 1rem;">
        <button class="btn btn-ghost" style="flex: 1; border: 1px solid rgba(255,255,255,0.1);" onclick="document.getElementById('stleConfirmModal').remove()">Review Answers</button>
        <button class="btn btn-primary" style="flex: 1; background: #10b981; border: none; font-weight: 600;" id="stleSubmitBtn" onclick="processSTLESubmission()">
          Yes, Submit
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// STLE Step 4: Submission Processing
async function processSTLESubmission(isAuto = false) {
  const test = window.currentActiveTest;
  if (!test) return;

  if (isAuto) {
    alert("Time's up! Your test is being automatically submitted.");
  }

  const submitBtn = document.getElementById('stleSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-sm" style="display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation: spin 0.8s linear infinite;"></span> Processing...';
  }

  // Clear timer
  if (activeTestInterval) clearInterval(activeTestInterval);

  // Final time tracking
  if (questionTimes[currentQuestionIndex]) {
    questionTimes[currentQuestionIndex].total += (Date.now() - questionTimes[currentQuestionIndex].start);
  }

  // PROFESSIONAL SCORING ENGINE (MCQ + CODING)
  let totalWeightedScore = 0;
  let integerCorrect = 0;
  const resultsBreakdown = [];

  test.questions.forEach((q, i) => {
    const studentAns = activeTestAnswers[i] || "";
    if (q.type === 'mcq' || !q.type) {
      let isCorrect = studentAns === q.answer;
      if (isCorrect) {
        totalWeightedScore += 1;
        integerCorrect++;
      }
      resultsBreakdown.push({ type: 'mcq', correct: isCorrect, studentAns, correctAns: q.answer });
    } else if (q.type === 'coding') {
      const actual = (window.actualOutputs && window.actualOutputs[i]) ? window.actualOutputs[i].trim() : "";
      const expected = (q.expectedOutput || "").trim();
      let similarity = 0;

      if (actual === expected && actual !== "") {
        totalWeightedScore += 1;
        integerCorrect++;
        similarity = 100;
      } else if (actual !== "" && expected !== "") {
        similarity = calculateSimilarity(actual, expected);
        totalWeightedScore += (similarity / 100);
      } else if (actual === "" && expected !== "") {
        similarity = 0;
      }
      resultsBreakdown.push({ type: 'coding', similarity, actualOutput: actual, expectedOutput: expected, code: studentAns });
    }
  });

  const percentage = Math.round((totalWeightedScore / test.questions.length) * 100);
  const passThreshold = test.passingPercentage || 50;
  const status = percentage >= passThreshold ? "passed" : "failed";
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const result = {
    username: user.username,
    testId: test.id,
    testName: test.name,
    company: test.company,
    difficulty: test.difficulty || 'Medium',
    score: percentage,
    status: status,
    correctCount: integerCorrect,
    totalQuestions: test.questions.length,
    answers: activeTestAnswers,
    actualOutputs: window.actualOutputs || {},
    details: resultsBreakdown,
    questionTimes: questionTimes,
    questions: test.questions,
    date: new Date().toISOString()
  };

  try {
    // Save to Backend
    await window.DB.submitTest(result);

    // Close Modals & Overlay with smooth transition
    document.getElementById('stleConfirmModal')?.remove();
    const overlay = document.getElementById('test-taking-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('fade-out');
        document.body.style.overflow = 'auto';
        showProfessionalResult(result);
      }, 400);
    } else {
      document.body.style.overflow = 'auto';
      showProfessionalResult(result);
    }

    // Reload Dashboard Data
    await loadAvailableTests();
    await loadCompletedTests();

  } catch (err) {
    console.error('[STLE] Submission Error:', err);
    alert('Submission failed. Please check your connection and try again.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Retry Submission';
    }
  }
}


function showProfessionalResult(result) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay test-result-overlay';
  overlay.style.cssText = 'display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999;';

  const statusLabel = result.status === 'passed' ? 'QUALIFIED' : 'NOT QUALIFIED';
  const statusIcon = result.status === 'passed' ? '🏆' : '📈';
  const statusColor = result.status === 'passed' ? '#10b981' : '#ef4444';

  overlay.innerHTML = `
        <div class="glass-panel bounce-in" style="max-width: 500px; width: 90%; text-align: center; padding: 3rem; background: #1a1b2e; border: 1px solid rgba(255,255,255,0.12); border-radius: 24px;">
            <div style="font-size: 5rem; margin-bottom: 1.5rem;">${statusIcon}</div>
            <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem; color: #fff;">Assessment Complete!</h2>
            <div style="display: inline-block; padding: 0.4rem 1.5rem; border-radius: 50px; background: ${statusColor}22; color: ${statusColor}; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.5rem; border: 1px solid ${statusColor}44;">
              ${statusLabel}
            </div>
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem;">
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 800; color: ${statusColor};">${result.score}%</div>
                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">Score</div>
              </div>
            </div>
            <p style="color: rgba(255,255,255,0.5); margin-bottom: 2rem; font-size: 0.9rem; line-height: 1.5;">
              Your results for <strong style="color:#fff;">${result.testName}</strong> have been recorded and synchronized.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <button class="btn btn-primary" onclick="this.closest('.test-result-overlay').remove(); viewTestDetails(${JSON.stringify(result).replace(/"/g, '&quot;')})" style="width: 100%; padding: 0.85rem; border-radius: 10px;">Analyze Performance</button>
                <button class="btn btn-ghost" id="goToAttendedBtn" style="width: 100%; padding: 0.85rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;">View Attended Tests</button>
            </div>
        </div>
    `;
  document.body.appendChild(overlay);

  // Navigate to "Tests Attended" section when clicking "View Attended Tests"
  overlay.querySelector('#goToAttendedBtn').onclick = function () {
    overlay.remove();
    // Click the "Tests Attended" nav item to switch sections
    const testsNavItem = document.querySelector('.nav-item[data-section="tests"]');
    if (testsNavItem) testsNavItem.click();
  };
}

// Load completed tests for students
async function loadCompletedTests() {
  const tbody = document.querySelector("#tests-section tbody");
  if (!tbody) return;

  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    // Fetch fresh data from DB
    const results = await window.DB.getStudentResults(user.username);

    // Update session storage for other components
    user.testsCompleted = results;
    sessionStorage.setItem("user", JSON.stringify(user));

    // Sort by date newest first
    results.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    // Store in global for modal access
    window.currentStudentResults = results;

    // Initialize searches
    initStudentTestFilters();

    renderCompletedTests(results);
  } catch (e) {
    console.error("Error loading completed tests:", e);
  }
}

function initStudentTestFilters() {
  const searchInput = document.getElementById('studentTestSearch');
  const statusFilter = document.getElementById('studentStatusFilter');
  const clearBtn = document.getElementById('clearStudentTestSearch');

  if (searchInput && !searchInput.dataset.initialized) {
    searchInput.addEventListener('input', () => {
      if (clearBtn) clearBtn.classList.toggle('visible', searchInput.value.length > 0);
      filterStudentTests();
    });
    searchInput.dataset.initialized = 'true';
  }

  if (clearBtn && !clearBtn.dataset.initialized) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.remove('visible');
      filterStudentTests();
      searchInput.focus();
    });
    clearBtn.dataset.initialized = 'true';
  }

  if (statusFilter && !statusFilter.dataset.initialized) {
    statusFilter.addEventListener('change', () => filterStudentTests());
    statusFilter.dataset.initialized = 'true';
  }
}

function filterStudentTests() {
  const search = document.getElementById('studentTestSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('studentStatusFilter')?.value || '';
  const results = window.currentStudentResults || [];

  const filtered = results.filter(test => {
    const matchesSearch = test.testName.toLowerCase().includes(search) ||
      test.company.toLowerCase().includes(search);
    const matchesStatus = !status || test.status === status;
    return matchesSearch && matchesStatus;
  });

  renderCompletedTests(filtered);
}

function renderCompletedTests(results) {
  const tbody = document.querySelector("#tests-section tbody");
  if (!tbody) return;

  if (results.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div style="text-align: center; padding: 3rem; color: var(--gray-500);">
                        <p style="font-size: 1.1rem; font-weight: 500;">No Tests Found</p>
                    </div>
                </td>
            </tr>
        `;
    return;
  }

  // Update Stats cards from server results (not filtered ones)
  const allResults = window.currentStudentResults || [];
  if (allResults.length > 0) {
    const totalTests = allResults.length;
    const passedTests = allResults.filter((t) => t.status === "passed").length;
    const failedTests = allResults.filter((t) => t.status === "failed").length;
    const avgScore = Math.round(allResults.reduce((sum, t) => sum + t.score, 0) / totalTests);

    const statTotal = document.getElementById("statTotalTests");
    const statPassed = document.getElementById("statPassed");
    const statFailed = document.getElementById("statFailed");
    const statAvg = document.getElementById("statAvgScore");

    if (statTotal) statTotal.textContent = totalTests;
    if (statPassed) statPassed.textContent = passedTests;
    if (statFailed) statFailed.textContent = failedTests;
    if (statAvg) statAvg.textContent = avgScore + "%";
  }

  tbody.innerHTML = results
    .map((test) => {
      const formattedDate = new Date(test.createdAt || test.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const statusClass = test.status || "pending";
      const isRecordViewable = !test.isIncomplete && test.status !== 'incomplete';

      const cleanName = (test.testName || '').replace(/^[>#\s\-*!@]+/, '').trim();
      const cleanCompany = (test.company || '').replace(/^[>#\s\-*!@]+/, '').trim();

      return `
            <tr>
                <td>${cleanName}</td>
                <td>${cleanCompany}</td>
                <td>${formattedDate}</td>
                <td>${test.isIncomplete ? 'N/A' : test.score + '%'}</td>
                <td><span class="status-badge ${statusClass}">${statusClass.toUpperCase()}</span></td>
                <td class="actions-cell">
                    <div class="action-icons" style="display: grid; grid-template-columns: repeat(2, 32px); gap: 12px; justify-content: center; align-items: center;">
                        <!-- Slot 1: Analyze Performance (Always Present) -->
                        <div class="action-slot" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                            <button class="action-btn" 
                                    onclick="${isRecordViewable ? `openTestDetailsRecord('${test.id}')` : 'void(0)'}"
                                    title="Analyze Performance"
                                    ${!isRecordViewable ? 'disabled' : ''}
                                    style="opacity: ${isRecordViewable ? '1' : '0.4'}; cursor: ${isRecordViewable ? 'pointer' : 'not-allowed'}; color: #6366f1; background: rgba(99, 102, 241, 0.1); border-radius: 8px; padding: 6px; display: flex; align-items: center; justify-content: center; height: 32px; width: 32px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Slot 2: Issue Merit Certificate (Conditional) -->
                        <div class="action-slot" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                            ${test.status === 'passed' ? `
                            <button class="action-btn" 
                                    onclick="generateMeritCertificate('${test.id}')"
                                    title="Issue Merit Certificate"
                                    style="color: #10b981; background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 6px; display: flex; align-items: center; justify-content: center; height: 32px; width: 32px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                    <circle cx="12" cy="8" r="7" />
                                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                                </svg>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

// 3. View Test Details Logic
async function openTestDetailsRecord(resultId) {
  const result = window.currentStudentResults.find(r => String(r.id) === String(resultId));
  if (!result) return;

  if (result.isIncomplete || result.status === 'incomplete') {
    alert('This test was abandoned or ended abruptly. Question-wise analysis is not available for incomplete attempts.');
    return;
  }

  await viewTestDetails(result);
}

async function viewTestDetails(result) {
  const overlay = document.getElementById('performance-overlay');
  if (!overlay) return;

  const detailsArr = typeof result.details === 'string' ? JSON.parse(result.details) : (result.details || []);
  const answersArr = typeof result.answers === 'string' ? JSON.parse(result.answers) : (result.answers || []);
  const questionsArr = typeof result.questions === 'string' ? JSON.parse(result.questions) : (result.questions || []);

  overlay.innerHTML = `
        <div class="assessment-report-container" style="max-width: 900px; margin: 0 auto; background: var(--bg-card); border-radius: 20px; padding: 2.5rem; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <div class="assessment-report-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
                <button class="btn btn-dashboard-back" onclick="closePerformanceReview()" style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; padding: 0.65rem 1.75rem; border-radius: 10px; display: inline-flex; align-items: center; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.3px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.35); cursor: pointer; transition: all 0.3s ease;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px; margin-right:8px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 
                  Dashboard
                </button>
                <div class="assessment-report-title" style="text-align: center;">
                    <h1 style="margin:0; font-size: 1.25rem; letter-spacing: 2px; font-weight: 800; color: #fff;">ASSESSMENT REPORT</h1>
                    <div style="height: 2px; width: 40px; background: var(--blue-500); margin: 8px auto 0;"></div>
                </div>
                <div class="assessment-report-spacer" style="width: 100px;"></div>
            </div>

            <div class="score-hero" style="background: rgba(255,255,255,0.02); border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 2rem;">
                <div class="score-hero-flex" style="display: flex; align-items: center; gap: 2rem; justify-content: center;">
                  <div class="score-circle" style="margin: 0; flex-shrink: 0;">
                      <span class="score-value">${result.score}</span>
                      <span class="score-total">%</span>
                  </div>
                  <div class="score-hero-text" style="text-align: left;">
                      <h2 style="font-size: 1.75rem; margin: 0 0 0.25rem 0; color: #fff;">${result.testName} ${(() => { const rd = result.difficulty || 'Medium'; const rdc = { 'Easy': '#10b981', 'Medium': '#f59e0b', 'Hard': '#ef4444' }[rd] || '#f59e0b'; return `<span style="display:inline-block; font-size: 0.6rem; font-weight: 800; color: ${rdc}; background: ${rdc}15; border: 1px solid ${rdc}30; padding: 2px 8px; border-radius: 6px; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;">${rd}</span>`; })()}</h2>
                      <p style="color: var(--gray-400); margin: 0 0 1rem 0; font-size: 0.95rem;">${result.company} • Applied Drive</p>
                      <span class="badge" style="background: ${result.status === 'passed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${result.status === 'passed' ? '#10b981' : '#ef4444'}; border: 1px solid currentColor; padding: 0.4rem 1rem; border-radius: 50px; font-weight: 700; font-size: 0.75rem; letter-spacing: 1px;">
                          ${result.status === 'passed' ? 'QUALIFIED' : 'NOT QUALIFIED'}
                      </span>
                  </div>
                </div>
            </div>

            <!-- Attempt Analysis Section -->
            <div class="attempt-analysis-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem;">
              ${(() => {
                let correct = 0, incorrect = 0, unattempted = 0;
                questionsArr.forEach((q, i) => {
                  const detail = detailsArr[i] || {};
                  const userAns = answersArr[i] || detail.code || "";
                  const isCoding = q.type === 'coding';
                  
                  if (!userAns) {
                    unattempted++;
                  } else {
                    let isRight = false;
                    if (isCoding) {
                      const actual = (detail.actualOutput || (result.actualOutputs && result.actualOutputs[i]) || "").trim();
                      const expected = (q.expectedOutput || detail.expectedOutput || "").trim();
                      isRight = actual === expected && actual !== "";
                    } else {
                      isRight = userAns === q.answer;
                    }
                    if (isRight) correct++; else incorrect++;
                  }
                });
                
                return `
                  <div class="analysis-stat-card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${correct}</div>
                    <div style="font-size: 0.65rem; color: #10b981; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Correct</div>
                  </div>
                  <div class="analysis-stat-card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #ef4444;">${incorrect}</div>
                    <div style="font-size: 0.65rem; color: #ef4444; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Incorrect</div>
                  </div>
                  <div class="analysis-stat-card" style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">${unattempted}</div>
                    <div style="font-size: 0.65rem; color: #f59e0b; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Unattempted</div>
                  </div>
                  <div class="analysis-stat-card" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${questionsArr.length}</div>
                    <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Total Questions</div>
                  </div>
                `;
              })()}
            </div>

            <div class="question-analysis-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
               <h3 style="font-size: 1rem; color: #fff; margin: 0;">Question Analysis</h3>
               <span style="font-size: 0.85rem; color: var(--gray-500);">Deep Dive</span>
            </div>

            <div class="review-grid" style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${questionsArr.map((q, i) => {
    const detail = detailsArr[i] || {};
    const userAns = answersArr[i] || detail.code || "";
    const isCoding = q.type === 'coding';
    let isCorrect = false;
    let similarityScore = null;

    if (isCoding) {
      const actual = detail.actualOutput || (result.actualOutputs && result.actualOutputs[i]) ? (detail.actualOutput || result.actualOutputs[i]).trim() : "";
      const expected = (q.expectedOutput || detail.expectedOutput || "").trim();
      isCorrect = actual === expected && actual !== "";
      if (!isCorrect && actual !== "" && expected !== "") {
        similarityScore = (detail.similarity !== undefined) ? detail.similarity : calculateSimilarity(actual, expected).toFixed(1);
      }
    } else {
      isCorrect = userAns === q.answer;
    }

    const timeSpent = result.questionTimes && result.questionTimes[i] ? Math.round(result.questionTimes[i].total / 1000) : 0;
    
    let containerBg = 'rgba(255,255,255,0.02)';
    let containerBorder = 'rgba(255,255,255,0.05)';
    if (userAns !== "") {
      if (isCorrect) {
        containerBg = 'rgba(16, 185, 129, 0.05)';
        containerBorder = 'rgba(16, 185, 129, 0.2)';
      } else {
        containerBg = 'rgba(239, 68, 68, 0.05)';
        containerBorder = 'rgba(239, 68, 68, 0.2)';
      }
    }

    return `
                    <div class="review-item" style="background: ${containerBg}; border: 1px solid ${containerBorder}; border-radius: 12px; padding: 1.75rem;">
                        <div class="review-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--blue-400); text-transform: uppercase; letter-spacing: 1px;">
                                Question ${i + 1} ${isCoding ? '• CODING_LAB' : '• MCQ'}
                            </span>
                            <div class="review-status-wrap" style="display: flex; gap: 1rem; align-items: center;">
                              <span style="font-size: 0.75rem; color: var(--gray-500); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; white-space: nowrap;">⏱️ ${timeSpent}s</span>
                              <div class="review-status ${isCorrect ? 'status-correct' : 'status-incorrect'}" style="margin: 0; padding: 4px 12px; font-size: 0.7rem; border-radius: 6px; white-space: nowrap;">
                                  ${isCorrect ? 'PASS' : (isCoding ? 'FAIL / PARTIAL' : 'INCORRECT')}
                              </div>
                            </div>
                        </div>
                        <div class="review-question" style="font-size: 1.05rem; margin-bottom: 1.5rem; line-height: 1.6; color: #fff; font-weight: 600;">${q.question}</div>
                        
                        ${isCoding ? `
                            <div class="coding-analysis" style="display: flex; flex-direction: column; gap: 1rem; animation: fadeIn 0.4s ease-out;">
                                <div style="background: #020617; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden;">
                                    <div style="background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; font-size: 0.7rem; color: var(--gray-400); font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05);">Submitted Code</div>
                                    <pre class="coding-pre" style="margin:0; padding: 1.25rem; color: #e2e8f0; font-family: 'Fira Code', monospace; font-size: 0.85rem; line-height: 1.5; overflow-x: auto; tab-size: 4;">${userAns || '// No code submitted'}</pre>
                                </div>
                                <div class="coding-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    <div style="background: #020617; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden;">
                                        <div style="background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; font-size: 0.7rem; color: #10b981; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05);">Expected Output</div>
                                        <pre class="coding-pre" style="margin:0; padding: 1rem; color: #10b981; font-family: monospace; font-size: 0.8rem; overflow-x: auto;">${q.expectedOutput || ''}</pre>
                                    </div>
                                    <div style="background: #020617; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden;">
                                        <div style="background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; font-size: 0.7rem; color: ${isCorrect ? '#10b981' : '#ef4444'}; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05);">Student Submitted Output</div>
                                        <pre class="coding-pre" style="margin:0; padding: 1rem; color: ${isCorrect ? '#10b981' : '#ef4444'}; font-family: monospace; font-size: 0.8rem; overflow-x: auto; max-height: 150px;">${(detail.actualOutput !== undefined && detail.actualOutput !== null && detail.actualOutput !== "") ? detail.actualOutput : 'No output recorded'}</pre>
                                    </div>
                                </div>
                                ${similarityScore ? `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px;">
                                        <span style="font-size: 0.85rem; color: #93c5fd; font-weight: 600;">Output Similarity Matrix</span>
                                        <span style="font-size: 1.1rem; font-weight: 800; color: #3b82f6;">${similarityScore}%</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="review-options" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                                ${(q.options || []).map((opt, optIdx) => {
      const letter = String.fromCharCode(65 + optIdx);
      let type = '';
      if (letter === q.answer) type = 'correct';
      else if (letter === userAns && !isCorrect) type = 'user-incorrect';

      return `
                                    <div class="review-option ${type}" style="padding: 12px 16px; font-size: 0.85rem; border-radius: 10px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
                                        <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem; flex-shrink: 0;">${letter}</div>
                                        <span style="flex: 1; overflow-wrap: anywhere;">${opt}</span>
                                        ${letter === userAns ? `<span style="font-size: 0.65rem; padding: 2px 8px; border-radius: 6px; background: ${isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isCorrect ? '#10b981' : '#ef4444'}; font-weight: 800;">YOU</span>` : ''}
                                    </div>
                                    `;
    }).join('')}
                            </div>
                        `}
                    </div>
                    `;
  }).join('')}
            </div>

            <div class="review-footer" style="margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: center;">
                <button class="btn btn-primary" onclick="closePerformanceReview()" style="max-width: 300px; width: 100%; border-radius: 12px; padding: 1rem; font-weight: 800; font-size: 0.95rem; letter-spacing: 1px; background: linear-gradient(135deg, var(--blue-600), #764ba2); color: #fff; border: none; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); text-transform: uppercase; cursor: pointer; transition: all 0.3s ease;">Close Report</button>
            </div>
        </div>
    `;

  overlay.style.display = 'block';
  // Allow full page scroll
  window.scrollTo(0, 0);
}


function closePerformanceReview() {
  document.getElementById('performance-overlay').style.display = 'none';
  // Restore scroll is redundant if we never hide it, but harmless to keep set to auto
  document.body.style.overflow = 'auto';
}

function closeTestDetails() {
  const modal = document.getElementById('test-details-modal');
  if (modal) modal.style.display = 'none';
}

async function handleProfilePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validation
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showNotification('Invalid File', 'Please upload a JPEG, PNG or WEBP image.', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) { // 2MB
    showNotification('File Too Large', 'Maximum image size is 2MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const photoUrl = e.target.result;

    // Update all relevant avatars and profile pics in UI
    const avatars = document.querySelectorAll('.user-avatar, #profilePic, #profilePictureDisplay, #sidebarProfilePic');
    avatars.forEach(av => {
      if (av.tagName === 'IMG') {
        av.src = photoUrl;
      } else {
        av.textContent = '';
        av.style.backgroundImage = `url(${photoUrl})`;
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
      }
    });

    // Save to DB and Local Storage
    const userData = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    if (userData.username) {
      try {
        if (window.DB && window.DB.updateUser) {
          await window.DB.updateUser(userData.username, { profileImage: photoUrl });
        }
        userData.profileImage = photoUrl;
        userData.profilePic = photoUrl; // Redundancy for compatibility
        sessionStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
        showNotification('Profile Updated', 'Your profile picture has been updated successfully.', 'success');
      } catch (err) {
        console.error('Error updating profile photo:', err);
        showNotification('Update Error', 'Could not save profile photo to database.', 'error');
      }
    }
  };
  reader.readAsDataURL(file);
}

// Global Exports
window.confirmStartTest = confirmStartTest;
window.renderProfessionalQuestion = renderProfessionalQuestion;
window.selectProfessionalAnswer = selectProfessionalAnswer;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.quitTest = quitTest;
window.finishProfessionalTest = finishProfessionalTest;
window.viewTestDetails = viewTestDetails;
window.closePerformanceReview = closePerformanceReview;
window.closeTestDetails = closeTestDetails;
window.initCharts = initCharts;
window.handleProfilePhotoUpload = handleProfilePhotoUpload;


/**
 * Check if the student has any incomplete tests or pending assignments
 */
async function checkIncompleteTests() {
  if (!window.DB) return;
  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!userStr) return;
  const user = JSON.parse(userStr);

  // Check if student is marked as available
  const toggle = document.getElementById("availabilityToggle");
  const statusIndicator = document.querySelector(".status-indicator");

  if (toggle && !toggle.checked) {
    return; // Student is not available
  }
  if (statusIndicator && statusIndicator.classList.contains("unavailable")) {
    return; // Fallback check
  }

  try {
    // Only get tests available specifically for this student
    const available = await window.DB.getTests(user.username);
    const completed = await window.DB.getAllResults();

    // Filter tests that are not in completed results
    const unfinished = available.filter(test => {
      const isCompleted = completed.some(res => res.testId == test.id && res.username == user.username);
      return !isCompleted;
    });

    if (unfinished.length > 0) {
      setTimeout(() => {
        showNotification(
          "Action Required!",
          `You have ${unfinished.length} pending test(s) that need to be finished. Please check the 'Available Tests' section.`,
          "info"
        );
      }, 2000);
    }
  } catch (e) {
    console.error("Error checking incomplete tests:", e);
  }
}

function showNotification(title, message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success"
      ? "linear-gradient(135deg, #10b981, #059669)"
      : type === "error"
        ? "linear-gradient(135deg, #ef4444, #dc2626)"
        : "linear-gradient(135deg, #3b82f6, #1d4ed8)"};
        color: white;
        padding: 1.25rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        max-width: 400px;
        z-index: 10000;
        animation: slideInNav 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255,255,255,0.1);
    `;

  notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div style="font-size: 1.5rem;">${type === "success" ? "✓" : type === "error" ? "✕" : "���"}</div>
            <div style="flex: 1;">
                <div style="font-weight: 700; margin-bottom: 0.25rem;">${title}</div>
                <div style="font-size: 0.875rem; opacity: 0.9; line-height: 1.4;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.25rem; padding: 0.2rem; opacity: 0.7;">✕</button>
        </div>
    `;

  document.body.appendChild(notification);

  if (!document.getElementById("notificationStylesNav")) {
    const style = document.createElement("style");
    style.id = "notificationStylesNav";
    style.textContent = `
            @keyframes slideInNav {
                from { transform: translateX(450px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transition = "all 0.4s ease-out";
      notification.style.transform = "translateX(450px)";
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 400);
    }
  }, 6000);
}
// Helper: Similarity Calculator
function calculateSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 100.0;
  return ((longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)) * 100.0;
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) != s2.charAt(j - 1))
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// ==========================================
// CERTIFICATE GENERATION SYSTEM
// ==========================================

async function showPassedTestsForCertificate() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const results = await window.DB.getStudentResults(user.username);
  const passedTests = results.filter(r => r.status === 'passed');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px); z-index:10000;';

  let listHtml = passedTests.length > 0
    ? passedTests.map(test => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 1rem; margin-bottom: 1rem; box-sizing: border-box;">
            <div style="min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; text-align: left;">
                <span style="font-size: 0.7rem; color: var(--gray-400); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">${test.company}</span>
                <h4 style="margin: 0; font-size: 1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${test.testName}</h4>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.25rem;">
                    <span style="font-size: 0.75rem; color: var(--primary-300); background: rgba(99, 102, 241, 0.15); padding: 2px 8px; border-radius: 6px; font-weight: 500;">${test.difficulty} Level</span>
                    <span style="font-size: 0.75rem; color: #10b981; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 6px;">Score: ${test.score}%</span>
                </div>
            </div>
            <button class="btn btn-primary btn-sm" style="white-space: nowrap; padding: 0.5rem 1rem; min-width: unset; height: fit-content;" onclick="generateMeritCertificate('${test.id}')">Issue Certificate</button>
        </div>
      `).join('')
    : '<div style="padding: 2rem; color: var(--gray-500);">No specialized certificates available yet. Qualify a test to unlock!</div>';

  modal.innerHTML = `
    <div class="glass-panel bounce-in" style="max-width: 500px; width: 90%; padding: 2.5rem; background: #1a1b2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; color: #fff;">Claim Merit Certificate</h3>
            <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;" class="custom-scrollbar">
            ${listHtml}
        </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.showPassedTestsForCertificate = showPassedTestsForCertificate;

async function generateMeritCertificate(resultId, action = 'download') {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  try {
    let results = await window.DB.getStudentResults(user.username);
    const result = results.find(r => String(r.id) === String(resultId) || String(r.testId) === String(resultId));

    if (!result || result.status !== 'passed') {
      showNotification("Not Eligible", "Only passed assessments are eligible for certification.", "warning");
      return;
    }

    // First notify the user that they are eligible, when actually triggering download
    if (action === 'download') {
      showNotification("Eligible for Certificate – Download", "Your certificate is generating...", "info");
    }

    if (typeof window.jspdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => generateMeritCertificate(resultId, action);
      document.head.appendChild(script);
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Theme normalization
    const levelMap = { 'ec': 'easy', 'easy': 'easy', 'medium': 'medium', 'hard': 'hard' };
    const level = (result.difficulty && levelMap[result.difficulty.toLowerCase()]) ? levelMap[result.difficulty.toLowerCase()] : 'medium';

    const themes = {
      easy: { primary: [16, 185, 129], secondary: [6, 95, 70], accent: [209, 250, 229] },
      medium: { primary: [30, 64, 175], secondary: [180, 83, 9], accent: [239, 246, 255] },
      hard: { primary: [153, 0, 0], secondary: [218, 165, 32], accent: [255, 241, 241] }
    };
    const theme = themes[level];

    // Level to Background Mapping
    const levelBgs = {
      'easy': 'assets/certificates/easy_bg.jpg',
      'medium': 'assets/certificates/medium_bg.jpg',
      'hard': 'assets/certificates/hard_bg.jpg'
    };
    const bgUrl = levelBgs[level];

    // Helper to load image as base64 to prevent jsPDF from crashing
    const loadImageAsDataUrl = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    };

    const bgBase64 = await loadImageAsDataUrl(bgUrl);
    const logoBase64 = await loadImageAsDataUrl("logo.png");

    // Add Background Template
    if (bgBase64) {
      try {
        const format = bgUrl.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
        doc.addImage(bgBase64, format, 0, 0, pageWidth, pageHeight);
      } catch (e) {
        console.warn("Template image drawing failed", e);
      }
    } else {
      console.warn("Template image load failed, falling back to clean design");
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
      doc.setLineWidth(2);
      doc.rect(5, 5, pageWidth-10, pageHeight-10);
    }

    // 0. College Branding (Top section)
    const logoSize = 18;
    if (logoBase64) {
      // Top-left logo position
      doc.addImage(logoBase64, 'PNG', 20, 16, logoSize, logoSize);
    }
    
    // Main College Name
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.text("JAMAL MOHAMED COLLEGE", pageWidth / 2, 22, { align: "center" });

    // Location & Autonomous Status
    doc.setFontSize(12);
    doc.text("(Autonomous) Tiruchirappalli-620020", pageWidth / 2, 29, { align: "center" });

    // Accreditation & Affiliation Details
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Accredited With A++ grade (4th cycle) with CGPA 3.69 out of 4.0 | Affiliated to Bharathidasan University", pageWidth / 2, 35, { align: "center" });

    // 1. Certificate Header (Shifted further down)
    doc.setFont("times", "bold");
    doc.setTextColor(153, 0, 0);
    doc.setFontSize(30); 
    doc.text("CERTIFICATE OF COMPLETION", pageWidth / 2, 54, { align: "center" });

    // 2. Presentation Text
    doc.setFontSize(15);
    doc.setFont("times", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text("This certificate is proudly presented to", pageWidth / 2, 74, { align: "center" });

    // 3. Student Name - Register Number
    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    const studentName = (user.name || user.username).toUpperCase();
    const regNo = user.username ? user.username.toUpperCase() : "N/A";
    const displayName = `${studentName} - ${regNo}`;
    doc.text(displayName, pageWidth / 2, 91, { align: "center" });

    // 4. Dynamic Test Statement
    doc.setFontSize(14);
    doc.setFont("times", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text("for successfully completing the assessment titled", pageWidth / 2, 106, { align: "center" });

    // 5. Test Name & Difficulty Level
    const testNameText = (result.testName || "Assessment").toUpperCase();
    const difficultyColors = {
      easy: [16, 140, 90],
      medium: [30, 64, 175],
      hard: [180, 20, 20]
    };
    const diffColor = difficultyColors[level] || [30, 64, 175];

    doc.setFontSize(20);
    doc.setFont("times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(testNameText, pageWidth / 2, 121, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
    doc.text(`[ ${result.difficulty.toUpperCase()} LEVEL ]`, pageWidth / 2, 131, { align: "center" });

    // 6. Organization Context
    doc.setFontSize(14);
    doc.setFont("times", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text("Conducted by the PLACEMENT PORTAL", pageWidth / 2, 144, { align: "center" });

    // 7. Date of Completion
    const dateStr = new Date(result.date || result.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont("times", "bold");
    doc.text(`completed on ${dateStr}`, pageWidth / 2, 156, { align: "center" });

    // 8. Award Statement
    doc.setFontSize(13);
    doc.text("This activity was evaluated and awarded by", pageWidth / 2, 168, { align: "center" });

    // ═══════════════════════════════════════════════════════════════
    // 9. Footer Zone — Date of Issue (left) | Head of Department (right)
    //    Positioned at bottom with clear gap above content
    // ═══════════════════════════════════════════════════════════════
    const footerLineY = pageHeight - 28;
    const footerLabelY = footerLineY + 6;

    doc.setLineWidth(0.5);
    doc.setDrawColor(60, 60, 60);

    // Left: Date of Issue
    doc.line(25, footerLineY, 85, footerLineY);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Date of Issue", 55, footerLabelY, { align: "center" });

    // Right: Head of the Department
    doc.line(pageWidth - 85, footerLineY, pageWidth - 25, footerLineY);
    doc.text("Head of the Department", pageWidth - 55, footerLabelY, { align: "center" });

    if (action === 'preview-modal') {
      showCertificatePreviewModal(doc.output('bloburl'), result.testName);
    } else {
      // Log for history & download (wrapped in separate try-catch so it doesn't block download)
      try {
        const apiBase = window.DB?.API_URL || "/api";
        await fetch(`${apiBase}/certificates/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentUsername: user.username,
            testId: result.testId || result.id, // Prefer original testId if available
            serialNumber: `JMC-${Date.now()}`,
            metadata: { testName: result.testName, score: result.score, difficulty: result.difficulty, company: result.company }
          })
        });
      } catch (logErr) {
        console.warn("Could not log certificate to backend:", logErr);
      }
      
      doc.save(`Certificate_${result.testName || 'Achievement'}.pdf`);
      showNotification("Success", "Certificate downloaded successfully", "success");
      loadCertificationHistory();
    }
  } catch (err) {
    console.error("Cert Gen Error:", err);
    showNotification("Error", "Failed to generate certificate.", "error");
  }
}
window.generateMeritCertificate = generateMeritCertificate;

function showCertificatePreviewModal(blobUrl, testName) {
  const existing = document.getElementById('cert-preview-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'cert-preview-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:20000;';

  overlay.innerHTML = `
    <div style="width:90%; max-width:950px; height:85vh; background:#1a1b2e; border-radius:20px; display:flex; flex-direction:column; overflow:hidden;">
      <div style="padding:1rem 2rem; background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1);">
        <h3 style="margin:0; color:#fff;">${testName} Preview</h3>
        <button onclick="document.getElementById('cert-preview-overlay').remove()" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;">&times;</button>
      </div>
      <div style="flex:1; background:#fff;">
        <iframe src="${blobUrl}" style="width:100%; height:100%; border:none;"></iframe>
      </div>
      <div style="padding:1rem 2rem; background:rgba(255,255,255,0.02); display:flex; justify-content:flex-end; gap:12px;">
         <button class="btn btn-ghost" onclick="document.getElementById('cert-preview-overlay').remove()" style="color:#fff;">Close</button>
         <a href="${blobUrl}" download="Certificate_${testName}.pdf" class="btn btn-primary" style="text-decoration:none;">Download PDF</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function loadCertificationHistory() {
  const tbody = document.getElementById("certificationHistoryBody");
  if (!tbody) return;

  // Clear immediately with feedback
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--gray-400);">
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
      <span style="font-size: 1.25rem;">⏳</span> Synchronizing Credentials...
    </div>
  </td></tr>`;

  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const apiBase = window.DB?.API_URL || "/api";
    
    const [results, issuedResponse] = await Promise.all([
      window.DB.getStudentResults(user.username).catch(() => []),
      fetch(`${apiBase}/certificates/history?username=${user.username}`).catch(() => ({ ok: false }))
    ]);

    const issuedCerts = (issuedResponse && issuedResponse.ok) ? await issuedResponse.json() : [];
    
    // Generate a Set of unique testIds that have an official certificate log in the backend
    const generatedTestIds = new Set(issuedCerts.map(c => String(c.testId)));

    // STRICT FILTER: Only show tests where the student:
    // 1. Result exists and is not 'incomplete'
    // 2. Status is officially 'passed' (indicating they met staff-set score requirement)
    // 3. A certificate record actually exists in the generation history
    const certifiedResults = (results || []).filter(r => {
      const hasCertificate = generatedTestIds.has(String(r.testId));
      const hasPassed = r.status && r.status.toLowerCase() === 'passed';
      return !r.isIncomplete && hasPassed && hasCertificate;
    });

    if (certifiedResults.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 4rem; color: var(--gray-500);">
          <div style="opacity: 0.15; font-size: 4rem; margin-bottom: 1rem;">🏆</div>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No Certificates Earned Yet</h3>
          <p style="max-width: 400px; margin: 0 auto;">Achievement records will appear here once you pass a professional assessment and download your certificate.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = certifiedResults.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).map(res => {
      const testDate = new Date(res.date || res.createdAt).toLocaleDateString();
      const diff = (res.difficulty || 'Medium').toLowerCase();
      const badgeStyles = diff === 'hard' ? 'background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);' :
                         (diff === 'easy' || diff === 'ec' ? 'background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);' :
                         'background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2);');

      return `
        <tr style="animation: fadeIn 0.4s ease-out; border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.01)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 1.25rem 0.75rem 1.25rem 1rem; width: 40%;">
            <div style="display: flex; align-items: center; gap: 12px; max-width: 100%;">
              <div style="width: 38px; height: 38px; border-radius: 11px; background: rgba(99, 102, 241, 0.12); color: #818cf8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(99,102,241,0.15);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 18px; height: 18px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <div style="overflow: hidden;">
                <div style="font-weight: 700; color: #fff; font-size: 0.95rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; line-height: 1.2;">${res.testName}</div>
                <div style="font-size: 0.65rem; color: #6366f1; font-weight: 700; margin-top: 2px; letter-spacing: 0.02em;">OFFICIAL CERTIFICATE</div>
              </div>
            </div>
          </td>
          <td style="color: var(--gray-400); font-weight: 500; font-size: 0.85rem; padding-left: 0; width: 15%;">${testDate}</td>
          <td style="text-align: center; vertical-align: middle; width: 12%;"><span class="badge" style="padding: 5px 14px; border-radius: 20px; font-weight: 700; font-size: 0.65rem; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); ${badgeStyles}">${diff.toUpperCase()}</span></td>
          <td style="text-align: center; vertical-align: middle; width: 10%;"><div style="font-weight: 800; color: #10b981; font-size: 1.1rem; letter-spacing: -0.01em;">${res.score}%</div></td>
          <td style="text-align: right; vertical-align: middle; padding: 1.25rem 1.5rem 1.25rem 0;">
             <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
               <button onclick="generateMeritCertificate('${res.id}', 'preview-modal')" 
                       onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.4)'; this.style.color='#fff'" 
                       onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(255,255,255,0.2)'; this.style.color='rgba(255,255,255,0.8)'"
                       class="btn btn-sm" 
                       style="background: transparent; border: 1.5px solid rgba(255, 255, 255, 0.2); color: rgba(255,255,255,0.8); border-radius: 50px; height: 36px; width: 105px; font-weight: 700; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-transform: uppercase; letter-spacing: 0.02em;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 13px; height: 13px; flex-shrink: 0;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                 Preview
               </button>
               <button onclick="generateMeritCertificate('${res.id}', 'download')" 
                       class="btn btn-primary btn-sm" 
                       style="background: linear-gradient(135deg, #6366f1, #4f46e5); border: none; color: #fff; border-radius: 50px; height: 36px; width: 115px; font-weight: 800; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: all 0.2s ease; cursor: pointer; text-transform: uppercase; letter-spacing: 0.02em;"
                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 18px rgba(99, 102, 241, 0.45)'; this.style.filter='brightness(1.1)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.3)'; this.style.filter='none'">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 13px; height: 13px; flex-shrink: 0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 Save PDF
               </button>
             </div>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error('Cert History Refresh Error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 3rem; color: #ef4444;">Failed to load certificate history. Please refresh the page.</td></tr>`;
  }
}
window.loadCertificationHistory = loadCertificationHistory;

async function generatePerformanceReport(format = 'pdf') {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const results = window.currentStudentResults || await window.DB.getStudentResults(user.username);
  
  if (!results || results.length === 0) {
    showNotification('Not Available', 'You need to complete at least one test to generate a transcript.', 'warning');
    return;
  }

  showNotification('Report', 'Compiling your academic transcript...', 'info');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Branding
    doc.setFont('Inter', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('PERFORMANCE TRANSCRIPT', 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('JAMAL MOHAMED COLLEGE (AUTONOMOUS)', 20, 38);
    doc.text('Training & Placement Cell', 20, 43);

    // Student Header
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 50, 170, 35, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(`Candidate Name: ${user.name || user.username}`, 25, 60);
    doc.text(`Registration No: ${user.details?.registerNumber || user.username}`, 25, 67);
    doc.text(`Department: ${user.details?.department || 'N/A'}`, 25, 74);
    
    doc.text(`Batch: ${user.details?.batch || 'N/A'}`, 120, 60);
    doc.text(`Status: ${results.length} Assessments Completed`, 120, 67);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 120, 74);

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(20, 95, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('TEST NAME', 25, 101.5);
    doc.text('COMPANY', 80, 101.5);
    doc.text('DATE', 130, 101.5);
    doc.text('SCORE', 160, 101.5);
    doc.text('RESULT', 180, 101.5, { align: 'right' });

    // Table Body
    let y = 112;
    results.forEach((r, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('Inter', 'normal');
      doc.text((r.testName || 'Unknown').substring(0, 25), 25, y);
      doc.text((r.company || '--').substring(0, 20), 80, y);
      doc.text(new Date(r.date || r.createdAt).toLocaleDateString(), 130, y);
      doc.text(`${r.score}%`, 160, y);
      
      const statusColor = r.status === 'passed' ? [16, 185, 129] : [239, 68, 68];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont('Inter', 'bold');
      doc.text(r.status?.toUpperCase() || '--', 185, y, { align: 'right' });
      
      y += 8;
      doc.setDrawColor(241, 245, 249);
      doc.line(20, y - 4, 190, y - 4);
    });

    // Summary Analytics
    y += 10;
    const passed = results.filter(r => r.status === 'passed').length;
    const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    
    doc.setFont('Inter', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('SUMMARY ANALYTICS', 20, y); y += 10;
    
    doc.setFont('Inter', 'normal');
    doc.text(`Achievement Rate: ${Math.round((passed / results.length) * 100)}%`, 20, y);
    doc.text(`Aggregate Proficiency: ${avg}%`, 100, y);

    // Verified Signature Placeholder
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('* This is a computer-generated transcript from the JMC TEST system. QR verification available on digital certificates.', 105, 285, { align: 'center' });

    doc.save(`Transcript_${user.username}.pdf`);
    showNotification('Success', 'Performance transcript generated.', 'success');
  } catch (err) {
    console.error('Report error:', err);
    showNotification('Error', 'Failed to generate report.', 'error');
  }
}
window.generatePerformanceReport = generatePerformanceReport;
