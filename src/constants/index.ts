// About page data
import {
  Target,
  Heart,
  Shield,
  TrendingUp,
  Landmark,
  Building2,
  Factory,
  GraduationCap,
  ShoppingCart,
} from "lucide-react";

export const ABOUT_VALUES = [
  {
    icon: Target,
    title: "Innovation First",
    description:
      "We push boundaries and embrace new technologies to deliver cutting-edge solutions.",
  },
  {
    icon: Heart,
    title: "Client Success",
    description:
      "Your success is our mission. We partner deeply to achieve your business goals.",
  },
  {
    icon: Shield,
    title: "Trust & Integrity",
    description:
      "We build lasting relationships founded on transparency and ethical practices.",
  },
  {
    icon: TrendingUp,
    title: "Continuous Excellence",
    description:
      "We never settle. Every day we strive to deliver better results and exceed expectations.",
  },
];

// Fabricated executives removed (STS-018). Only real team members belong here;
// the live About page reads data/leadership-team.json.
export const LEADERSHIP_TEAM: { name: string; role: string; bio: string }[] = [];

// Unverified figures removed (STS-018). Add only documented, owner-verified stats.
export const ABOUT_STATS: { icon: string; value: string; label: string }[] = [];

// Navigation data
export const NAVIGATION_ITEMS = [
  { name: "Solutions", path: "/solutions" },
  { name: "Industries", path: "/industries" },
  { name: "Realisation", path: "/realisation" },
  { name: "Insights", path: "/insights" },
  { name: "About", path: "/about" },
];

// Footer data
export const FOOTER_LINKS = {
  solutions: [
    { name: "Cloud Platform", path: "/solutions/cloud-platform" },
    { name: "Data Analytics", path: "/solutions/data-analytics" },
    { name: "Enterprise Software", path: "/solutions/enterprise-software" },
    { name: "View All Solutions", path: "/solutions" },
  ],
  company: [
    { name: "About Us", path: "/about" },
    { name: "Careers", path: "/careers" },
    { name: "Newsroom", path: "/newsroom" },
    { name: "Contact", path: "/contact" },
  ],
  resources: [
    { name: "Blog & Insights", path: "/insights" },
    { name: "Realisation", path: "/realisation" },
    { name: "Documentation", path: "/documentation" },
    { name: "Support", path: "/support" },
  ],
};

// Social media links
export const SOCIAL_LINKS = [
  { name: "LinkedIn", url: "#", icon: "Linkedin" },
  { name: "Twitter", url: "#", icon: "Twitter" },
  { name: "Facebook", url: "#", icon: "Facebook" },
  { name: "YouTube", url: "#", icon: "Youtube" },
];

// Company information
export const COMPANY_INFO = {
  name: "SarayaTech",
  tagline:
    "Empowering enterprises with innovative technology solutions for digital transformation.",
  location: "Columbus, Ohio",
  founded: "2020",
};
