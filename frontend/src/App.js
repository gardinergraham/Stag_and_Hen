import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Camera, Users, ShoppingBag, Wallet, QrCode, Shield, PartyPopper, Heart, Check, Smartphone, Apple, Plus, RefreshCw, Lock, ExternalLink, Save, Trash2, X, ClipboardList, Trophy, Gamepad2, Video, Target } from "lucide-react";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://stagandhen-production.up.railway.app";
const API_BASE_URL = `${BACKEND_URL}/api`;
const ADMIN_USERNAME = "GrahamAdmin";
const ADMIN_PASSWORD = "1234";
const heroBackgrounds = [
  {
    src: "/assets/images/henGirlsBack.webp",
    alt: "Hen party celebration",
  },
  {
    src: "/assets/images/stagBoysBack.webp",
    alt: "Stag party celebration",
  },
];
const heroBackground = heroBackgrounds[Math.floor(Math.random() * heroBackgrounds.length)];
const emptyShopForm = {
  name: "",
  description: "",
  price: "",
  affiliate_url: "",
  image_url: "",
  category: "other",
};
const emptyDareForm = {
  text: "",
  category: "warmup",
  event_type: "all",
};
const emptySpinnerPairForm = {
  title: "",
  left: "",
  right: "",
  left_detail: "",
  right_detail: "",
  left_color: "#00B7FF",
  right_color: "#22C55E",
  event_type: "all",
};
const emptyMissionForm = {
  text: "",
  event_type: "all",
};
const dareCategories = [
  { id: "warmup", name: "Warm Up" },
  { id: "photo", name: "Photo Dare" },
  { id: "cheeky", name: "Cheeky" },
  { id: "drinks", name: "Drinks" },
];

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
        src={heroBackground.src}
        alt={heroBackground.alt}
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
    },
    {
      icon: <Gamepad2 />,
      title: "Party Games Hub",
      description: "Dares, spinner choices, photo challenges, drinking games, and secret missions keep the whole group involved."
    },
    {
      icon: <Video />,
      title: "Messages & Advice",
      description: "Capture keepsake video messages, future wishes, memories, and advice for the bride or groom."
    },
    {
      icon: <Trophy />,
      title: "Prize Points",
      description: "Award crew points for missions, dares, photo proof, and best moments, then crown a winner at the end."
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
            <li><Check size={20} /> Play dares, spinner rounds, photo challenges and drinking games</li>
            <li><Check size={20} /> Give secret missions and award prize points</li>
            <li><Check size={20} /> Record video messages and advice for the bride or groom</li>
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
                <div className="phone-app-header">
                  <img src="/logo.jpg" alt="Stag & Hen App" />
                  <div>
                    <h4>Preview Party Weekend</h4>
                    <p>Hen Party</p>
                  </div>
                </div>
                <div className="phone-balance-card">
                  <span>Kitty Balance</span>
                  <strong>£185.00</strong>
                </div>
                <div className="phone-game-grid">
                  <div><Target size={18} />Dares</div>
                  <div><Gamepad2 size={18} />Spinner</div>
                  <div><Video size={18} />Messages</div>
                  <div><Trophy size={18} />Points</div>
                </div>
                <div className="phone-leaderboard">
                  <span>Prize Points</span>
                  <p><strong>55</strong> Best Mate</p>
                  <p><strong>35</strong> Maid of Honour</p>
                </div>
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
            <li><a href="/support" data-testid="footer-faq">FAQs</a></li>
            <li><a href="/support" data-testid="footer-contact">Contact Us</a></li>
            <li><a href="/privacy" data-testid="footer-privacy">Privacy Policy</a></li>
            <li><a href="/terms" data-testid="footer-terms">Terms of Service</a></li>
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

const TermsPage = () => (
  <div className="App">
    <Header />
    <main className="legal-page">
      <section className="legal-hero">
        <div className="container">
          <p className="legal-eyebrow">Legal</p>
          <h1>Stag & Hen Terms & Conditions</h1>
          <p>
            Welcome to Stag & Hen. By accessing or using this platform, you agree to comply
            with and be bound by the following terms and conditions.
          </p>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="container legal-content">
          <article>
            <h2>1. Event Access</h2>
            <p>Guests may only access an event using the official event name and access PIN provided by the organiser. Unauthorised access to events or content is strictly prohibited.</p>
          </article>
          <article>
            <h2>2. Uploads and Content</h2>
            <p>By uploading photos, videos, messages, or other content, you confirm that you have the right to share that content and that it does not contain unlawful, offensive, harmful, or inappropriate material.</p>
            <p>Stag & Hen and event organisers reserve the right to remove any content at their discretion without notice.</p>
          </article>
          <article>
            <h2>3. Privacy</h2>
            <p>Content shared within an event is intended only for the organiser and invited participants of that event. Stag & Hen does not sell personal information or share user data with unrelated third parties.</p>
          </article>
          <article>
            <h2>4. User Responsibility</h2>
            <p>Users are responsible for the content they upload and share. You agree not to use the platform for harassment, abuse, spam, copyright infringement, or unlawful activity.</p>
          </article>
          <article>
            <h2>5. Availability of Service</h2>
            <p>While we aim to provide a reliable service, Stag & Hen cannot guarantee uninterrupted access at all times. Features, storage limits, or services may change or be updated without notice.</p>
          </article>
          <article>
            <h2>6. Liability</h2>
            <p>Stag & Hen is not responsible for user-generated content, lost uploads, event disputes, or temporary technical interruptions. Use of the platform is at your own discretion and risk.</p>
          </article>
          <article>
            <h2>7. Removal of Content or Accounts</h2>
            <p>We reserve the right to suspend or remove access to events, content, or accounts that breach these terms or are deemed harmful to the platform or its users.</p>
          </article>
          <article>
            <h2>8. Drinking Games & Activities Disclaimer</h2>
            <p>Stag & Hen may include party games, challenges, dares, and social activities that can involve alcoholic or non-alcoholic drinks. Participation in any activity is entirely voluntary and at the user’s own discretion.</p>
            <p>Users are solely responsible for their own behaviour, safety, wellbeing, and decisions while participating in activities organised through the platform. Stag & Hen does not encourage excessive drinking, dangerous behaviour, illegal activity, or actions that may cause harm to yourself or others.</p>
            <p>By using the platform, you acknowledge that Stag & Hen accepts no responsibility or liability for any injury, damage, loss, illness, accidents, disputes, or consequences arising from participation in drinking games, challenges, dares, events, or related activities.</p>
          </article>
          <p className="legal-updated">Last updated: May 2026</p>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

const PrivacyPage = () => (
  <div className="App">
    <Header />
    <main className="legal-page">
      <section className="legal-hero">
        <div className="container">
          <p className="legal-eyebrow">Privacy</p>
          <h1>Stag & Hen Privacy Policy</h1>
          <p>
            This policy explains what information Stag & Hen collects, how it is used,
            and the choices available to event owners and guests.
          </p>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="container legal-content">
          <article>
            <h2>1. Information We Collect</h2>
            <p>We collect information needed to create and run events, including event names, organiser names, guest names, PIN access details, photos, videos, messages, game activity, points, kitty activity, wishlist requests, and basic technical information such as device and app usage data.</p>
          </article>
          <article>
            <h2>2. Photos, Videos, and User Content</h2>
            <p>Photos, videos, messages, and other uploads are shared inside the event for the organiser and invited participants. Users are responsible for the content they upload and must only upload content they have permission to share.</p>
          </article>
          <article>
            <h2>3. Camera and Photo Permissions</h2>
            <p>The app asks for camera and photo library permissions so users can scan QR codes, take photos or videos, upload media, and save selected media where supported. These permissions are used only for app features requested by the user.</p>
          </article>
          <article>
            <h2>4. Payments</h2>
            <p>Event purchases may be handled by Stripe, Apple, or Google depending on the platform. Stag & Hen does not store full card details. Payment providers process payment information under their own security and privacy policies.</p>
          </article>
          <article>
            <h2>5. How We Use Information</h2>
            <p>We use information to create events, let guests join, manage media galleries, operate games and party features, support purchases, provide customer support, prevent abuse, improve the service, and comply with legal or platform requirements.</p>
          </article>
          <article>
            <h2>6. Sharing of Information</h2>
            <p>We do not sell personal information. Event content is intended for the organiser and invited event participants. We may share limited information with trusted service providers who help operate hosting, storage, payments, analytics, or support.</p>
          </article>
          <article>
            <h2>7. Data Deletion</h2>
            <p>Event owners can delete event data from within the app. Deletion may remove event details, crew records, media records, games, points, kitty history, and related content. Users can also contact support for help with data deletion requests.</p>
          </article>
          <article>
            <h2>8. Data Security and Retention</h2>
            <p>We use reasonable technical measures to protect event data. Some event packages may include automatic media deletion rules. Where no deletion rule applies, data may be kept while the event remains active or until deletion is requested.</p>
          </article>
          <article>
            <h2>9. Children</h2>
            <p>Stag & Hen is intended for adult event organisers and guests. The app is not directed at children.</p>
          </article>
          <article>
            <h2>10. Contact</h2>
            <p>For privacy questions or deletion requests, contact us at <strong>support@stag-and-hen.com</strong>.</p>
          </article>
          <p className="legal-updated">Last updated: May 2026</p>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

const PaymentStatusPage = ({ status }) => {
  const success = status === "success";
  return (
    <div className="App">
      <Header />
      <main className="legal-page">
        <section className="legal-hero payment-status-hero">
          <div className="container">
            <p className="legal-eyebrow">{success ? "Payment Complete" : "Payment Cancelled"}</p>
            <h1>{success ? "Your Event Is Paid" : "Checkout Was Cancelled"}</h1>
            <p>
              {success
                ? "Stripe has confirmed the payment. You can return to the Stag & Hen app and continue setting up your event."
                : "No payment was taken. You can return to the Stag & Hen app and try again from the event owner screen."}
            </p>
            <div className="hero-buttons payment-status-actions">
              <a href="/" className="btn btn-primary">Back to Home</a>
              <a href="#download" className="btn btn-secondary">Get the App</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const SupportPage = () => (
  <div className="App">
    <Header />
    <main className="legal-page">
      <section className="legal-hero support-hero">
        <div className="container">
          <p className="legal-eyebrow">Support</p>
          <h1>Stag & Hen Support</h1>
          <p>We are here to help you create, share, and enjoy your stag or hen event.</p>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="container support-content">
          <article className="support-card">
            <h2>Contact Us</h2>
            <p>If you need help or are experiencing issues, contact us at:</p>
            <p><strong>support@stag-and-hen.com</strong></p>
            <p>We aim to reply within 24 hours.</p>
          </article>

          <article className="support-card">
            <h2>Quick Help</h2>
            <ul>
              <li><strong>Join an event:</strong> Open the app, choose QR scan or manual join, then enter the event name and PIN.</li>
              <li><strong>Owner login:</strong> Use the event name and owner PIN created when the event was purchased.</li>
              <li><strong>Upload photos or videos:</strong> Make sure camera and photo permissions are enabled on your device.</li>
              <li><strong>Payment completed:</strong> Return to the app home screen and pull to refresh if the event still says payment pending.</li>
            </ul>
          </article>

          <article className="support-card">
            <h2>For Event Owners</h2>
            <p>As an event owner, you can:</p>
            <ul>
              <li>Create and purchase an event package</li>
              <li>Share QR codes and PINs with the crew</li>
              <li>Manage the private gallery and delete media</li>
              <li>Track the kitty, award points, and run party games</li>
              <li>Delete event data from the app home screen</li>
            </ul>
          </article>

          <article className="support-card">
            <h2>Troubleshooting</h2>
            <ul>
              <li><strong>Guests cannot join:</strong> Double-check the event name and access PIN.</li>
              <li><strong>Photos will not upload:</strong> Check media permissions and your network connection.</li>
              <li><strong>Upload window closed:</strong> The package rules may limit media access after the event.</li>
              <li><strong>Payment issue:</strong> Try opening Stripe Checkout again from the owner home screen.</li>
            </ul>
          </article>

          <div className="support-links">
            <a href="/" className="btn btn-secondary">About Stag & Hen</a>
            <a href="/terms" className="btn btn-primary">Terms & Conditions</a>
            <a href="/privacy" className="btn btn-secondary">Privacy Policy</a>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

const AdminPage = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [isAuthed, setIsAuthed] = useState(false);
  const [form, setForm] = useState(emptyShopForm);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dares, setDares] = useState([]);
  const [dareForm, setDareForm] = useState(emptyDareForm);
  const [selectedDare, setSelectedDare] = useState(null);
  const [spinnerPairs, setSpinnerPairs] = useState([]);
  const [spinnerPairForm, setSpinnerPairForm] = useState(emptySpinnerPairForm);
  const [selectedSpinnerPair, setSelectedSpinnerPair] = useState(null);
  const [missionTemplates, setMissionTemplates] = useState([]);
  const [missionForm, setMissionForm] = useState(emptyMissionForm);
  const [selectedMission, setSelectedMission] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadShopData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [itemsRes, categoriesRes, requestsRes, daresRes, spinnerPairsRes, missionTemplatesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/shop/items`),
        axios.get(`${API_BASE_URL}/shop/categories`),
        axios.get(`${API_BASE_URL}/shop-requests/`, {
          params: {
            status: "pending",
            ...getAdminParams(),
          },
        }),
        axios.get(`${API_BASE_URL}/dares/`, {
          params: {
            include_event: false,
          },
        }),
        axios.get(`${API_BASE_URL}/dares/spinner-pairs`, {
          params: {
            include_event: false,
          },
        }),
        axios.get(`${API_BASE_URL}/dares/secret-mission-templates`),
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data.categories);
      setRequests(requestsRes.data);
      setDares(daresRes.data);
      setSpinnerPairs(spinnerPairsRes.data);
      setMissionTemplates(missionTemplatesRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) {
      loadShopData();
    }
  }, [isAuthed, loadShopData]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateDareForm = (key, value) => {
    setDareForm((current) => ({ ...current, [key]: value }));
  };

  const updateSpinnerPairForm = (key, value) => {
    setSpinnerPairForm((current) => ({ ...current, [key]: value }));
  };

  const updateMissionForm = (key, value) => {
    setMissionForm((current) => ({ ...current, [key]: value }));
  };

  const getAdminParams = () => ({
    admin_username: ADMIN_USERNAME,
    admin_password: ADMIN_PASSWORD,
  });

  const resetForm = () => {
    setSelectedItem(null);
    setSelectedRequest(null);
    setForm(emptyShopForm);
    setError("");
    setStatus("");
  };

  const resetDareForm = () => {
    setSelectedDare(null);
    setDareForm(emptyDareForm);
    setError("");
    setStatus("");
  };

  const resetSpinnerPairForm = () => {
    setSelectedSpinnerPair(null);
    setSpinnerPairForm(emptySpinnerPairForm);
    setError("");
    setStatus("");
  };

  const resetMissionForm = () => {
    setSelectedMission(null);
    setMissionForm(emptyMissionForm);
    setError("");
    setStatus("");
  };

  const selectDare = (dare) => {
    setSelectedDare(dare);
    setDareForm({
      text: dare.text || "",
      category: dare.category || "warmup",
      event_type: dare.event_type || "all",
    });
    setError("");
    setStatus("");
  };

  const selectSpinnerPair = (pair) => {
    setSelectedSpinnerPair(pair);
    setSpinnerPairForm({
      title: pair.title || "",
      left: pair.left || "",
      right: pair.right || "",
      left_detail: pair.left_detail || "",
      right_detail: pair.right_detail || "",
      left_color: pair.left_color || "#00B7FF",
      right_color: pair.right_color || "#22C55E",
      event_type: pair.event_type || "all",
    });
    setError("");
    setStatus("");
  };

  const selectMission = (mission) => {
    setSelectedMission(mission);
    setMissionForm({
      text: mission.text || "",
      event_type: mission.event_type || "all",
    });
    setError("");
    setStatus("");
  };

  const selectRequest = (request) => {
    setSelectedRequest(request);
    setSelectedItem(null);
    setForm({
      name: request.product_name || "",
      description: request.notes || "",
      price: "",
      affiliate_url: request.product_url || "",
      image_url: "",
      category: "other",
    });
    setError("");
    setStatus("Request loaded. Add price/image/category, then save as a shop item.");
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      price: String(item.price ?? ""),
      affiliate_url: item.affiliate_url || "",
      image_url: item.image_url || "",
      category: item.category || "other",
    });
    setError("");
    setStatus("");
  };

  const handleLogin = (event) => {
    event.preventDefault();
    setError("");

    if (credentials.username.trim() !== ADMIN_USERNAME || credentials.password !== ADMIN_PASSWORD) {
      setError("Admin username or password is incorrect.");
      return;
    }

    setIsAuthed(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const price = Number.parseFloat(form.price);
    setError("");
    setStatus("");

    if (!form.name.trim() || !form.affiliate_url.trim() || !form.image_url.trim()) {
      setError("Please add a product name, image URL, and shop link.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Please enter a valid product price.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        affiliate_url: form.affiliate_url.trim(),
        image_url: form.image_url.trim(),
        category: form.category,
      };

      if (selectedItem) {
        await axios.put(`${API_BASE_URL}/shop/items/${selectedItem.id}`, payload, {
          params: getAdminParams(),
        });
        setStatus("Product updated.");
      } else {
        await axios.post(`${API_BASE_URL}/shop/items`, payload, {
          params: getAdminParams(),
        });
        if (selectedRequest) {
          await axios.put(`${API_BASE_URL}/shop-requests/${selectedRequest.id}/status`, null, {
            params: {
              status: "approved",
              ...getAdminParams(),
            },
          });
        }
        setStatus("Product added to the party shop.");
      }

      setSelectedItem(null);
      setSelectedRequest(null);
      setForm(emptyShopForm);
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save this product.");
    } finally {
      setSaving(false);
    }
  };

  const rejectRequest = async (request) => {
    const confirmed = window.confirm(`Reject "${request.product_name}"?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");
    try {
      await axios.put(`${API_BASE_URL}/shop-requests/${request.id}/status`, null, {
        params: {
          status: "rejected",
          ...getAdminParams(),
        },
      });
      if (selectedRequest?.id === request.id) {
        setSelectedRequest(null);
        setForm(emptyShopForm);
      }
      setStatus("Request rejected.");
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update this request.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete "${item.name}" from the party shop?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");
    try {
      await axios.delete(`${API_BASE_URL}/shop/items/${item.id}`, {
        params: getAdminParams(),
      });
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        setForm(emptyShopForm);
      }
      setStatus("Product deleted.");
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete this product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDareSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!dareForm.text.trim()) {
      setError("Please add the dare text.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        text: dareForm.text.trim(),
        category: dareForm.category,
        event_type: dareForm.event_type,
        event_id: null,
      };

      if (selectedDare) {
        await axios.put(`${API_BASE_URL}/dares/${selectedDare.id}`, payload, {
          params: getAdminParams(),
        });
        setStatus("Dare updated.");
      } else {
        await axios.post(`${API_BASE_URL}/dares/`, payload, {
          params: getAdminParams(),
        });
        setStatus("Dare added to the app.");
      }

      setSelectedDare(null);
      setDareForm(emptyDareForm);
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save this dare.");
    } finally {
      setSaving(false);
    }
  };

  const handleDareDelete = async (dare) => {
    const confirmed = window.confirm(`Delete this dare?\n\n"${dare.text}"`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");
    try {
      await axios.delete(`${API_BASE_URL}/dares/${dare.id}`, {
        params: getAdminParams(),
      });
      if (selectedDare?.id === dare.id) {
        setSelectedDare(null);
        setDareForm(emptyDareForm);
      }
      setStatus("Dare deleted.");
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete this dare.");
    } finally {
      setSaving(false);
    }
  };

  const handleSpinnerPairSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!spinnerPairForm.title.trim() || !spinnerPairForm.left.trim() || !spinnerPairForm.right.trim()) {
      setError("Please add a title and both spinner choices.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: spinnerPairForm.title.trim(),
        left: spinnerPairForm.left.trim(),
        right: spinnerPairForm.right.trim(),
        left_detail: spinnerPairForm.left_detail.trim() || null,
        right_detail: spinnerPairForm.right_detail.trim() || null,
        left_color: spinnerPairForm.left_color.trim() || "#00B7FF",
        right_color: spinnerPairForm.right_color.trim() || "#22C55E",
        event_type: spinnerPairForm.event_type,
        event_id: null,
      };

      if (selectedSpinnerPair) {
        await axios.put(`${API_BASE_URL}/dares/spinner-pairs/${selectedSpinnerPair.id}`, payload, {
          params: getAdminParams(),
        });
        setStatus("Spinner choice updated.");
      } else {
        await axios.post(`${API_BASE_URL}/dares/spinner-pairs`, payload, {
          params: getAdminParams(),
        });
        setStatus("Spinner choice added to the app.");
      }

      setSelectedSpinnerPair(null);
      setSpinnerPairForm(emptySpinnerPairForm);
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save this spinner choice.");
    } finally {
      setSaving(false);
    }
  };

  const handleSpinnerPairDelete = async (pair) => {
    const confirmed = window.confirm(`Delete this spinner choice?\n\n"${pair.title}"`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");
    try {
      await axios.delete(`${API_BASE_URL}/dares/spinner-pairs/${pair.id}`, {
        params: getAdminParams(),
      });
      if (selectedSpinnerPair?.id === pair.id) {
        setSelectedSpinnerPair(null);
        setSpinnerPairForm(emptySpinnerPairForm);
      }
      setStatus("Spinner choice deleted.");
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete this spinner choice.");
    } finally {
      setSaving(false);
    }
  };

  const handleMissionSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!missionForm.text.trim()) {
      setError("Please add the secret mission text.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        text: missionForm.text.trim(),
        event_type: missionForm.event_type,
      };

      if (selectedMission) {
        await axios.put(`${API_BASE_URL}/dares/secret-mission-templates/${selectedMission.id}`, payload, {
          params: getAdminParams(),
        });
        setStatus("Secret mission updated.");
      } else {
        await axios.post(`${API_BASE_URL}/dares/secret-mission-templates`, payload, {
          params: getAdminParams(),
        });
        setStatus("Secret mission added to the app.");
      }

      setSelectedMission(null);
      setMissionForm(emptyMissionForm);
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save this secret mission.");
    } finally {
      setSaving(false);
    }
  };

  const handleMissionDelete = async (mission) => {
    const confirmed = window.confirm(`Delete this secret mission?\n\n"${mission.text}"`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");
    try {
      await axios.delete(`${API_BASE_URL}/dares/secret-mission-templates/${mission.id}`, {
        params: getAdminParams(),
      });
      if (selectedMission?.id === mission.id) {
        setSelectedMission(null);
        setMissionForm(emptyMissionForm);
      }
      setStatus("Secret mission deleted.");
      await loadShopData();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete this secret mission.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthed) {
    return (
      <main className="admin-shell">
        <section className="admin-login-panel">
          <div className="admin-login-brand">
            <img src="/logo.jpg" alt="Stag & Hen" />
            <div>
              <p>Shop Admin</p>
              <h1>The Stag & Hen</h1>
            </div>
          </div>
          <form className="admin-card admin-login-form" onSubmit={handleLogin}>
            <div className="admin-card-header">
              <Lock size={20} />
              <h2>Admin Login</h2>
            </div>
            <label>
              Username
              <input
                value={credentials.username}
                onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
                placeholder="GrahamAdmin"
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                placeholder="1234"
                autoComplete="current-password"
              />
            </label>
            {error && <div className="admin-alert admin-alert-error">{error}</div>}
            <button className="btn btn-primary admin-submit" type="submit">Open Admin</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell admin-workspace">
      <header className="admin-topbar">
        <a href="/" className="logo">
          <img src="/logo.jpg" alt="Stag & Hen" />
          <span className="logo-text">The Stag <span>&</span> Hen</span>
        </a>
        <button className="btn btn-secondary" type="button" onClick={loadShopData} disabled={loading}>
          <RefreshCw size={18} />
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </header>

      <section className="admin-layout">
        <form className="admin-card admin-form" onSubmit={handleSubmit}>
          <div className="admin-card-header">
            {selectedItem ? <Save size={20} /> : <Plus size={20} />}
            <div>
              <p>{selectedItem ? "Editing Product" : selectedRequest ? "From Wishlist" : "New Product"}</p>
              <h1>{selectedItem ? "Update Shop Item" : "Add Shop Item"}</h1>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Product Name
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Bride squad sash pack"
              />
            </label>
            <label>
              Price
              <input
                value={form.price}
                onChange={(event) => updateForm("price", event.target.value)}
                placeholder="12.99"
                inputMode="decimal"
              />
            </label>
          </div>

          <label>
            Shop or Affiliate Link
            <input
              value={form.affiliate_url}
              onChange={(event) => updateForm("affiliate_url", event.target.value)}
              placeholder="https://www.amazon.co.uk/dp/..."
            />
          </label>

          <label>
            Product Image URL
            <input
              value={form.image_url}
              onChange={(event) => updateForm("image_url", event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="Short note for users in the app"
              rows={4}
            />
          </label>

          <label>
            Category
            <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          {error && <div className="admin-alert admin-alert-error">{error}</div>}
          {status && <div className="admin-alert admin-alert-success">{status}</div>}
          {selectedRequest && (
            <div className="admin-request-note">
              Request from {selectedRequest.requester_name}
              {selectedRequest.event_name ? ` for ${selectedRequest.event_name}` : ""}
            </div>
          )}

          <div className="admin-form-actions">
            <button className="btn btn-primary admin-submit" type="submit" disabled={saving}>
              {selectedItem ? <Save size={18} /> : <Plus size={18} />}
              {saving ? "Saving" : selectedItem ? "Update Product" : "Add Product"}
            </button>
            {selectedItem && (
              <button className="btn btn-secondary admin-submit" type="button" onClick={resetForm}>
                <X size={18} />
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <aside className="admin-card admin-preview">
          <div className="admin-card-header">
            <ClipboardList size={20} />
            <div>
              <p>Wishlist</p>
              <h2>{requests.length} Requests</h2>
            </div>
          </div>
          <div className="admin-request-list">
            {requests.length === 0 ? (
              <p className="admin-empty-text">No pending product requests.</p>
            ) : (
              requests.map((request) => (
                <article
                  className={`admin-request-row ${selectedRequest?.id === request.id ? "admin-product-row-selected" : ""}`}
                  key={request.id}
                >
                  <button className="admin-request-main" type="button" onClick={() => selectRequest(request)}>
                    <h3>{request.product_name}</h3>
                    <p>{request.requester_name}{request.event_name ? ` · ${request.event_name}` : ""}</p>
                    {request.notes && <span>{request.notes}</span>}
                  </button>
                  <div className="admin-product-actions">
                    {request.product_url && (
                      <a href={request.product_url} target="_blank" rel="noreferrer" aria-label={`Open ${request.product_name}`}>
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button type="button" onClick={() => rejectRequest(request)} aria-label={`Reject ${request.product_name}`}>
                      <X size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="admin-card-header">
            <ShoppingBag size={20} />
            <div>
              <p>Live Shop</p>
              <h2>{items.length} Products</h2>
            </div>
          </div>
          <div className="admin-product-list">
            {items.map((item) => (
              <article
                className={`admin-product-row ${selectedItem?.id === item.id ? "admin-product-row-selected" : ""}`}
                key={item.id}
              >
                <button className="admin-product-main" type="button" onClick={() => selectItem(item)}>
                  <img src={item.image_url} alt="" />
                  <div>
                    <h3>{item.name}</h3>
                    <p>£{Number(item.price).toFixed(2)} · {item.category}</p>
                  </div>
                </button>
                <div className="admin-product-actions">
                  <a href={item.affiliate_url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name}`}>
                    <ExternalLink size={16} />
                  </a>
                  <button type="button" onClick={() => handleDelete(item)} aria-label={`Delete ${item.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="admin-layout admin-dares-section">
        <form className="admin-card admin-form" onSubmit={handleDareSubmit}>
          <div className="admin-card-header">
            {selectedDare ? <Save size={20} /> : <Plus size={20} />}
            <div>
              <p>{selectedDare ? "Editing Dare" : "New Dare"}</p>
              <h1>{selectedDare ? "Update Dare" : "Add Dare Card"}</h1>
            </div>
          </div>

          <label>
            Dare Text
            <textarea
              value={dareForm.text}
              onChange={(event) => updateDareForm("text", event.target.value)}
              placeholder="e.g., Take a group selfie with everyone pulling their worst serious face."
              rows={4}
            />
          </label>

          <div className="admin-form-grid">
            <label>
              Category
              <select value={dareForm.category} onChange={(event) => updateDareForm("category", event.target.value)}>
                {dareCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              Event Type
              <select value={dareForm.event_type} onChange={(event) => updateDareForm("event_type", event.target.value)}>
                <option value="all">All</option>
                <option value="stag">Stag</option>
                <option value="hen">Hen</option>
              </select>
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="btn btn-primary admin-submit" type="submit" disabled={saving}>
              {selectedDare ? <Save size={18} /> : <Plus size={18} />}
              {saving ? "Saving" : selectedDare ? "Update Dare" : "Add Dare"}
            </button>
            {selectedDare && (
              <button className="btn btn-secondary admin-submit" type="button" onClick={resetDareForm}>
                <X size={18} />
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <aside className="admin-card admin-preview">
          <div className="admin-card-header">
            <ClipboardList size={20} />
            <div>
              <p>Global Dares</p>
              <h2>{dares.length} Cards</h2>
            </div>
          </div>
          <div className="admin-product-list admin-dare-list">
            {dares.length === 0 ? (
              <p className="admin-empty-text">No dares have been added yet.</p>
            ) : (
              dares.map((dare) => (
                <article
                  className={`admin-product-row ${selectedDare?.id === dare.id ? "admin-product-row-selected" : ""}`}
                  key={dare.id}
                >
                  <button className="admin-request-main" type="button" onClick={() => selectDare(dare)}>
                    <h3>{dare.text}</h3>
                    <p>{dare.category} · {dare.event_type}</p>
                  </button>
                  <div className="admin-product-actions">
                    <button type="button" onClick={() => handleDareDelete(dare)} aria-label="Delete dare">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="admin-layout admin-dares-section">
        <form className="admin-card admin-form" onSubmit={handleSpinnerPairSubmit}>
          <div className="admin-card-header">
            {selectedSpinnerPair ? <Save size={20} /> : <Plus size={20} />}
            <div>
              <p>{selectedSpinnerPair ? "Editing Spinner" : "New Spinner"}</p>
              <h1>{selectedSpinnerPair ? "Update Two Choices" : "Add Two Choices"}</h1>
            </div>
          </div>

          <label>
            Spinner Title
            <input
              value={spinnerPairForm.title}
              onChange={(event) => updateSpinnerPairForm("title", event.target.value)}
              placeholder="e.g., Drink or Safe"
            />
          </label>

          <div className="admin-form-grid">
            <label>
              Choice One
              <input
                value={spinnerPairForm.left}
                onChange={(event) => updateSpinnerPairForm("left", event.target.value)}
                placeholder="Drink"
              />
            </label>
            <label>
              Choice Two
              <input
                value={spinnerPairForm.right}
                onChange={(event) => updateSpinnerPairForm("right", event.target.value)}
                placeholder="Safe"
              />
            </label>
          </div>

          <div className="admin-form-grid">
            <label>
              Choice One Detail
              <input
                value={spinnerPairForm.left_detail}
                onChange={(event) => updateSpinnerPairForm("left_detail", event.target.value)}
                placeholder="Take two sips."
              />
            </label>
            <label>
              Choice Two Detail
              <input
                value={spinnerPairForm.right_detail}
                onChange={(event) => updateSpinnerPairForm("right_detail", event.target.value)}
                placeholder="You are safe this round."
              />
            </label>
          </div>

          <div className="admin-form-grid">
            <label>
              Choice One Colour
              <input
                type="color"
                value={spinnerPairForm.left_color}
                onChange={(event) => updateSpinnerPairForm("left_color", event.target.value)}
              />
            </label>
            <label>
              Choice Two Colour
              <input
                type="color"
                value={spinnerPairForm.right_color}
                onChange={(event) => updateSpinnerPairForm("right_color", event.target.value)}
              />
            </label>
          </div>

          <label>
            Event Type
            <select
              value={spinnerPairForm.event_type}
              onChange={(event) => updateSpinnerPairForm("event_type", event.target.value)}
            >
              <option value="all">All</option>
              <option value="stag">Stag</option>
              <option value="hen">Hen</option>
            </select>
          </label>

          <div className="admin-form-actions">
            <button className="btn btn-primary admin-submit" type="submit" disabled={saving}>
              {selectedSpinnerPair ? <Save size={18} /> : <Plus size={18} />}
              {saving ? "Saving" : selectedSpinnerPair ? "Update Choices" : "Add Choices"}
            </button>
            {selectedSpinnerPair && (
              <button className="btn btn-secondary admin-submit" type="button" onClick={resetSpinnerPairForm}>
                <X size={18} />
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <aside className="admin-card admin-preview">
          <div className="admin-card-header">
            <ClipboardList size={20} />
            <div>
              <p>Spinner Choices</p>
              <h2>{spinnerPairs.length} Pairs</h2>
            </div>
          </div>
          <div className="admin-product-list admin-dare-list">
            {spinnerPairs.length === 0 ? (
              <p className="admin-empty-text">No spinner choices have been added yet.</p>
            ) : (
              spinnerPairs.map((pair) => (
                <article
                  className={`admin-product-row ${selectedSpinnerPair?.id === pair.id ? "admin-product-row-selected" : ""}`}
                  key={pair.id}
                >
                  <button className="admin-request-main" type="button" onClick={() => selectSpinnerPair(pair)}>
                    <h3>{pair.title}</h3>
                    <p>{pair.left} / {pair.right} · {pair.event_type}</p>
                  </button>
                  <div className="admin-product-actions">
                    <button type="button" onClick={() => handleSpinnerPairDelete(pair)} aria-label="Delete spinner choice">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="admin-layout admin-dares-section">
        <form className="admin-card admin-form" onSubmit={handleMissionSubmit}>
          <div className="admin-card-header">
            {selectedMission ? <Save size={20} /> : <Plus size={20} />}
            <div>
              <p>{selectedMission ? "Editing Mission" : "New Mission"}</p>
              <h1>{selectedMission ? "Update Secret Mission" : "Add Secret Mission"}</h1>
            </div>
          </div>

          <label>
            Mission Text
            <textarea
              value={missionForm.text}
              onChange={(event) => updateMissionForm("text", event.target.value)}
              placeholder="e.g., Make someone say pineapple without telling them why."
              rows={4}
            />
          </label>

          <label>
            Event Type
            <select
              value={missionForm.event_type}
              onChange={(event) => updateMissionForm("event_type", event.target.value)}
            >
              <option value="all">All</option>
              <option value="stag">Stag</option>
              <option value="hen">Hen</option>
            </select>
          </label>

          <div className="admin-form-actions">
            <button className="btn btn-primary admin-submit" type="submit" disabled={saving}>
              {selectedMission ? <Save size={18} /> : <Plus size={18} />}
              {saving ? "Saving" : selectedMission ? "Update Mission" : "Add Mission"}
            </button>
            {selectedMission && (
              <button className="btn btn-secondary admin-submit" type="button" onClick={resetMissionForm}>
                <X size={18} />
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <aside className="admin-card admin-preview">
          <div className="admin-card-header">
            <ClipboardList size={20} />
            <div>
              <p>Secret Missions</p>
              <h2>{missionTemplates.length} Missions</h2>
            </div>
          </div>
          <div className="admin-product-list admin-dare-list">
            {missionTemplates.length === 0 ? (
              <p className="admin-empty-text">No secret missions have been added yet.</p>
            ) : (
              missionTemplates.map((mission) => (
                <article
                  className={`admin-product-row ${selectedMission?.id === mission.id ? "admin-product-row-selected" : ""}`}
                  key={mission.id}
                >
                  <button className="admin-request-main" type="button" onClick={() => selectMission(mission)}>
                    <h3>{mission.text}</h3>
                    <p>{mission.event_type}</p>
                  </button>
                  <div className="admin-product-actions">
                    <button type="button" onClick={() => handleMissionDelete(mission)} aria-label="Delete secret mission">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
};

// Main App Component
function App() {
  if (window.location.pathname === "/admin") {
    return <AdminPage />;
  }
  if (window.location.pathname === "/terms") {
    return <TermsPage />;
  }
  if (window.location.pathname === "/support") {
    return <SupportPage />;
  }
  if (window.location.pathname === "/privacy") {
    return <PrivacyPage />;
  }
  if (window.location.pathname === "/payment-success") {
    return <PaymentStatusPage status="success" />;
  }
  if (window.location.pathname === "/payment-cancel") {
    return <PaymentStatusPage status="cancel" />;
  }

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
