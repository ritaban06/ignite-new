
# Ignite - Samarth's Study Material Platform

[![PNPM](https://img.shields.io/badge/PNPM-10.12.1-orange?logo=pnpm)](https://pnpm.io/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)](https://reactjs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![Vite](https://img.shields.io/badge/Vite-7.0.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Full%20Stack-black?logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A secure PDF viewing platform built with the MERN stack, featuring role-based access control, Google OAuth integration, and Cloudflare R2 storage. 

---

## 🏗️ Monorepo Structure

This project uses **PNPM workspaces** for monorepo management. The main workspace folders are:

```
ignite-new/
├── admin/          # React admin dashboard for PDF management
├── backend/        # Express.js API server
├── client/         # Public React client for PDF viewing
├── docs/           # Project and API documentation
├── setup.js        # Setup script for environment files
├── generate-docs.js # Internal documentation generator
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PNPM**: v8.0.0 or higher (preferred package manager)
- **MongoDB**: Local installation or MongoDB Atlas account
- **Google Drive Account**: For PDF storage  

### 1. Clone and Setup Environment

```bash
git clone https://github.com/ritaban06/ignite-new
cd ignite-new
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 3. Start Development Servers

**Option A: Start All Services (Recommended)**

```bash
pnpm dev:all
```

**Option B: Start Services Individually**

```bash
# Terminal 1 - Backend API (Port 5000)
pnpm dev:backend

# Terminal 2 - Admin Dashboard (Port 3001)
pnpm dev:admin

# Terminal 3 - Client App (Port 3000)
pnpm dev:client
```

### 4. Access Applications

- **Client App**: http://localhost:3000 (Public PDF viewer)
- **Admin Dashboard**: http://localhost:3001 (PDF management)
- **Backend API**: http://localhost:5000 (REST API)

---

## 🔧 Features

### 🔒 Security Features
- JWT-based authentication with refresh tokens
- Google OAuth 2.0 integration
- Single device login restriction
- Role-based access control (Admin/Client)
- Signed URLs with short TTL (Time To Live)
- PDF viewing without download capability
- Comprehensive access logging and analytics
- Rate limiting and request validation
- Secure headers with Helmet.js

### 👨‍💼 Admin Features
- Secure admin login dashboard
- PDF upload with metadata (department/year/category)
- Bulk PDF management operations
- User management and role assignment
- Real-time analytics and access logs
- System configuration and settings

### 👥 Client Features
- Google OAuth and email-based authentication
- Department and year-based PDF filtering
- Advanced search functionality
- Secure PDF viewing (no download/share/print)
- Mobile-responsive design
- Clean, intuitive user interface
- Access history tracking

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: Context API
- **PDF Rendering**: PDF.js
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Google OAuth 2.0
- **File Upload**: Multer + Express-fileupload
- **Security**: Helmet.js, CORS, Rate Limiting
- **Validation**: Express-validator

### Infrastructure
- **Storage**: Cloudflare R2 (S3-compatible)
- **Package Manager**: PNPM Workspaces
- **Process Manager**: PM2 (production)
- **Deployment**: Vercel (frontend), Railway/Heroku (backend)

---

## 📝 Internal Documentation

- The project includes an internal documentation generator: `generate-docs.js`.
- Running this script will scan the `admin`, `backend`, and `client` folders and output a structured JSON to `admin/docs/docs.json`.
- The admin dashboard includes a Docs page that renders this documentation for contributors.

---

## 📋 Setup Requirements

### System Requirements
1. **Node.js**: v18.0.0 or higher
2. **PNPM**: v8.0.0 or higher
3. **MongoDB**: Local or Atlas

---

### External Services
1. **MongoDB**: 
   - Local installation OR
   - MongoDB Atlas (cloud) - Free tier available
   
2. **Cloudflare Account** (Free tier sufficient):
   - R2 Object Storage bucket
   - API tokens for R2 access
   
3. **Google Cloud Console** (Optional, for OAuth):
   - OAuth 2.0 client credentials
   - Enable Google+ API

### Development Tools (Recommended)
- **VS Code**: With ESLint and Prettier extensions
- **MongoDB Compass**: GUI for database management
- **Postman/Insomnia**: API testing
- **Git**: Version control

## 🚦 Development Workflow

### Workspace Structure
This project uses **PNPM workspaces** for efficient monorepo management. Each package has its own:
- `package.json` with specific dependencies
- Development and build scripts
- Independent deployment configuration

### Available Scripts
```bash
# Development
pnpm dev:all          # Start all services concurrently
pnpm dev:backend      # Start backend only
pnpm dev:admin        # Start admin dashboard only
pnpm dev:client       # Start client app only

# Building
pnpm build:all        # Build admin and client for production

# Maintenance
pnpm clean           # Clean all node_modules
pnpm lint            # Run ESLint on all packages
```

### Environment Variables
Create `.env` files in each package directory:

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ignite
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
CLOUDFLARE_R2_ACCESS_KEY=your-r2-access-key
CLOUDFLARE_R2_SECRET_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_REGION=auto
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

## 🚀 Production Deployment

### Frontend Deployment (Vercel)
```bash
# Build and deploy admin dashboard
cd admin
pnpm build
vercel --prod

# Build and deploy client app
cd client
pnpm build
vercel --prod
```

### Backend Deployment
The backend can be deployed to various platforms:

**Railway/Heroku:**
```bash
cd backend
# Ensure your Procfile exists: web: node server.js
git push heroku main
```

**Digital Ocean/AWS/GCP:**
```bash
# Use PM2 for production process management
npm install -g pm2
pm2 start server.js --name "ignite-backend"
pm2 startup
pm2 save
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Admin/user login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### PDF Management
- `GET /api/pdfs` - List PDFs (with filters)
- `POST /api/pdfs/upload` - Upload PDF (admin only)
- `GET /api/pdfs/:id` - Get PDF details
- `GET /api/pdfs/:id/view` - Get signed viewing URL
- `DELETE /api/pdfs/:id` - Delete PDF (admin only)

### User Management
- `GET /api/users` - List users (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Analytics
- `GET /api/admin/analytics` - Access analytics (admin only)
- `GET /api/admin/logs` - Access logs (admin only)

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Issues:**
```bash
# Check if MongoDB is running
mongosh --host localhost:27017

# For MongoDB Atlas, verify connection string in .env
```

**PNPM Installation Issues:**
```bash
# Clear PNPM cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**PDF Upload/Viewing Issues:**
- Verify Cloudflare R2 credentials in `.env`
- Check R2 bucket permissions
- Ensure signed URLs are not expired

**Google OAuth Issues:**
- Verify Google Client ID in both backend and frontend `.env`
- Check authorized origins in Google Cloud Console
- Ensure Google+ API is enabled

### Development Tips
- Use `pnpm dev:all` for concurrent development
- Check browser console for frontend errors
- Monitor backend logs for API issues
- Use MongoDB Compass to inspect database state

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation when needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [Issues](../../issues)
3. Create a new issue with detailed information

---

**Built with ❤️ for secure educational content delivery**
