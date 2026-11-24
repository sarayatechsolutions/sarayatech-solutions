# SarayaTech Solutions - Digital Agency Website

## Overview

Official website for SarayaTech Solutions, a digital solutions agency based in Columbus, Ohio. We provide custom web development, mobile applications, data analytics, cloud infrastructure, and digital consulting services to businesses across the USA.

## Project Structure

The project consists of a frontend React application and a backend Node.js server:

```
sarayatech-solutions/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   │   ├── home/          # Homepage components
│   │   ├── ui/            # shadcn/ui components
│   │   └── ...
│   ├── pages/             # Page components
│   │   ├── Contact.tsx    # Contact form with success modal
│   │   ├── About.tsx
│   │   ├── Solutions.tsx
│   │   └── ...
│   ├── assets/            # Images and media files
│   └── lib/               # Utility functions
├── server/                # Backend Node.js server
│   ├── index.js          # Express server with Nodemailer
│   └── README.md         # Server documentation
├── data/                  # Static JSON data
│   ├── solutions.json    # Services data
│   └── realisations.json # Project case studies
├── public/               # Static assets
└── DEPLOYMENT.md        # Complete deployment guide
```

## Technologies Used

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Form Management**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Email Service**: Nodemailer
- **CORS Handling**: cors middleware
- **Environment Config**: dotenv

### Features
- ✨ Responsive design with mobile-first approach
- 🎨 Modern UI with smooth animations
- 📧 Contact form with email notifications
- 🎯 Success modal for form submissions
- 🔒 CORS protection
- ⚡ Fast performance with Vite
- 📱 Progressive Web App ready

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Gmail account (for SMTP) or alternative email service

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd sarayatech-solutions
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Backend Email (Important!):**

   Create a `.env` file in the root directory:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your SMTP credentials:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password    # Gmail App Password (not regular password)
   CONTACT_EMAIL=info@sarayatech.com
   SMTP_FROM=noreply@sarayatech.com
   CLIENT_URL=http://localhost:8080
   ```

   📝 **Gmail Setup**: See [server/README.md](server/README.md) for detailed instructions.

4. **Start Development Servers:**

   **Terminal 1 - Frontend:**
   ```bash
   npm run dev
   ```
   Frontend runs on: http://localhost:8080

   **Terminal 2 - Backend:**
   ```bash
   npm run server
   ```
   Backend runs on: http://localhost:3001

5. **Open the application:**
   Navigate to [http://localhost:8080](http://localhost:8080)

### Build for Production

**Frontend:**
```bash
npm run build
npm run preview
```

**Backend:**
```bash
NODE_ENV=production node server/index.js
```

## Available Scripts

### Frontend
- `npm run dev` - Start Vite development server (port 8080)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `npm run server` - Start Express server (port 3001)
- `npm run server:dev` - Start with nodemon (auto-reload)

## Docker Support

The backend can be deployed using Docker for consistent environments.

### Quick Start with Docker

**Using Docker Compose (Recommended):**
```bash
docker-compose up -d
```

**Using Docker directly:**
```bash
docker build -t sarayatech-backend .
docker run -d -p 3001:3001 --env-file .env sarayatech-backend
```

### Benefits
- ✅ Consistent environment across all platforms
- ✅ Easy scalability
- ✅ Production-ready with security best practices
- ✅ Health checks included
- ✅ Minimal image size (~50MB)

📦 **Full Docker Guide**: See [DOCKER.md](DOCKER.md) for comprehensive Docker documentation.

## Deployment

📘 **See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide**

The application requires two separate deployments:

### Frontend Deployment
**Recommended: Vercel**
- Automatic deployments from GitHub
- Free SSL certificates
- Global CDN
- Environment variable support

**Alternative:** Netlify, Cloudflare Pages

### Required build variable: `VITE_API_URL`

The chatbot and contact form call `${VITE_API_URL}/api/chat` and `/api/contact` on the separate Express backend. The production build (`npm run build`, mode `production`) **fails** if `VITE_API_URL` is unset, empty, or not an absolute `https://` URL (`http://localhost` is allowed for local preview). Set it in Cloudflare Pages -> Settings -> Environment variables (Production), e.g. `https://<your-backend-host>`.
For a local or CI verification build use `npm run build:verify`, which supplies `http://localhost:3001` when the variable is unset (the check still runs). Logic: `tools/require-api-url.ts`.

### Backend Deployment
**Recommended: Railway**
- Easy setup with GitHub integration
- Automatic HTTPS
- Free tier available
- Environment variable management

**Alternative:** Render, Heroku, VPS

### Quick Deployment

1. **Deploy Backend** (Railway):
   - Connect GitHub repo → Select backend → Add environment variables → Deploy

2. **Deploy Frontend** (Vercel):
   - Connect GitHub repo → Add `VITE_API_URL` → Deploy

3. **Configure Domain** (optional):
   - Add custom domain in both platforms
   - Update DNS records
   - SSL auto-provisioned

📖 **Full guide with screenshots**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary to SarayaTech Solutions.

## Key Features

### Contact Form with Success Modal
The contact page includes a professional contact form with:
- ✅ Form validation
- ✅ Beautiful success/error modal (instead of toast notifications)
- ✅ Dual email system:
  - Company notification with all form details
  - Auto-reply confirmation to user
- ✅ Service selector (6 digital agency services)
- ✅ Professional HTML email templates

### Services Offered
1. **Web & Mobile Development** - Custom applications
2. **Data & Business Intelligence** - Analytics and dashboards
3. **Custom Business Software** - Tailored solutions
4. **Cloud & Infrastructure** - DevOps and migration
5. **Digital Strategy & Consulting** - Technical advisory
6. **Security & Compliance** - Cybersecurity solutions

## Documentation

- 📘 [Deployment Guide](DEPLOYMENT.md) - Complete production deployment guide
- 🐳 [Docker Guide](DOCKER.md) - Docker deployment and containerization
- 📧 [Server Documentation](server/README.md) - Backend setup and email configuration
- 🎨 [Component Library](src/components/ui/) - shadcn/ui components

## Contact

**SarayaTech Solutions**
- 📍 2765 S Hamilton Rd, Columbus, OH 43232, USA
- 📞 +1 (614) 783-0443
- 📧 info@sarayatech.com
- 🌐 [Contact Form](https://sarayatech.com/contact)
