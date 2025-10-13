// DOM Elements
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const searchTabs = document.querySelectorAll('.search-tab');
const searchForm = document.querySelector('.search-form');
const searchButton = document.querySelector('.search-button');
const navDots = document.querySelectorAll('.nav-dot');

// Mobile Navigation Toggle
if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close menu when clicking on nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// Search Tab Functionality
searchTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        searchTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Update search form based on selected tab
        updateSearchForm(tab.dataset.type);
    });
});

function updateSearchForm(type) {
    const searchRow = document.querySelector('.search-row');
    
    switch(type) {
        case 'one-way':
            searchRow.innerHTML = `
                <div class="search-field">
                    <label>From</label>
                    <div class="dropdown-container">
                        <input type="text" placeholder="Departure city" class="search-input" id="fromInput" autocomplete="off">
                        <div class="dropdown" id="fromDropdown"></div>
                    </div>
                </div>
                <div class="search-field">
                    <label>To</label>
                    <div class="dropdown-container">
                        <input type="text" placeholder="Destination city" class="search-input" id="toInput" autocomplete="off">
                        <div class="dropdown" id="toDropdown"></div>
                    </div>
                </div>
                <div class="search-field">
                    <label>Date and time</label>
                    <input type="datetime-local" class="search-input">
                </div>
                <div class="search-field">
                    <label>Passengers</label>
                    <select class="search-input" id="passengers">
                        <option value="1">1 Passenger</option>
                        <option value="2">2 Passengers</option>
                        <option value="3">3 Passengers</option>
                        <option value="4">4 Passengers</option>
                        <option value="5">5 Passengers</option>
                        <option value="6">6 Passengers</option>
                        <option value="7">7 Passengers</option>
                        <option value="8">8 Passengers</option>
                        <option value="9">9 Passengers</option>
                        <option value="10">10+ Passengers</option>
                    </select>
                </div>
                <button class="search-button">
                    <i class="fas fa-search"></i>
                    Search
                </button>
            `;
            break;
        case 'round-trip':
            searchRow.innerHTML = `
                <div class="search-field">
                    <label>From</label>
                    <div class="dropdown-container">
                        <input type="text" placeholder="Departure city" class="search-input" id="fromInput" autocomplete="off">
                        <div class="dropdown" id="fromDropdown"></div>
                    </div>
                </div>
                <div class="search-field">
                    <label>To</label>
                    <div class="dropdown-container">
                        <input type="text" placeholder="Destination city" class="search-input" id="toInput" autocomplete="off">
                        <div class="dropdown" id="toDropdown"></div>
                    </div>
                </div>
                <div class="search-field">
                    <label>Departure</label>
                    <input type="datetime-local" class="search-input">
                </div>
                <div class="search-field">
                    <label>Return</label>
                    <input type="datetime-local" class="search-input">
                </div>
                <div class="search-field">
                    <label>Passengers</label>
                    <select class="search-input" id="passengers">
                        <option value="1">1 Passenger</option>
                        <option value="2">2 Passengers</option>
                        <option value="3">3 Passengers</option>
                        <option value="4">4 Passengers</option>
                        <option value="5">5 Passengers</option>
                        <option value="6">6 Passengers</option>
                        <option value="7">7 Passengers</option>
                        <option value="8">8 Passengers</option>
                        <option value="9">9 Passengers</option>
                        <option value="10">10+ Passengers</option>
                    </select>
                </div>
                <button class="search-button">
                    <i class="fas fa-search"></i>
                    Search
                </button>
            `;
            break;
        case 'multi-leg':
            searchRow.innerHTML = `
                <div class="search-field">
                    <label>From</label>
                    <div class="dropdown-container">
                        <input type="text" placeholder="Departure city" class="search-input" id="fromInput" autocomplete="off">
                        <div class="dropdown" id="fromDropdown"></div>
                    </div>
                </div>
                <div class="search-field">
                    <label>To</label>
                    <div class="dropdown-container">
                        <input type="text" placeholder="Destination city" class="search-input" id="toInput" autocomplete="off">
                        <div class="dropdown" id="toDropdown"></div>
                    </div>
                </div>
                <div class="search-field">
                    <label>Via</label>
                    <input type="text" placeholder="Stopover city" class="search-input">
                </div>
                <div class="search-field">
                    <label>Date and time</label>
                    <input type="datetime-local" class="search-input">
                </div>
                <div class="search-field">
                    <label>Passengers</label>
                    <select class="search-input" id="passengers">
                        <option value="1">1 Passenger</option>
                        <option value="2">2 Passengers</option>
                        <option value="3">3 Passengers</option>
                        <option value="4">4 Passengers</option>
                        <option value="5">5 Passengers</option>
                        <option value="6">6 Passengers</option>
                        <option value="7">7 Passengers</option>
                        <option value="8">8 Passengers</option>
                        <option value="9">9 Passengers</option>
                        <option value="10">10+ Passengers</option>
                    </select>
                </div>
                <button class="search-button">
                    <i class="fas fa-search"></i>
                    Search
                </button>
            `;
            break;
    }
    
    // Re-attach event listeners to new search button and reinitialize dropdowns
    const newSearchButton = searchRow.querySelector('.search-button');
    if (newSearchButton) {
        newSearchButton.addEventListener('click', handleSearch);
    }
    
    // Reinitialize dropdowns for new inputs
    if (document.getElementById('fromInput') && document.getElementById('fromDropdown')) {
        new AirportDropdown('fromInput', 'fromDropdown');
    }
    if (document.getElementById('toInput') && document.getElementById('toDropdown')) {
        new AirportDropdown('toInput', 'toDropdown');
    }
}

// Search Form Submission
function handleSearch(e) {
    e.preventDefault();
    
    const button = e.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<div class="loading"></div> Searching...';
    button.disabled = true;
    
    // Simulate search process
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show success message (in a real app, this would redirect or show results)
        showNotification('Search completed! Contact us at +1 (866) 709-3018 for booking assistance.');
    }, 2000);
}

// Add event listener to search button
if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
}

// Notification System
function showNotification(message) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        padding: 1rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add notification styles to head if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .notification-content i {
                color: #28a745;
                font-size: 1.2rem;
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #999;
                margin-left: auto;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Add close functionality
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header Background Change on Scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature, .aircraft-card, .news-item, .deal-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
});

// CTA Button Functionality
document.querySelectorAll('.cta-button, .app-button').forEach(button => {
    button.addEventListener('click', () => {
        showNotification('Thank you for your interest! Please contact us at +1 (866) 709-3018 for more information.');
    });
});

// Phone Number Click Handler
document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', (e) => {
        // On mobile, this will open the phone app
        // On desktop, show a notification
        if (!/Mobi|Android/i.test(navigator.userAgent)) {
            e.preventDefault();
            showNotification('Call us at +1 (866) 709-3018 for immediate assistance.');
        }
    });
});

// Form Validation
function validateSearchForm() {
    const inputs = document.querySelectorAll('.search-input');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            input.style.borderColor = '#e9ecef';
        }
    });
    
    return isValid;
}

// Enhanced Search Button Click Handler
function handleSearch(e) {
    e.preventDefault();
    
    if (!validateSearchForm()) {
        showNotification('Please fill in all required fields.');
        return;
    }
    
    const button = e.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<div class="loading"></div> Searching...';
    button.disabled = true;
    
    // Simulate search process
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show success message
        showNotification('Search completed! Our aviation experts will contact you shortly with available options.');
    }, 2000);
}

// Deal Navigation Dots (if multiple deals were present)
navDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        navDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        // In a real implementation, this would switch between different deals
    });
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    // Close mobile menu with Escape key
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    }
});

// Lazy Loading for Images (if any are added later)
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
lazyLoadImages();

// Performance Optimization: Debounced scroll handler
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to scroll handler
const debouncedScrollHandler = debounce(() => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    }
}, 10);

window.addEventListener('scroll', debouncedScrollHandler);

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('NoAirlines website initialized successfully!');
    
    // Add any additional initialization code here
    // For example, analytics, A/B testing, etc.
});

// Airport Data - Comprehensive US Commercial Airports
const usAirports = [
    // Alabama
    { city: "Birmingham", code: "BHM", name: "Birmingham-Shuttlesworth International Airport", state: "AL" },
    { city: "Huntsville", code: "HSV", name: "Huntsville International Airport", state: "AL" },
    { city: "Mobile", code: "MOB", name: "Mobile Regional Airport", state: "AL" },
    
    // Alaska
    { city: "Anchorage", code: "ANC", name: "Ted Stevens Anchorage International Airport", state: "AK" },
    { city: "Fairbanks", code: "FAI", name: "Fairbanks International Airport", state: "AK" },
    { city: "Juneau", code: "JNU", name: "Juneau International Airport", state: "AK" },
    
    // Arizona
    { city: "Phoenix", code: "PHX", name: "Phoenix Sky Harbor International Airport", state: "AZ" },
    { city: "Tucson", code: "TUS", name: "Tucson International Airport", state: "AZ" },
    { city: "Flagstaff", code: "FLG", name: "Flagstaff Pulliam Airport", state: "AZ" },
    
    // Arkansas
    { city: "Little Rock", code: "LIT", name: "Bill and Hillary Clinton National Airport", state: "AR" },
    { city: "Fayetteville", code: "XNA", name: "Northwest Arkansas National Airport", state: "AR" },
    
    // California
    { city: "Los Angeles", code: "LAX", name: "Los Angeles International Airport", state: "CA" },
    { city: "San Francisco", code: "SFO", name: "San Francisco International Airport", state: "CA" },
    { city: "San Diego", code: "SAN", name: "San Diego International Airport", state: "CA" },
    { city: "Oakland", code: "OAK", name: "Oakland International Airport", state: "CA" },
    { city: "San Jose", code: "SJC", name: "San Jose International Airport", state: "CA" },
    { city: "Sacramento", code: "SMF", name: "Sacramento International Airport", state: "CA" },
    { city: "Fresno", code: "FAT", name: "Fresno Yosemite International Airport", state: "CA" },
    { city: "Burbank", code: "BUR", name: "Hollywood Burbank Airport", state: "CA" },
    { city: "Long Beach", code: "LGB", name: "Long Beach Airport", state: "CA" },
    { city: "Ontario", code: "ONT", name: "Ontario International Airport", state: "CA" },
    
    // Colorado
    { city: "Denver", code: "DEN", name: "Denver International Airport", state: "CO" },
    { city: "Colorado Springs", code: "COS", name: "Colorado Springs Airport", state: "CO" },
    { city: "Grand Junction", code: "GJT", name: "Grand Junction Regional Airport", state: "CO" },
    
    // Connecticut
    { city: "Hartford", code: "BDL", name: "Bradley International Airport", state: "CT" },
    
    // Delaware
    { city: "Wilmington", code: "ILG", name: "Wilmington Airport", state: "DE" },
    
    // District of Columbia
    { city: "Washington", code: "DCA", name: "Ronald Reagan Washington National Airport", state: "DC" },
    
    // Florida
    { city: "Miami", code: "MIA", name: "Miami International Airport", state: "FL" },
    { city: "Orlando", code: "MCO", name: "Orlando International Airport", state: "FL" },
    { city: "Fort Lauderdale", code: "FLL", name: "Fort Lauderdale-Hollywood International Airport", state: "FL" },
    { city: "Tampa", code: "TPA", name: "Tampa International Airport", state: "FL" },
    { city: "Jacksonville", code: "JAX", name: "Jacksonville International Airport", state: "FL" },
    { city: "West Palm Beach", code: "PBI", name: "Palm Beach International Airport", state: "FL" },
    { city: "Fort Myers", code: "RSW", name: "Southwest Florida International Airport", state: "FL" },
    { city: "Sarasota", code: "SRQ", name: "Sarasota-Bradenton International Airport", state: "FL" },
    { city: "Key West", code: "EYW", name: "Key West International Airport", state: "FL" },
    { city: "Pensacola", code: "PNS", name: "Pensacola International Airport", state: "FL" },
    { city: "Tallahassee", code: "TLH", name: "Tallahassee International Airport", state: "FL" },
    
    // Georgia
    { city: "Atlanta", code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", state: "GA" },
    { city: "Savannah", code: "SAV", name: "Savannah/Hilton Head International Airport", state: "GA" },
    { city: "Augusta", code: "AGS", name: "Augusta Regional Airport", state: "GA" },
    
    // Hawaii
    { city: "Honolulu", code: "HNL", name: "Daniel K. Inouye International Airport", state: "HI" },
    { city: "Kahului", code: "OGG", name: "Kahului Airport", state: "HI" },
    { city: "Kona", code: "KOA", name: "Kona International Airport", state: "HI" },
    { city: "Lihue", code: "LIH", name: "Lihue Airport", state: "HI" },
    
    // Idaho
    { city: "Boise", code: "BOI", name: "Boise Airport", state: "ID" },
    { city: "Idaho Falls", code: "IDA", name: "Idaho Falls Regional Airport", state: "ID" },
    
    // Illinois
    { city: "Chicago", code: "ORD", name: "O'Hare International Airport", state: "IL" },
    { city: "Chicago", code: "MDW", name: "Midway International Airport", state: "IL" },
    { city: "Rockford", code: "RFD", name: "Chicago Rockford International Airport", state: "IL" },
    
    // Indiana
    { city: "Indianapolis", code: "IND", name: "Indianapolis International Airport", state: "IN" },
    { city: "Fort Wayne", code: "FWA", name: "Fort Wayne International Airport", state: "IN" },
    { city: "South Bend", code: "SBN", name: "South Bend International Airport", state: "IN" },
    
    // Iowa
    { city: "Des Moines", code: "DSM", name: "Des Moines International Airport", state: "IA" },
    { city: "Cedar Rapids", code: "CID", name: "The Eastern Iowa Airport", state: "IA" },
    
    // Kansas
    { city: "Wichita", code: "ICT", name: "Wichita Dwight D. Eisenhower National Airport", state: "KS" },
    { city: "Kansas City", code: "MCI", name: "Kansas City International Airport", state: "MO" },
    
    // Kentucky
    { city: "Louisville", code: "SDF", name: "Louisville Muhammad Ali International Airport", state: "KY" },
    { city: "Lexington", code: "LEX", name: "Blue Grass Airport", state: "KY" },
    { city: "Cincinnati", code: "CVG", name: "Cincinnati/Northern Kentucky International Airport", state: "OH" },
    
    // Louisiana
    { city: "New Orleans", code: "MSY", name: "Louis Armstrong New Orleans International Airport", state: "LA" },
    { city: "Baton Rouge", code: "BTR", name: "Baton Rouge Metropolitan Airport", state: "LA" },
    { city: "Shreveport", code: "SHV", name: "Shreveport Regional Airport", state: "LA" },
    { city: "Lafayette", code: "LFT", name: "Lafayette Regional Airport", state: "LA" },
    
    // Maine
    { city: "Portland", code: "PWM", name: "Portland International Jetport", state: "ME" },
    { city: "Bangor", code: "BGR", name: "Bangor International Airport", state: "ME" },
    
    // Maryland
    { city: "Baltimore", code: "BWI", name: "Baltimore/Washington International Airport", state: "MD" },
    
    // Massachusetts
    { city: "Boston", code: "BOS", name: "Logan International Airport", state: "MA" },
    { city: "Worcester", code: "ORH", name: "Worcester Regional Airport", state: "MA" },
    
    // Michigan
    { city: "Detroit", code: "DTW", name: "Detroit Metropolitan Airport", state: "MI" },
    { city: "Grand Rapids", code: "GRR", name: "Gerald R. Ford International Airport", state: "MI" },
    { city: "Flint", code: "FNT", name: "Bishop International Airport", state: "MI" },
    { city: "Kalamazoo", code: "AZO", name: "Kalamazoo/Battle Creek International Airport", state: "MI" },
    
    // Minnesota
    { city: "Minneapolis", code: "MSP", name: "Minneapolis-Saint Paul International Airport", state: "MN" },
    { city: "Duluth", code: "DLH", name: "Duluth International Airport", state: "MN" },
    
    // Mississippi
    { city: "Jackson", code: "JAN", name: "Jackson-Medgar Wiley Evers International Airport", state: "MS" },
    { city: "Gulfport", code: "GPT", name: "Gulfport-Biloxi International Airport", state: "MS" },
    
    // Missouri
    { city: "Kansas City", code: "MCI", name: "Kansas City International Airport", state: "MO" },
    { city: "St. Louis", code: "STL", name: "St. Louis Lambert International Airport", state: "MO" },
    { city: "Springfield", code: "SGF", name: "Springfield-Branson National Airport", state: "MO" },
    
    // Montana
    { city: "Billings", code: "BIL", name: "Billings Logan International Airport", state: "MT" },
    { city: "Missoula", code: "MSO", name: "Missoula Montana Airport", state: "MT" },
    { city: "Bozeman", code: "BZN", name: "Bozeman Yellowstone International Airport", state: "MT" },
    
    // Nebraska
    { city: "Omaha", code: "OMA", name: "Eppley Airfield", state: "NE" },
    { city: "Lincoln", code: "LNK", name: "Lincoln Airport", state: "NE" },
    
    // Nevada
    { city: "Las Vegas", code: "LAS", name: "Harry Reid International Airport", state: "NV" },
    { city: "Reno", code: "RNO", name: "Reno-Tahoe International Airport", state: "NV" },
    
    // New Hampshire
    { city: "Manchester", code: "MHT", name: "Manchester-Boston Regional Airport", state: "NH" },
    
    // New Jersey
    { city: "Newark", code: "EWR", name: "Newark Liberty International Airport", state: "NJ" },
    { city: "Atlantic City", code: "ACY", name: "Atlantic City International Airport", state: "NJ" },
    
    // New Mexico
    { city: "Albuquerque", code: "ABQ", name: "Albuquerque International Sunport", state: "NM" },
    { city: "Santa Fe", code: "SAF", name: "Santa Fe Regional Airport", state: "NM" },
    
    // New York
    { city: "New York", code: "JFK", name: "John F. Kennedy International Airport", state: "NY" },
    { city: "New York", code: "LGA", name: "LaGuardia Airport", state: "NY" },
    { city: "Buffalo", code: "BUF", name: "Buffalo Niagara International Airport", state: "NY" },
    { city: "Rochester", code: "ROC", name: "Greater Rochester International Airport", state: "NY" },
    { city: "Syracuse", code: "SYR", name: "Syracuse Hancock International Airport", state: "NY" },
    { city: "Albany", code: "ALB", name: "Albany International Airport", state: "NY" },
    
    // North Carolina
    { city: "Charlotte", code: "CLT", name: "Charlotte Douglas International Airport", state: "NC" },
    { city: "Raleigh", code: "RDU", name: "Raleigh-Durham International Airport", state: "NC" },
    { city: "Greensboro", code: "GSO", name: "Piedmont Triad International Airport", state: "NC" },
    { city: "Asheville", code: "AVL", name: "Asheville Regional Airport", state: "NC" },
    
    // North Dakota
    { city: "Fargo", code: "FAR", name: "Hector International Airport", state: "ND" },
    { city: "Bismarck", code: "BIS", name: "Bismarck Municipal Airport", state: "ND" },
    
    // Ohio
    { city: "Cleveland", code: "CLE", name: "Cleveland Hopkins International Airport", state: "OH" },
    { city: "Cincinnati", code: "CVG", name: "Cincinnati/Northern Kentucky International Airport", state: "OH" },
    { city: "Columbus", code: "CMH", name: "John Glenn Columbus International Airport", state: "OH" },
    { city: "Akron", code: "CAK", name: "Akron-Canton Regional Airport", state: "OH" },
    { city: "Dayton", code: "DAY", name: "Dayton International Airport", state: "OH" },
    { city: "Toledo", code: "TOL", name: "Toledo Express Airport", state: "OH" },
    
    // Oklahoma
    { city: "Oklahoma City", code: "OKC", name: "Will Rogers World Airport", state: "OK" },
    { city: "Tulsa", code: "TUL", name: "Tulsa International Airport", state: "OK" },
    
    // Oregon
    { city: "Portland", code: "PDX", name: "Portland International Airport", state: "OR" },
    { city: "Eugene", code: "EUG", name: "Eugene Airport", state: "OR" },
    { city: "Medford", code: "MFR", name: "Rogue Valley International-Medford Airport", state: "OR" },
    
    // Pennsylvania
    { city: "Philadelphia", code: "PHL", name: "Philadelphia International Airport", state: "PA" },
    { city: "Pittsburgh", code: "PIT", name: "Pittsburgh International Airport", state: "PA" },
    { city: "Harrisburg", code: "MDT", name: "Harrisburg International Airport", state: "PA" },
    { city: "Allentown", code: "ABE", name: "Lehigh Valley International Airport", state: "PA" },
    
    // Rhode Island
    { city: "Providence", code: "PVD", name: "T.F. Green Airport", state: "RI" },
    
    // South Carolina
    { city: "Charleston", code: "CHS", name: "Charleston International Airport", state: "SC" },
    { city: "Columbia", code: "CAE", name: "Columbia Metropolitan Airport", state: "SC" },
    { city: "Greenville", code: "GSP", name: "Greenville-Spartanburg International Airport", state: "SC" },
    { city: "Myrtle Beach", code: "MYR", name: "Myrtle Beach International Airport", state: "SC" },
    
    // South Dakota
    { city: "Sioux Falls", code: "FSD", name: "Sioux Falls Regional Airport", state: "SD" },
    { city: "Rapid City", code: "RAP", name: "Rapid City Regional Airport", state: "SD" },
    
    // Tennessee
    { city: "Nashville", code: "BNA", name: "Nashville International Airport", state: "TN" },
    { city: "Memphis", code: "MEM", name: "Memphis International Airport", state: "TN" },
    { city: "Knoxville", code: "TYS", name: "McGhee Tyson Airport", state: "TN" },
    { city: "Chattanooga", code: "CHA", name: "Chattanooga Metropolitan Airport", state: "TN" },
    
    // Texas
    { city: "Dallas", code: "DFW", name: "Dallas/Fort Worth International Airport", state: "TX" },
    { city: "Dallas", code: "DAL", name: "Dallas Love Field", state: "TX" },
    { city: "Houston", code: "IAH", name: "George Bush Intercontinental Airport", state: "TX" },
    { city: "Houston", code: "HOU", name: "William P. Hobby Airport", state: "TX" },
    { city: "Austin", code: "AUS", name: "Austin-Bergstrom International Airport", state: "TX" },
    { city: "San Antonio", code: "SAT", name: "San Antonio International Airport", state: "TX" },
    { city: "El Paso", code: "ELP", name: "El Paso International Airport", state: "TX" },
    { city: "Lubbock", code: "LBB", name: "Lubbock Preston Smith International Airport", state: "TX" },
    { city: "Amarillo", code: "AMA", name: "Rick Husband Amarillo International Airport", state: "TX" },
    { city: "Corpus Christi", code: "CRP", name: "Corpus Christi International Airport", state: "TX" },
    { city: "McAllen", code: "MFE", name: "McAllen Miller International Airport", state: "TX" },
    { city: "Brownsville", code: "BRO", name: "Brownsville/South Padre Island International Airport", state: "TX" },
    
    // Utah
    { city: "Salt Lake City", code: "SLC", name: "Salt Lake City International Airport", state: "UT" },
    
    // Vermont
    { city: "Burlington", code: "BTV", name: "Burlington International Airport", state: "VT" },
    
    // Virginia
    { city: "Washington", code: "IAD", name: "Washington Dulles International Airport", state: "VA" },
    { city: "Norfolk", code: "ORF", name: "Norfolk International Airport", state: "VA" },
    { city: "Richmond", code: "RIC", name: "Richmond International Airport", state: "VA" },
    { city: "Roanoke", code: "ROA", name: "Roanoke-Blacksburg Regional Airport", state: "VA" },
    
    // Washington
    { city: "Seattle", code: "SEA", name: "Seattle-Tacoma International Airport", state: "WA" },
    { city: "Spokane", code: "GEG", name: "Spokane International Airport", state: "WA" },
    { city: "Pasco", code: "PSC", name: "Tri-Cities Airport", state: "WA" },
    { city: "Bellingham", code: "BLI", name: "Bellingham International Airport", state: "WA" },
    
    // West Virginia
    { city: "Charleston", code: "CRW", name: "Yeager Airport", state: "WV" },
    { city: "Huntington", code: "HTS", name: "Huntington Tri-State Airport", state: "WV" },
    
    // Wisconsin
    { city: "Milwaukee", code: "MKE", name: "Milwaukee Mitchell International Airport", state: "WI" },
    { city: "Madison", code: "MSN", name: "Dane County Regional Airport", state: "WI" },
    { city: "Green Bay", code: "GRB", name: "Green Bay-Austin Straubel International Airport", state: "WI" },
    
    // Wyoming
    { city: "Cheyenne", code: "CYS", name: "Cheyenne Regional Airport", state: "WY" },
    { city: "Jackson", code: "JAC", name: "Jackson Hole Airport", state: "WY" },
    { city: "Casper", code: "CPR", name: "Casper-Natrona County International Airport", state: "WY" },
    
    // Puerto Rico
    { city: "San Juan", code: "SJU", name: "Luis Muñoz Marín International Airport", state: "PR" },
    { city: "Aguadilla", code: "BQN", name: "Rafael Hernández Airport", state: "PR" },
    
    // US Virgin Islands
    { city: "St. Thomas", code: "STT", name: "Cyril E. King Airport", state: "VI" },
    { city: "St. Croix", code: "STX", name: "Henry E. Rohlsen Airport", state: "VI" }
];

// Airport Dropdown Functionality
class AirportDropdown {
    constructor(inputId, dropdownId) {
        this.input = document.getElementById(inputId);
        this.dropdown = document.getElementById(dropdownId);
        this.selectedAirport = null;
        this.init();
    }

    init() {
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', () => this.showDropdown());
        this.input.addEventListener('blur', (e) => this.handleBlur(e));
        document.addEventListener('click', (e) => this.handleDocumentClick(e));
    }

    handleInput(e) {
        const query = e.target.value.toLowerCase();
        console.log('Searching for:', query); // Debug log
        this.filterAirports(query);
        this.showDropdown();
    }

    filterAirports(query) {
        if (!query) {
            this.showAllAirports();
            return;
        }

        const lowercaseQuery = query.toLowerCase();
        const filtered = usAirports.filter(airport => 
            airport.city.toLowerCase().includes(lowercaseQuery) ||
            airport.code.toLowerCase().includes(lowercaseQuery) ||
            airport.name.toLowerCase().includes(lowercaseQuery) ||
            airport.state.toLowerCase().includes(lowercaseQuery)
        );

        console.log('Found airports:', filtered.length); // Debug log
        this.renderDropdown(filtered);
    }

    showAllAirports() {
        this.renderDropdown(usAirports);
    }

    renderDropdown(airports) {
        this.dropdown.innerHTML = '';
        
        if (airports.length === 0) {
            this.dropdown.innerHTML = '<div class="dropdown-item">No airports found</div>';
            return;
        }

        airports.slice(0, 10).forEach(airport => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `
                <span class="city-name">${airport.city}, ${airport.state}</span>
                <span class="airport-code">${airport.code}</span>
                <span class="airport-name">${airport.name}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectAirport(airport);
            });
            
            this.dropdown.appendChild(item);
        });
    }

    selectAirport(airport) {
        this.selectedAirport = airport;
        this.input.value = `${airport.city}, ${airport.state} (${airport.code})`;
        this.hideDropdown();
    }

    showDropdown() {
        this.dropdown.classList.add('active');
    }

    hideDropdown() {
        this.dropdown.classList.remove('active');
    }

    handleBlur(e) {
        // Delay hiding to allow click events on dropdown items
        setTimeout(() => {
            if (!this.dropdown.contains(document.activeElement)) {
                this.hideDropdown();
            }
        }, 150);
    }

    handleDocumentClick(e) {
        if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
            this.hideDropdown();
        }
    }
}

// Initialize dropdowns when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('NoAirlines website initialized successfully!');
    
    // Initialize airport dropdowns
    new AirportDropdown('fromInput', 'fromDropdown');
    new AirportDropdown('toInput', 'toDropdown');
    
    // Add any additional initialization code here
    // For example, analytics, A/B testing, etc.
});

// Export functions for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        validateSearchForm,
        updateSearchForm,
        AirportDropdown
    };
}

// Flight Search Form Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Passenger counter functionality
    const passengerMinus = document.getElementById('passenger-minus');
    const passengerPlus = document.getElementById('passenger-plus');
    const passengerCount = document.getElementById('passenger-count');
    
    if (passengerMinus && passengerPlus && passengerCount) {
        let currentPassengers = 2;
        
        passengerMinus.addEventListener('click', () => {
            if (currentPassengers > 1) {
                currentPassengers--;
                passengerCount.textContent = currentPassengers;
            }
        });
        
        passengerPlus.addEventListener('click', () => {
            if (currentPassengers < 20) {
                currentPassengers++;
                passengerCount.textContent = currentPassengers;
            }
        });
    }
    
    // Swap locations functionality
    const swapButton = document.getElementById('swap-locations');
    const fromLocation = document.getElementById('from-location');
    const toLocation = document.getElementById('to-location');
    
    if (swapButton && fromLocation && toLocation) {
        swapButton.addEventListener('click', () => {
            const fromValue = fromLocation.value;
            const toValue = toLocation.value;
            
            fromLocation.value = toValue;
            toLocation.value = fromValue;
        });
    }
    
    // Form submission handling
    const flightSearchForm = document.querySelector('.flight-search-form');
    if (flightSearchForm) {
        flightSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = {
                tripType: document.querySelector('input[name="trip-type"]:checked').value,
                charterType: document.querySelector('.charter-select').value,
                from: fromLocation.value,
                to: toLocation.value,
                dateTime: document.getElementById('date-time').value,
                passengers: currentPassengers
            };
            
            // Basic validation
            if (!formData.from || !formData.to) {
                alert('Please enter both departure and arrival locations.');
                return;
            }
            
            if (!formData.dateTime) {
                alert('Please select a date and time.');
                return;
            }
            
            // Show notification (placeholder for actual search functionality)
            showNotification('Search functionality coming soon! Please contact quotes@noairlines.com for immediate assistance.');
        });
    }
    
    // Set default date to tomorrow
    const dateTimeInput = document.getElementById('date-time');
    if (dateTimeInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0); // Default to 10:00 AM
        
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
        
        dateTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
});
