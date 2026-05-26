import { Link } from "react-router-dom";

export default function Footer() {
  // Automatically computes the current calendar year dynamically
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="f-logo">नाल<span>पाक</span></div>
          <p className="f-tagline">
            India's marketplace for traditional snacks. We connect the most beloved regional snack brands with food lovers everywhere.
          </p>
        </div>
        
        <div className="f-col">
          <h4>Discover</h4>
          <Link to="/brands">All Brands</Link>
          <Link to="/regions">By Region</Link>
          <Link to="/catalog?filter=bestseller">Best Sellers</Link>
          <Link to="/catalog?filter=new">New Arrivals</Link>
          <Link to="/hampers">Gift Hampers</Link>
        </div>
        
        <div className="f-col">
          <h4>For Brands</h4>
          <Link to="/merchant/register">List Your Brand</Link>
          <Link to="/merchant/login">Seller Dashboard</Link>
          <Link to="/merchant/guidelines">Brand Guidelines</Link>
          <Link to="/merchant/partner">Become a Partner</Link>
        </div>
        
        <div className="f-col">
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
      
      <div className="footer-bottom">
        <span>© {currentYear} Nalapaka. Made with ❤️ for India's snack lovers.</span>
        <span>
          <Link to="/terms">Terms</Link> · 
          <Link to="/refunds">Refunds</Link> · 
          <Link to="/sitemap">Sitemap</Link>
        </span>
      </div>
    </footer>
  );
}