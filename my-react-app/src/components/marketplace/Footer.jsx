
export default function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="f-logo">नाल<span>पाक</span></div>
          <p className="f-tagline">India's marketplace for traditional snacks. We connect the most beloved regional snack brands with food lovers everywhere.</p>
        </div>
        <div className="f-col">
          <h4>Discover</h4>
          <a href="#">All Brands</a><a href="#">By Region</a><a href="#">Best Sellers</a><a href="#">New Arrivals</a><a href="#">Gift Hampers</a>
        </div>
        <div className="f-col">
          <h4>For Brands</h4>
          <a href="#">List Your Brand</a><a href="#">Seller Dashboard</a><a href="#">Brand Guidelines</a><a href="#">Become a Partner</a>
        </div>
        <div className="f-col">
          <h4>Company</h4>
          <a href="#">About Us</a><a href="#">Blog</a><a href="#">Careers</a><a href="#">Contact</a><a href="#">Privacy</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 Nalapaka. Made with ❤️ for India's snack lovers.</span>
        <span>Terms · Refunds · Sitemap</span>
      </div>
    </footer>
  );
}