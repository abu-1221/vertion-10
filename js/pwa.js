// ═══════════════════════════════════════════════════════════════════════
// JMC TEST — PWA Registration & Install Prompt Manager
// Registers service worker, handles install banner, and update prompts
// ═══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Configuration ───
  const PWA_CONFIG = {
    swPath: '/sw.js',
    updateCheckInterval: 60 * 60 * 1000, // Check for updates every hour
    installBannerDelay: 30000, // Show install banner after 30s on page
  };

  // ─── State ───
  let deferredPrompt = null;
  let installBannerShown = false;
  let swRegistration = null;

  // ═══════════════ SERVICE WORKER REGISTRATION ═══════════════
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Workers not supported');
      return;
    }

    try {
      swRegistration = await navigator.serviceWorker.register(PWA_CONFIG.swPath, {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered successfully');

      // Listen for updates
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        console.log('[PWA] New Service Worker found, installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            showUpdateNotification();
          }
        });
      });

      // Periodic update checks
      setInterval(() => {
        swRegistration.update();
      }, PWA_CONFIG.updateCheckInterval);

      // Trim caches periodically
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'trimCaches' });
      }

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  // ═══════════════ INSTALL PROMPT HANDLING ═══════════════
  // Capture the browser's install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt captured');

    // Show custom install banner after delay
    setTimeout(() => {
      if (!installBannerShown && !isAppInstalled()) {
        showInstallBanner();
      }
    }, PWA_CONFIG.installBannerDelay);
  });

  // Detect successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully!');
    deferredPrompt = null;
    hideInstallBanner();
    showToast('✅ JMC Test installed successfully!', 'success');
    // Track installation
    try {
      localStorage.setItem('jmc_pwa_installed', 'true');
      localStorage.setItem('jmc_pwa_installed_at', new Date().toISOString());
    } catch (e) { }
  });

  // ═══════════════ INSTALL BANNER UI ═══════════════
  function showInstallBanner() {
    if (isAppInstalled() || installBannerShown) return;
    installBannerShown = true;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <div class="pwa-banner-icon">
          <img src="/icons/icon-96x96.png" alt="JMC Test" width="48" height="48" 
               onerror="this.src='/logo.png'; this.style.width='48px'; this.style.height='48px';">
        </div>
        <div class="pwa-banner-text">
          <strong>Install JMC Test</strong>
          <span>Add to home screen for quick access</span>
        </div>
        <div class="pwa-banner-actions">
          <button class="pwa-btn-install" id="pwaBtnInstall">Install</button>
          <button class="pwa-btn-dismiss" id="pwaBtnDismiss">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      banner.classList.add('pwa-banner-visible');
    });

    // Event listeners
    document.getElementById('pwaBtnInstall').addEventListener('click', triggerInstall);
    document.getElementById('pwaBtnDismiss').addEventListener('click', () => {
      hideInstallBanner();
      // Don't show again for 7 days
      try {
        localStorage.setItem('jmc_pwa_dismissed', Date.now().toString());
      } catch (e) { }
    });
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('pwa-banner-visible');
      setTimeout(() => banner.remove(), 400);
    }
  }

  async function triggerInstall() {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available');
      return;
    }

    hideInstallBanner();
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User ${outcome} the install prompt`);
    deferredPrompt = null;
  }

  // ═══════════════ UPDATE NOTIFICATION ═══════════════
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="pwa-update-content">
        <div class="pwa-update-icon">🔄</div>
        <div class="pwa-update-text">
          <strong>Update Available</strong>
          <span>A new version of JMC Test is ready</span>
        </div>
        <button class="pwa-btn-update" id="pwaBtnUpdate">Update Now</button>
      </div>
    `;

    document.body.appendChild(notification);
    requestAnimationFrame(() => {
      notification.classList.add('pwa-update-visible');
    });

    document.getElementById('pwaBtnUpdate').addEventListener('click', () => {
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ action: 'skipWaiting' });
      }
      window.location.reload();
    });
  }

  // ═══════════════ HELPERS ═══════════════

  function isAppInstalled() {
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator.standalone === true) return true; // iOS Safari

    // Check if dismissed recently (within 7 days)
    try {
      const dismissed = localStorage.getItem('jmc_pwa_dismissed');
      if (dismissed) {
        const daysSinceDismiss = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismiss < 7) return true;
      }
    } catch (e) { }

    return false;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColors = {
      success: 'linear-gradient(135deg, #059669, #10b981)',
      info: 'linear-gradient(135deg, #4f46e5, #6366f1)',
      warning: 'linear-gradient(135deg, #d97706, #f59e0b)',
      error: 'linear-gradient(135deg, #dc2626, #ef4444)',
    };

    toast.style.cssText = `
      position: fixed; top: 1.5rem; right: 1.5rem; z-index: 99999;
      background: ${bgColors[type] || bgColors.info};
      color: white; padding: 1rem 1.5rem; border-radius: 12px;
      font-size: 0.9rem; font-weight: 600; font-family: 'Inter', sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: pwaToastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 340px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ═══════════════ ONLINE / OFFLINE STATUS ═══════════════
  function handleConnectivityChange() {
    if (navigator.onLine) {
      showToast('🟢 Back online!', 'success');
      // Sync any pending actions
      if (swRegistration && 'sync' in swRegistration) {
        swRegistration.sync.register('sync-pending-actions');
      }
    } else {
      showToast('🔴 You are offline. Some features may be limited.', 'warning');
    }
  }

  window.addEventListener('online', handleConnectivityChange);
  window.addEventListener('offline', handleConnectivityChange);

  // ═══════════════ INJECT PWA STYLES ═══════════════
  function injectPWAStyles() {
    const style = document.createElement('style');
    style.id = 'pwa-styles';
    style.textContent = `
      /* ─── PWA Install Banner ─── */
      #pwa-install-banner {
        position: fixed;
        bottom: -120px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99998;
        width: calc(100% - 2rem);
        max-width: 480px;
        transition: bottom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #pwa-install-banner.pwa-banner-visible {
        bottom: 1.5rem;
      }
      .pwa-banner-content {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.1);
        backdrop-filter: blur(20px);
      }
      .pwa-banner-icon img {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .pwa-banner-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
      .pwa-banner-text strong {
        color: #e0e7ff;
        font-size: 0.95rem;
        font-family: 'Inter', sans-serif;
      }
      .pwa-banner-text span {
        color: #a5b4fc;
        font-size: 0.78rem;
        font-family: 'Inter', sans-serif;
      }
      .pwa-banner-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      .pwa-btn-install {
        padding: 0.55rem 1.25rem;
        background: linear-gradient(135deg, #6366f1, #818cf8);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.85rem;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }
      .pwa-btn-install:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
      }
      .pwa-btn-dismiss {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        color: #a5b4fc;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s ease;
      }
      .pwa-btn-dismiss:hover {
        background: rgba(255, 255, 255, 0.15);
        color: white;
      }

      /* ─── PWA Update Notification ─── */
      #pwa-update-notification {
        position: fixed;
        top: -80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        width: calc(100% - 2rem);
        max-width: 420px;
        transition: top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #pwa-update-notification.pwa-update-visible {
        top: 1.5rem;
      }
      .pwa-update-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        background: linear-gradient(135deg, #064e3b, #065f46);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }
      .pwa-update-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }
      .pwa-update-text {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .pwa-update-text strong {
        color: #d1fae5;
        font-size: 0.9rem;
        font-family: 'Inter', sans-serif;
      }
      .pwa-update-text span {
        color: #6ee7b7;
        font-size: 0.75rem;
        font-family: 'Inter', sans-serif;
      }
      .pwa-btn-update {
        padding: 0.45rem 1rem;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.8rem;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .pwa-btn-update:hover {
        transform: scale(1.05);
      }

      /* ─── Toast Animation ─── */
      @keyframes pwaToastIn {
        from {
          opacity: 0;
          transform: translateX(100%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      /* ─── iOS Install Prompt ─── */
      #ios-install-prompt {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 99998;
        padding: 1.5rem;
        background: linear-gradient(135deg, #1e1b4b, #312e81);
        border-top: 1px solid rgba(99, 102, 241, 0.3);
        text-align: center;
        transform: translateY(100%);
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #ios-install-prompt.visible {
        transform: translateY(0);
      }
      #ios-install-prompt p {
        color: #e0e7ff;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        margin: 0 0 0.5rem;
      }
      #ios-install-prompt .ios-share-icon {
        display: inline-block;
        width: 20px;
        height: 20px;
        vertical-align: middle;
      }

      /* ─── Responsive ─── */
      @media (max-width: 480px) {
        #pwa-install-banner {
          width: calc(100% - 1rem);
        }
        .pwa-banner-content {
          padding: 0.85rem 1rem;
          gap: 0.65rem;
        }
        .pwa-banner-icon img {
          width: 40px !important;
          height: 40px !important;
        }
        .pwa-banner-text strong {
          font-size: 0.85rem;
        }
        .pwa-btn-install {
          padding: 0.45rem 0.9rem;
          font-size: 0.8rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════ iOS SAFARI INSTALL PROMPT ═══════════════
  function showIOSInstallPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandalone = window.navigator.standalone === true;

    if (isIOS && !isInStandalone) {
      setTimeout(() => {
        try {
          const dismissed = localStorage.getItem('jmc_ios_dismissed');
          if (dismissed) {
            const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
            if (daysSince < 14) return;
          }
        } catch (e) { }

        const prompt = document.createElement('div');
        prompt.id = 'ios-install-prompt';
        prompt.innerHTML = `
          <p><strong>Install JMC Test</strong></p>
          <p>Tap <svg class="ios-share-icon" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> then <strong>"Add to Home Screen"</strong></p>
          <button onclick="this.parentElement.classList.remove('visible'); try{localStorage.setItem('jmc_ios_dismissed',Date.now().toString())}catch(e){}" 
                  style="margin-top:0.5rem;padding:0.4rem 1.2rem;background:rgba(255,255,255,0.1);color:#a5b4fc;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;font-size:0.8rem;">
            Got it
          </button>
        `;
        document.body.appendChild(prompt);
        requestAnimationFrame(() => prompt.classList.add('visible'));
      }, 5000);
    }
  }

  // ═══════════════ INITIALIZATION ═══════════════
  function init() {
    injectPWAStyles();
    registerServiceWorker();
    showIOSInstallPrompt();
    console.log('[PWA] Module initialized');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
