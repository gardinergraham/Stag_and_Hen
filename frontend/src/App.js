import { Camera, Users, ShoppingBag, Wallet, QrCode, Shield, PartyPopper, Heart, Check, Smartphone, Apple } from "lucide-react";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Header Component
const Header = () => (
  <header className="header" data-testid="header">
    <div className="container header-content">
      <a href="/" className="logo" data-testid="logo">
        <img src="/logo.jpg" alt="Stag & Hen" />
        <span className="logo-text">The Stag <span>&</span> Hen</span>
      </a>
      <nav className="nav-links">
        <a href="#features" className="nav-link" data-testid="nav-features">Features</a>
        <a href="#app" className="nav-link" data-testid="nav-app">The App</a>
        <a href="#download" className="nav-link" data-testid="nav-download">Download</a>
        <a href="#download" className="btn btn-primary" data-testid="get-app-btn">Get the App</a>
      </nav>
    </div>
  </header>
);

// Hero Section
const Hero = () => (
  <section className="hero" data-testid="hero-section">
    <div className="hero-background">
      <img 
        src="https://images.pexels.com/photos/6173843/pexels-photo-6173843.jpeg" 
        alt="Party celebration" 
      />
      <div className="hero-overlay"></div>
    </div>
    <div className="container">
      <div className="hero-content animate-fade-in-up">
        <div className="hero-label">
          <PartyPopper size={16} />
          Stag & Hen Parties Made Easy
        </div>
        <h1>
          Last Stop<br />
          <span className="gradient-text">Before The Altar</span>
        </h1>
        <p>
          The ultimate app for planning unforgettable stag and hen parties. 
          Share memories, manage your crew, and make sure everyone has the night (or weekend) of their lives!
        </p>
        <div className="hero-buttons">
          <a href="#download" className="btn btn-primary" data-testid="hero-download-btn">
            <Smartphone size={20} />
            Download App
          </a>
          <a href="#features" className="btn btn-secondary" data-testid="hero-features-btn">
            Learn More
          </a>
        </div>
      </div>
    </div>
  </section>
);

// Marquee
const Marquee = () => (
  <div className="marquee-container">
    <div className="marquee">
      <span className="marquee-text">LAST STOP BEFORE THE ALTAR • STAG & HEN • VIP ACCESS • PARTY TIME • </span>
      <span className="marquee-text">LAST STOP BEFORE THE ALTAR • STAG & HEN • VIP ACCESS • PARTY TIME • </span>
    </div>
  </div>
);

// Features Section
const Features = () => {
  const features = [
    {
      icon: <Camera />,
      title: "Private Media Vault",
      description: "Share photos and videos within your group only. Set auto-delete timers for 1 day, 1 week, 1 month, or keep them forever."
    },
    {
      icon: <Users />,
      title: "Crew Management",
      description: "Easy QR code access for your squad. Just scan, enter your name, and you're in! No complicated sign-ups needed."
    },
    {
      icon: <Wallet />,
      title: "Group Kitty",
      description: "Collect contributions for drinks, activities, and surprises. The organizer can spend directly from the pot."
    },
    {
      icon: <ShoppingBag />,
      title: "Party Shop",
      description: "Grab sashes, hats, games, and more! All the essentials to make your stag or hen unforgettable."
    },
    {
      icon: <QrCode />,
      title: "Quick Join via QR",
      description: "Share access with a simple QR code. No emails, no passwords—just scan and party!"
    },
    {
      icon: <Shield />,
      title: "What Happens... Stays",
      description: "Your media, your rules. Auto-delete ensures those wild memories stay within the crew."
    }
  ];

  return (
    <section className="features" id="features" data-testid="features-section">
      <div className="container">
        <div className="section-header animate-fade-in-up">
          <h2>Everything You Need for the<br /><span className="gradient-text">Perfect Send-Off</span></h2>
          <p>From planning to partying, we've got you covered with features designed for unforgettable celebrations.</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`glass-card feature-card animate-fade-in-up stagger-${index + 1}`}
              data-testid={`feature-card-${index}`}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// App Preview Section
const AppPreview = () => (
  <section className="app-preview" id="app" data-testid="app-preview-section">
    <div className="container">
      <div className="app-preview-content">
        <div className="app-preview-text animate-fade-in-up">
          <h2>Your Party,<br /><span className="gradient-text">Your Way</span></h2>
          <p>
            Whether you're organising a wild weekend in Ibiza or a classy cocktail night, 
            The Stag & Hen app puts you in control.
          </p>
          <ul className="app-features-list">
            <li><Check size={20} /> Create events for stag or hen parties</li>
            <li><Check size={20} /> Invite your crew with a simple QR code</li>
            <li><Check size={20} /> Upload and share photos & videos privately</li>
            <li><Check size={20} /> Set auto-delete timers for sensitive content</li>
            <li><Check size={20} /> Collect money in the group kitty</li>
            <li><Check size={20} /> Shop for party essentials together</li>
          </ul>
          <a href="#download" className="btn btn-gold" data-testid="get-started-btn">
            <Heart size={20} />
            Start Planning
          </a>
        </div>
        <div className="app-mockup animate-float">
          <div className="phone-frame">
            <div className="phone-screen">
              <div className="phone-notch"></div>
              <div className="phone-content">
                <img src="/logo.jpg" alt="Stag & Hen App" />
                <h4>The Stag & Hen</h4>
                <p style={{ color: 'var(--color-gold)' }}>Last Stop Before The Altar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Download Section
const Download = () => (
  <section className="download" id="download" data-testid="download-section">
    <div className="container">
      <h2>Get the <span className="gradient-text">App</span></h2>
      <p>Download now and start planning the ultimate stag or hen party!</p>
      <div className="download-buttons">
        <a href="#" className="store-button" data-testid="android-download-btn">
          <Smartphone size={32} />
          <div className="store-info">
            <span>Get it on</span>
            <strong>Google Play</strong>
          </div>
        </a>
        <a href="#" className="store-button" data-testid="ios-download-btn">
          <Apple size={32} />
          <div className="store-info">
            <span>Download on the</span>
            <strong>App Store</strong>
          </div>
        </a>
      </div>
      <div className="coming-soon-badge" data-testid="coming-soon-badge">
        Coming Soon to App Stores!
      </div>
    </div>
  </section>
);

// Footer
const Footer = () => (
  <footer className="footer" data-testid="footer">
    <div className="container">
      <div className="footer-content">
        <div className="footer-brand">
          <img src="/logo.jpg" alt="Stag & Hen" />
          <p>The ultimate app for planning and enjoying stag and hen parties. Last stop before the altar!</p>
        </div>
        <div className="footer-column">
          <h4>Features</h4>
          <ul>
            <li><a href="#features">Media Sharing</a></li>
            <li><a href="#features">Crew Management</a></li>
            <li><a href="#features">Group Kitty</a></li>
            <li><a href="#features">Party Shop</a></li>
          </ul>
        </div>
        <div className="footer-column">
          <h4>Support</h4>
          <ul>
            <li><a href="#" data-testid="footer-faq">FAQs</a></li>
            <li><a href="#" data-testid="footer-contact">Contact Us</a></li>
            <li><a href="#" data-testid="footer-privacy">Privacy Policy</a></li>
            <li><a href="#" data-testid="footer-terms">Terms of Service</a></li>
          </ul>
        </div>
        <div className="footer-column">
          <h4>Download</h4>
          <ul>
            <li><a href="#download">Android App</a></li>
            <li><a href="#download">iOS App</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 The Stag & Hen. All rights reserved.</p>
        <div className="social-links">
          <a href="#" aria-label="Instagram" data-testid="social-instagram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="#" aria-label="Twitter" data-testid="social-twitter">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="#" aria-label="Facebook" data-testid="social-facebook">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
);

// Main App Component
function App() {
  return (
    <div className="App">
      <Header />
      <Hero />
      <Marquee />
      <Features />
      <AppPreview />
      <Download />
      <Footer />
    </div>
  );
}

export default App;
