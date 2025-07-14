// Advanced Live Server Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initCopyButtons();
    initMobileNavigation();
    initSmoothScrolling();
    initScrollEffects();
    initAnimations();
});

// Copy to clipboard functionality
function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const codeBlock = this.closest('.code-block');
            const code = this.getAttribute('data-code');
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    showCopySuccess(this);
                }).catch(() => {
                    fallbackCopyTextToClipboard(code, this);
                });
            } else {
                fallbackCopyTextToClipboard(code, this);
            }
        });
    });
}

function showCopySuccess(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i>';
    button.style.background = 'rgba(72, 187, 120, 0.2)';
    button.style.color = '#48bb78';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = 'rgba(255, 255, 255, 0.1)';
        button.style.color = '#e2e8f0';
    }, 2000);
}

function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess(button);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

// Mobile navigation
function initMobileNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Scroll effects
function initScrollEffects() {
    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const isDarkMode = document.body.classList.contains('dark-theme');
        
        if (window.scrollY > 50) {
            if (isDarkMode) {
                navbar.style.background = 'rgba(26, 32, 44, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            }
        } else {
            if (isDarkMode) {
                navbar.style.background = 'rgba(26, 32, 44, 0.95)';
                navbar.style.boxShadow = 'none';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = 'none';
            }
        }
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .install-card, .reason');
    animateElements.forEach(el => observer.observe(el));
}

// Initialize animations
function initAnimations() {
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: slideInUp 0.6s ease forwards;
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .nav-links.active {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-top: 1px solid var(--border-color);
        }
        
        .dark-theme .nav-links.active {
            background: rgba(26, 32, 44, 0.98);
            border-top: 1px solid #4a5568;
        }
        
        .nav-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .nav-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .nav-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    `;
    document.head.appendChild(style);
}

// Statistics counter animation
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = counter.textContent;
        const isNumber = !isNaN(target);
        
        if (isNumber) {
            const targetNum = parseInt(target);
            let currentNum = 0;
            const increment = targetNum / 50;
            
            const updateCounter = () => {
                if (currentNum < targetNum) {
                    currentNum += increment;
                    counter.textContent = Math.ceil(currentNum);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = targetNum;
                }
            };
            
            updateCounter();
        }
    });
}

// Initialize counter animation when stats come into view
const statsObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Add loading animation for code window
function initCodeWindowAnimation() {
    const codeWindow = document.querySelector('.code-window');
    if (codeWindow) {
        const lines = codeWindow.querySelectorAll('.code-line');
        
        lines.forEach((line, index) => {
            line.style.opacity = '0';
            line.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                line.style.transition = 'all 0.3s ease';
                line.style.opacity = '1';
                line.style.transform = 'translateX(0)';
            }, index * 200);
        });
    }
}

// Initialize code window animation after page load
setTimeout(initCodeWindowAnimation, 1000);

// Add hover effects for feature cards
function initHoverEffects() {
    const cards = document.querySelectorAll('.feature-card, .install-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Initialize hover effects
initHoverEffects();

// Add parallax effect to hero section
function initParallax() {
    const hero = document.querySelector('.hero');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        if (hero) {
            hero.style.transform = `translateY(${rate}px)`;
        }
    });
}

// Initialize parallax effect
initParallax();

// Add typing effect to hero title
function initTypingEffect() {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    
    const text = title.textContent;
    title.textContent = '';
    
    let i = 0;
    const typeWriter = () => {
        if (i < text.length) {
            title.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        }
    };
    
    // Start typing effect after a short delay
    setTimeout(typeWriter, 500);
}

// Initialize typing effect
initTypingEffect();

// Add search functionality for features
function initSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search features...';
    searchInput.className = 'feature-search';
    
    const featuresSection = document.querySelector('.features');
    if (featuresSection) {
        const sectionHeader = featuresSection.querySelector('.section-header');
        sectionHeader.appendChild(searchInput);
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const featureCards = document.querySelectorAll('.feature-card');
            
            featureCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                } else {
                    card.style.opacity = '0.3';
                }
            });
        });
    }
}

// Add CSS for search input
const searchStyle = document.createElement('style');
searchStyle.textContent = `
    .feature-search {
        margin-top: 20px;
        padding: 12px 16px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        font-size: 1rem;
        width: 100%;
        max-width: 400px;
        transition: border-color 0.3s ease;
        background: var(--bg-primary);
        color: var(--text-primary);
    }
    
    .feature-search:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    
    .feature-search::placeholder {
        color: var(--text-light);
    }
    
    .dark-theme .feature-search {
        background: #2d3748;
        border-color: #4a5568;
        color: #f7fafc;
    }
    
    .dark-theme .feature-search:focus {
        border-color: #667eea;
    }
    
        .dark-theme .feature-search::placeholder {
        color: #9ca3af;
    }
    
    .feature-search:focus {
        outline: none;
        border-color: var(--primary-color);
    }
`;
document.head.appendChild(searchStyle);

// Initialize search functionality
initSearch();

// Add theme toggle (light/dark mode)
function initThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.className = 'theme-toggle';
    themeToggle.title = 'Toggle theme';
    
    const navbar = document.querySelector('.nav-container');
    if (navbar) {
        navbar.appendChild(themeToggle);
        
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const icon = this.querySelector('i');
            
            if (document.body.classList.contains('dark-theme')) {
                icon.className = 'fas fa-sun';
                localStorage.setItem('theme', 'dark');
            } else {
                icon.className = 'fas fa-moon';
                localStorage.setItem('theme', 'light');
            }
            
            // Trigger scroll event to update navbar background
            window.dispatchEvent(new Event('scroll'));
        });
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.querySelector('i').className = 'fas fa-sun';
        }
    }
}

// Add CSS for theme toggle and dark theme
const themeStyle = document.createElement('style');
themeStyle.textContent = `
    .theme-toggle {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    
    .theme-toggle:hover {
        background: rgba(102, 126, 234, 0.1);
        color: var(--primary-color);
    }
    
    .dark-theme .theme-toggle {
        color: #e2e8f0;
    }
    
    .dark-theme .theme-toggle:hover {
        background: rgba(102, 126, 234, 0.2);
        color: #667eea;
    }
`;
document.head.appendChild(themeStyle);

// Initialize theme toggle
initThemeToggle();

// Add scroll to top button
function initScrollToTop() {
    const scrollButton = document.createElement('button');
    scrollButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollButton.className = 'scroll-to-top';
    scrollButton.title = 'Scroll to top';
    
    document.body.appendChild(scrollButton);
    
    scrollButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            scrollButton.style.opacity = '1';
            scrollButton.style.pointerEvents = 'auto';
        } else {
            scrollButton.style.opacity = '0';
            scrollButton.style.pointerEvents = 'none';
        }
    });
}

// Add CSS for scroll to top button
const scrollButtonStyle = document.createElement('style');
scrollButtonStyle.textContent = `
    .scroll-to-top {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--gradient-primary);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: var(--shadow-lg);
    }
    
    .scroll-to-top:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-xl);
    }
`;
document.head.appendChild(scrollButtonStyle);

// Initialize scroll to top button
initScrollToTop();

console.log('🚀 Advanced Live Server website loaded successfully!'); 