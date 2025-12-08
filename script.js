document.addEventListener('DOMContentLoaded', () => {



    // --- Mobile Menu Toggle ---
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMenuBtn = document.querySelector('.close-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    function toggleMenu() {
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    }

    hamburger.addEventListener('click', toggleMenu);
    closeMenuBtn.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', toggleMenu);
    });

    // --- Header Scroll Effect ---
    const header = document.getElementById('header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Active Link Highlighting on Scroll ---
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // --- Intersection Observer for Animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                entry.target.classList.add('visible'); // For hero fade-up class
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-fade-up, .animate-fade-left');
    animatedElements.forEach(el => observer.observe(el));

    // --- Floating Icons Background Generator ---
    const bgContainer = document.querySelector('.background-animation');
    const icons = ['<i class="fab fa-react"></i>', '<i class="fab fa-js"></i>', '<i class="fab fa-html5"></i>', '<i class="fab fa-css3"></i>', '<i class="fab fa-node"></i>', '<i class="fas fa-code"></i>', '<i class="fas fa-terminal"></i>', '{}', '</>'];
    const iconCount = 20; // Number of floating icons

    for (let i = 0; i < iconCount; i++) {
        const iconDiv = document.createElement('div');
        iconDiv.classList.add('floating-icon');
        iconDiv.innerHTML = icons[Math.floor(Math.random() * icons.length)];

        // Randomize position and animation properties
        const leftPos = Math.random() * 100; // 0% to 100%
        const delay = Math.random() * 15; // 0s to 15s delay
        const duration = 15 + Math.random() * 20; // 15s to 35s duration
        const size = 1 + Math.random() * 2; // 1rem to 3rem size

        iconDiv.style.left = `${leftPos}%`;
        iconDiv.style.animationDelay = `-${delay}s`; // Start partially through animation
        iconDiv.style.animationDuration = `${duration}s`;
        iconDiv.style.fontSize = `${size}rem`;

        bgContainer.appendChild(iconDiv);
    }
});
