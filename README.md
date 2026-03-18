# JMC-TEST - Full Stack Build

This folder contains the complete, fully functional source code for JMC-Test, now running on a Node.js backend with SQL Database.

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via Sequelize ORM)

## Getting Started

### Prerequisites
- Node.js installed

### Installation
1. **Install Dependencies**
   Open a terminal in the project root and run:
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```
   This will start the backend server on `http://localhost:3000`.

3. **Open the App**
   Open `index.html` in your browser. The backend will serve the API, and `index.html` will consume it.

## Project Structure
- `backend/`: Node.js server and SQLite database models.
- `css/`: Stylesheets.
- `js/`: Frontend logic (dashboard, charts, database client).
- `*.html`: Application pages.

## Logic Flow
1. **Registration**: Users register; data is saved to SQL Database via API.
2. **Login**: Checks credentials via API. Redirects automatically if session is valid.
3. **Student**:
   - Takes tests without leaving the page.
   - Views detailed results with "View Details" button.
4. **Staff**:
   - Creates new tests via API.
   - Manages student users.

## Maintenance
- Data is stored in `backend/jmc_placement_portal.sqlite`.
- To reset, delete this file and restart the server (it will recreate empty tables).

_Project Completed Successfully._

## Demo Credentials

For testing purposes, the system has been initialized with the following accounts:

### Staff Portal
- **Username:** `YMI`
- **Password:** `JMC` (Permanent)
- **Username:** `STF001`
- **Password:** `password123`

### Student Portal
- **Username:** `23ucs006`
- **Password:** `11111111` (Permanent)
- **Username:** `2024CSE001`
- **Password:** `24052006` (Date of Birth)

---
*Created for Jamal Mohamed College - Placement Assessment Project*
