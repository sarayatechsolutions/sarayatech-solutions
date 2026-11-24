import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Linkedin, Twitter, Facebook, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Column 1 - Brand */}
          <div className="lg:col-span-1">
            <Link
              to="/"
              className="flex items-center space-x-3 transition-smooth hover:opacity-80"
            >
              <img
                src="/logo-white.webp"
                width={300}
                height={200}
                alt="Company Logo"
                className="h-20 w-auto scale-125"
              />
            </Link>
            <p className="text-sm text-primary-foreground/80 mb-6">
              Your trusted partner for digital transformation. Custom solutions
              and expert support.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-smooth"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-smooth"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-smooth"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-smooth"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Column 2 - Services */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6">
              Services
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/solutions/web-mobile-development"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Web & Mobile
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions/data-bi-solutions"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Data & BI
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions/custom-business-software"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Business Software
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  All Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/newsroom"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Newsroom
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Resources */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/insights"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Blog & Insights
                </Link>
              </li>
              <li>
                <Link
                  to="/realisation"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Case Studies
                </Link>
              </li>
              <li>
                <Link
                  to="/documentation"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5 - Newsletter */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6">
              Stay Updated
            </h3>
            <p className="text-sm text-primary-foreground/80 mb-4">
              Get the latest news and insights delivered to your inbox.
            </p>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
              />
              <Button className="w-full bg-accent hover:bg-accent-light text-accent-foreground">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-primary-foreground/60">
              © 2024 SarayaTech Solutions. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link
                to="/privacy"
                className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-smooth"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-smooth"
              >
                Terms of Service
              </Link>
              <Link
                to="/cookies"
                className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-smooth"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
