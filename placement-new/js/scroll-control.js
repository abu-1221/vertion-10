/* Professional Scroll Controller Logic */

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('.main-content');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');

    if (!mainContent) return;

    // Function to update indicator
    const updateIndicator = () => {
        if (!scrollIndicator) return;
        
        const winScroll = mainContent.scrollTop;
        const height = mainContent.scrollHeight - mainContent.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        // Match the indicator width (30%) subtraction
        const safeScrolled = Math.max(0, Math.min(70, scrolled * 0.7)); 
        scrollIndicator.style.left = safeScrolled + '%';
    };

    // Main content scroll listener
    mainContent.addEventListener('scroll', updateIndicator);

    // Initial check
    updateIndicator();

    // Button controls
    if (scrollUpBtn) {
        scrollUpBtn.addEventListener('click', () => {
            mainContent.scrollBy({
                top: -200,
                behavior: 'smooth'
            });
        });
    }

    if (scrollDownBtn) {
        scrollDownBtn.addEventListener('click', () => {
            mainContent.scrollBy({
                top: 200,
                behavior: 'smooth'
            });
        });
    }

    // Scroll by dragging visualizer
    const visualizer = document.querySelector('.scroll-visualizer');
    if (visualizer) {
        let isDragging = false;

        const handleDrag = (e) => {
            if (!isDragging) return;
            const rect = visualizer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            const scrollTarget = percent * (mainContent.scrollHeight - mainContent.clientHeight);
            mainContent.scrollTop = scrollTarget;
        };

        visualizer.addEventListener('mousedown', (e) => {
            isDragging = true;
            handleDrag(e);
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', () => {
                isDragging = false;
                document.removeEventListener('mousemove', handleDrag);
            }, { once: true });
        });
        
        visualizer.style.cursor = 'pointer';
    }
});
