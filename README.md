# Ignite - PDF Study Material Platform

A secure PDF viewing platform built with the MERN stack, featuring role-based access control and Cloudflare R2 storage integration.

## 🏗️ Project Structure

```
ignite-new/
├── admin/          # React admin dashboard for PDF uploads
├── backend/        # Express.js API server
├── client/         # Public React client for PDF viewing
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   cd ignite-new
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   pnpm dev

   # Terminal 2 - Admin Dashboard  
   cd admin
   pnpm dev

   # Terminal 3 - Client App
   cd client
   pnpm dev
   ```

## 🔧 Features

### Security Features
- ✅ JWT-based authentication
- ✅ Single device login restriction
- ✅ Role-based access control (Admin/Client)
- ✅ Signed URLs with short TTL
- ✅ PDF viewing without download capability
- ✅ Access logging and analytics

### Admin Features
- ✅ Secure login dashboard
- ✅ PDF upload with department/year tagging
- ✅ User management
- ✅ Analytics and access logs

### Client Features
- ✅ Email-based registration/login
- ✅ Department and year-based PDF filtering
- ✅ Secure PDF viewing (no download/share)
- ✅ Clean, intuitive interface

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Storage**: Cloudflare R2 (via Worker)
- **Package Manager**: PNPM
- **Authentication**: JWT
- **PDF Rendering**: PDF.js

## 📋 Setup Requirements

1. **MongoDB**: Local or MongoDB Atlas
2. **Cloudflare Account**: Free tier with R2 storage
3. **Cloudflare Worker**: For R2 access
4. **Node.js**: v18+ recommended

## 🔐 Environment Setup

Copy `.env.example` to `.env` and configure:

- MongoDB connection string
- Cloudflare R2 credentials
- JWT secrets
- Worker URL

## 🚦 Development Workflow

Each package (admin, backend, client) has its own:
- `package.json` with specific dependencies
- Development scripts
- Build configurations

Use PNPM workspace commands to manage all packages efficiently.

---

**Note**: This project implements secure PDF viewing without allowing downloads or sharing, perfect for educational content protection.