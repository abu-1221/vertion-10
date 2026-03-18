/**
 * Zoom Control Functionality for JMC-Test Dashboards
 * Restricted to Dashboard Content area only.
 */

(function () {
    let zoomLevel = 0; // 0: 100%, 1-8: progressively smaller
    const ZOOM_VALUES = [100, 92.5, 85, 77.5, 70, 62.5, 55, 47.5, 40];
    const MAX_OUT = 8;

    function applyZoom() {
        const target = document.querySelector('.dashboard-content');
        if (target) {
            target.style.zoom = ZOOM_VALUES[zoomLevel] + '%';
        }

        // Update button states
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        // Zoom In (Ceiling = 100% / zoomLevel 0)
        if (zoomInBtn) {
            zoomInBtn.style.opacity = zoomLevel === 0 ? '0.2' : '1';
            zoomInBtn.style.pointerEvents = zoomLevel === 0 ? 'none' : 'auto';
        }

        // Zoom Out (Boundary = 40% / zoomLevel 8)
        if (zoomOutBtn) {
            zoomOutBtn.style.opacity = zoomLevel >= MAX_OUT ? '0.2' : '1';
            zoomOutBtn.style.pointerEvents = zoomLevel >= MAX_OUT ? 'none' : 'auto';
        }
    }

    window.zoomIn = function () {
        if (zoomLevel > 0) {
            zoomLevel--;
            applyZoom();
        }
    };

    window.zoomOut = function () {
        if (zoomLevel < MAX_OUT) {
            zoomLevel++;
            applyZoom();
        }
    };

    window.resetZoom = function () {
        zoomLevel = 0;
        applyZoom();
    };

    // Keyboard Shortcuts like Ctrl+8 / Ctrl+0 (requested behavior)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            if (e.key === '8') {
                e.preventDefault();
                // To match behavior "until that limit"
                while (zoomLevel < MAX_OUT) {
                    zoomLevel++;
                }
                applyZoom();
            } else if (e.key === '0') {
                e.preventDefault();
                window.resetZoom();
            }
        }
    });

    // Initialize UI buttons
    document.addEventListener('DOMContentLoaded', () => {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) zoomInBtn.addEventListener('click', window.zoomIn);
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', window.zoomOut);
    });
})();
