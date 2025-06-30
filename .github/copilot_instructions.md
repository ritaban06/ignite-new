### I want to create a website called Ignite that will serve pdfs
### There will be three folders named admin, backend and client
### The project will be on MERN stack without typescrip. It will use Vite JS and PNPM and Mongodb and cloudflare R2 storage (free)
### When the admin uploads a study material (pdf) the admin has to select the department and year
### The client cannot download or share the pdf in any way
### The pdfs will be on cloudflare R2 storage
### Admin dashboard access should require login (JWT or session-based auth).
### Role-based access: only admin can upload, client can only view.
### Protect API routes with middleware.

### Folder Structure
ignite-new/
├── admin/       // React dashboard for uploading PDFs
├── backend/     // Express API, MongoDB interaction, R2 integration
├── client/      // Public-facing viewer-only React site
├── .env         // Environment variables for local dev
├── pnpm-workspace.yaml

### Use signed URLs with short TTL to securely serve PDFs.
### Never expose public R2 bucket access.
### Backend API should control R2 read/write.
### Prevent PDF Downloading Use PDF.js in the client to render PDFs inside an iframe/canvas.
### Disable right-click via JavaScript and CSS.
### Use Content-Disposition: inline to prevent downloading.
### Apply watermarks dynamically if needed.
### Admin Upload UI
    Title
    Department (dropdown)
    Year (dropdown)
    File picker (.pdf only)
### If the user is studing in 2nd year AIML department he/she can access only 2nd year AIML department pdfs
### Tag-based organization (like "DSA", "Java", etc.).