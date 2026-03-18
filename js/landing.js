// Landing Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal, .feature-card, .testimonial-card');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
        el.classList.add('reveal'); // Ensure reveal class is present
        revealObserver.observe(el);
    });

    // Initial Reveal for elements in view
    const initialCheck = () => {
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                el.classList.add('active');
            }
        });
    };
    initialCheck();

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });

                mobileMenu?.classList.remove('active');
                mobileMenuBtn?.classList.remove('active');
            }
        });
    });
});

// Contact Form Handler
function handleContactSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('contactName')?.value.trim();
    const email = document.getElementById('contactEmail')?.value.trim();
    const subject = document.getElementById('contactSubject')?.value.trim();
    const message = document.getElementById('contactMessage')?.value.trim();

    if (!name || !email || !subject || !message) {
        alert('Please fill in all required fields.');
        return false;
    }

    // Show success message
    const btn = document.getElementById('contactSubmitBtn');
    const successDiv = document.getElementById('contactSuccess');
    if (btn) {
        btn.textContent = 'Sending...';
        btn.disabled = true;
    }

    setTimeout(() => {
        if (successDiv) successDiv.style.display = 'block';
        if (btn) {
            btn.textContent = 'Send Message';
            btn.disabled = false;
        }
        document.getElementById('contactForm')?.reset();
        setTimeout(() => {
            if (successDiv) successDiv.style.display = 'none';
        }, 4000);
    }, 800);

    return false;
}
