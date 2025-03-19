document.addEventListener('DOMContentLoaded', function() {
  // Initialize animations
  initScrollAnimations();
  initTabSystem();
  initWaveAnimation();
  
  // Add header scroll effect
  handleHeaderScroll();
  
  // Initialize new interactive elements
  initUseCaseCarousel();
  initTestimonialsSlider();
  initAccordions();
  initSmoothScrolling();
  initMobileMenu();
  initFormSubmission();
});

// Handle header appearance on scroll
function handleHeaderScroll() {
  const header = document.querySelector('.site-header');
  let lastScrollTop = 0;
  
  window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 100) {
      header.style.padding = '1rem 0';
      header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
    } else {
      header.style.padding = '1.5rem 0';
      header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScrollTop = scrollTop;
  });
}

// Initialize scroll animations using Intersection Observer
function initScrollAnimations() {
  // Add fade-in class to elements that should animate on scroll
  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    const headings = section.querySelectorAll('h2, h3');
    const paragraphs = section.querySelectorAll('p');
    const cards = section.querySelectorAll('.benefit-card, .feature-content');
    
    headings.forEach(el => el.classList.add('fade-in'));
    paragraphs.forEach(el => el.classList.add('fade-in'));
    
    if (cards.length) {
      cards.forEach((card, index) => {
        card.classList.add('stagger-item');
        card.style.transitionDelay = `${index * 0.1}s`;
      });
    }
  });
  
  // Create intersection observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1
  });
  
  // Observe all elements with animation classes
  document.querySelectorAll('.fade-in, .stagger-item').forEach(el => {
    observer.observe(el);
  });
}

// Initialize tab system
function initTabSystem() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Initialize wave animation
function initWaveAnimation() {
  const heroSection = document.querySelector('.hero');
  
  // Create animated particles
  for (let i = 0; i < 20; i++) {
    createParticle(heroSection);
  }
}

// Create floating particle
function createParticle(parent) {
  const particle = document.createElement('div');
  particle.classList.add('particle');
  
  // Random position, size and animation duration
  const size = Math.random() * 10 + 5;
  const posX = Math.random() * 100;
  const posY = Math.random() * 100;
  const duration = Math.random() * 20 + 10;
  const delay = Math.random() * 5;
  
  particle.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    top: ${posY}%;
    left: ${posX}%;
    animation: float ${duration}s ease-in-out ${delay}s infinite;
    z-index: 0;
  `;
  
  parent.appendChild(particle);
}

// Add custom cursor effect
function initCustomCursor() {
  const cursor = document.createElement('div');
  cursor.classList.add('custom-cursor');
  document.body.appendChild(cursor);
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });
  
  // Add ripple effect on click
  document.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.classList.add('cursor-ripple');
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 1000);
  });
}

// Add typing animation to hero description
function initTypingAnimation() {
  const textElement = document.querySelector('.hero-description');
  const text = textElement.textContent;
  textElement.textContent = '';
  
  let i = 0;
  const typeInterval = setInterval(() => {
    if (i < text.length) {
      textElement.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(typeInterval);
    }
  }, 30);
}

// Create animated counter for social proof
function animateCounter() {
  const counterElement = document.querySelector('.count');
  const target = parseInt(counterElement.textContent);
  let count = 0;
  
  const interval = setInterval(() => {
    if (count < target) {
      count++;
      counterElement.textContent = count;
    } else {
      clearInterval(interval);
    }
  }, 15);
}

// Add event listeners for dashboard preview interaction
function initDashboardInteraction() {
  const dashboard = document.querySelector('.dashboard-preview');
  
  if (!dashboard) return;
  
  dashboard.addEventListener('mousemove', (e) => {
    const rect = dashboard.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const rotateY = 15 * (0.5 - x);
    const rotateX = 10 * (y - 0.5);
    
    dashboard.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  });
  
  dashboard.addEventListener('mouseleave', () => {
    dashboard.style.transform = 'perspective(1000px) rotateY(-15deg) rotateX(5deg)';
  });
}

// Initialize use case carousel
function initUseCaseCarousel() {
  const useCases = document.querySelectorAll('.use-case');
  const dots = document.querySelectorAll('.carousel-dot');
  
  if (!useCases.length || !dots.length) return;
  
  let currentIndex = 0;
  let autoplayInterval;

  // Function to show a specific use case
  function showUseCase(index) {
    // Hide all use cases
    useCases.forEach(useCase => useCase.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Show the selected use case
    useCases[index].classList.add('active');
    dots[index].classList.add('active');
    currentIndex = index;
  }

  // Add click event listeners to dots
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showUseCase(index);
      resetAutoplay();
    });
  });

  // Function to advance to the next use case
  function nextUseCase() {
    let nextIndex = currentIndex + 1;
    if (nextIndex >= useCases.length) {
      nextIndex = 0;
    }
    showUseCase(nextIndex);
  }

  // Function to reset autoplay
  function resetAutoplay() {
    clearInterval(autoplayInterval);
    autoplayInterval = setInterval(nextUseCase, 5000);
  }

  // Initialize the carousel
  showUseCase(0);
  resetAutoplay();

  // Pause autoplay when hovering over the carousel
  const carousel = document.querySelector('.use-cases-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => {
      clearInterval(autoplayInterval);
    });

    carousel.addEventListener('mouseleave', resetAutoplay);
  }
}

// Initialize testimonials slider
function initTestimonialsSlider() {
  const slider = document.querySelector('.testimonials-slider');
  const dots = document.querySelectorAll('.slider-dot');
  const cards = document.querySelectorAll('.testimonial-card');
  
  if (!slider || !cards.length) return;
  
  let currentIndex = 0;
  let autoplayInterval;

  // Calculate the width of a single card including gap
  const cardWidth = cards[0].offsetWidth;
  const gap = 32; // This should match the gap in your CSS
  const slideWidth = cardWidth + gap;

  // Function to slide to a specific index
  function slideTo(index) {
    // Update active dot
    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');

    // Slide the slider
    slider.style.transform = `translateX(-${index * slideWidth}px)`;
    slider.style.transition = 'transform 0.5s ease';
    currentIndex = index;
  }

  // Add click event listeners to dots
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      slideTo(index);
      resetAutoplay();
    });
  });

  // Function to advance to the next slide
  function nextSlide() {
    let nextIndex = currentIndex + 1;
    // If we've reached the end, loop back to the beginning
    if (nextIndex >= cards.length - 2) { // Assuming we show 3 cards at a time
      nextIndex = 0;
    }
    slideTo(nextIndex);
  }

  // Function to reset autoplay
  function resetAutoplay() {
    clearInterval(autoplayInterval);
    autoplayInterval = setInterval(nextSlide, 5000);
  }

  // Initialize the slider
  slideTo(0);
  resetAutoplay();

  // Pause autoplay when hovering over the slider
  slider.addEventListener('mouseenter', () => {
    clearInterval(autoplayInterval);
  });

  slider.addEventListener('mouseleave', resetAutoplay);
}

// Initialize FAQ accordions
function initAccordions() {
  const accordions = document.querySelectorAll('.accordion');
  
  if (!accordions.length) return;

  accordions.forEach(accordion => {
    const header = accordion.querySelector('.accordion-header');
    const content = accordion.querySelector('.accordion-content');

    if (!header || !content) return;

    header.addEventListener('click', () => {
      // Toggle active class
      accordion.classList.toggle('active');

      // Set max-height based on the content's scrollHeight
      if (accordion.classList.contains('active')) {
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        content.style.maxHeight = 0;
      }

      // Close other accordions
      accordions.forEach(otherAccordion => {
        if (otherAccordion !== accordion && otherAccordion.classList.contains('active')) {
          otherAccordion.classList.remove('active');
          otherAccordion.querySelector('.accordion-content').style.maxHeight = 0;
        }
      });
    });
  });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
  const navLinks = document.querySelectorAll('a[href^="#"]');

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return; // Skip if it's just a hash
      
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Adjust for header height
          behavior: 'smooth'
        });

        // Close mobile menu if open
        const mobileMenu = document.querySelector('.mobile-menu');
        const menuToggle = document.querySelector('.menu-toggle');
        if (mobileMenu && mobileMenu.classList.contains('active') && menuToggle) {
          mobileMenu.classList.remove('active');
          menuToggle.classList.remove('active');
        }
      }
    });
  });
}

// Initialize mobile menu
function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !mobileMenu.contains(e.target) && mobileMenu.classList.contains('active')) {
        menuToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
      }
    });
  }
}

// Initialize form submission
function initFormSubmission() {
  const betaForm = document.querySelector('.beta-form');
  
  if (!betaForm) return;
  
  betaForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const emailInput = betaForm.querySelector('input[type="email"]');
    const nameInput = betaForm.querySelector('input[type="text"]');
    
    if (!emailInput) return;
    
    const email = emailInput.value;
    const name = nameInput ? nameInput.value : '';
    
    // Simple validation
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    
    // Here you would typically send the data to your server
    // For now, we'll just show a success message
    const formContainer = betaForm.parentElement;
    formContainer.innerHTML = `
      <div class="success-message fade-in visible">
        <h3>Thank you for joining our beta waitlist!</h3>
        <p>We'll contact you at <strong>${email}</strong> when we're ready to onboard new users.</p>
      </div>
    `;
    
    // You could also store the email in localStorage for persistence
    localStorage.setItem('betaSignupEmail', email);
  });
}

// Add smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  });
});

// Initialize all interactive elements
window.addEventListener('load', () => {
  animateCounter();
  initDashboardInteraction();
  setTimeout(initTypingAnimation, 500);
  
  // Add animation classes to hero elements
  document.querySelector('.tag-line').classList.add('fade-in', 'visible');
  document.querySelector('.hero h1').classList.add('fade-in', 'visible');
  document.querySelector('.hero-description').classList.add('fade-in', 'visible');
  document.querySelector('.cta-buttons').classList.add('fade-in', 'visible');
  document.querySelector('.social-proof').classList.add('fade-in', 'visible');
  document.querySelector('.dashboard-preview').classList.add('fade-in', 'visible');
  
  // Add staggered animation delay
  const heroElements = document.querySelectorAll('.hero .fade-in');
  heroElements.forEach((el, index) => {
    el.style.transitionDelay = `${index * 0.2}s`;
  });
});
