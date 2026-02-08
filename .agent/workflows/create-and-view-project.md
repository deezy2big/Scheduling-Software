---
description: Create a new project and automatically navigate to the Project Folder (Project Details)
---

## Auto-Redirect to Project Details

When you create a new project in the RMS Pro application, the app will automatically navigate you to the **Project Details** view (the "Project Folder") where you can immediately start adding workorders and managing the project.

### How It Works

1. **Open the Schedule View** in the application.
2. Click **+ New Project** (via the floating button or sidebar action).
3. In the **New Project** modal:
   - Enter the required **Project Title**.
   - Optionally fill in **Client Name**, **Department**, **Job Code**, **Priority**, and **Status**.
   - Select a **Color** for the project.
4. Click **Create Project**.
5. **The application will automatically redirect** you to the **Project Details** view for the newly created project.

### What You Can Do in the Project Folder

Once you're in the Project Details view, you can:
- Add new **Workorders** to the project
- View and edit existing workorders
- See the project's **financial summary** (Target Price, Actual Price, Difference, Job Total)
- Duplicate or delete workorders

### Technical Implementation

This feature is called **"Auto-Redirection to Project Details on Creation"** and is implemented via:
- `ProjectModal.jsx` passes the new project ID to the `onSave` callback
- `Scheduler.jsx` forwards the project ID to `App.jsx` via `onProjectCreated` callback
- `App.jsx` sets the active view to `'project-details'` with the new project ID

### Summary
- **Action Name:** Auto-Redirect to Project Folder
- **Trigger:** Creating a new project via the ProjectModal
- **Result:** Immediate navigation to the Project Details view
