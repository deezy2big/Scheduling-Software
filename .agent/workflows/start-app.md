---
description: How to start the Scheduling Software application (Frontend and Backend)
---

To start the application, you need to run the backend server and the frontend client in two separate terminal windows.

### 1. Start the Backend Server
1. Open a terminal.
2. Navigate to the server directory:
   ```bash
   cd "server"
   ```
3. Start the server:
   ```bash
   node index.js
   ```
   *The server will run on [http://localhost:3001](http://localhost:3001).*

### 2. Start the Frontend Client
1. Open a second terminal window.
2. Navigate to the client directory:
   ```bash
   cd "client"
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at [http://localhost:5173](http://localhost:5173).*

### Summary
- **Backend:** `cd server && node index.js`
- **Frontend:** `cd client && npm run dev`
- **Login:** Use `admin@rms.local` / `admin123` for demo access.
