# JMC TEST Documentation
Welcome to the official documentation for **JMC TEST**. This platform is a comprehensive placement assessment and recruitment management system designed for **Jamal Mohamed College (JMC)**.

---

## 1. Project Overview
The JMC TEST system is a full-stack web application that facilitates automated placement assessments. It allows the college staff to create and manage tests, track student performance, and provides students with a seamless interface to take tests and view their results. It also features an advanced AI Smart Assistant to help users navigate and solve questions.

---

## 2. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Vanilla), JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (handled via Sequelize ORM) |
| **AI Integration** | Gemini Pro/Flash & Anthropic Claude (via adaptive API router) |
| **Deployment** | Vercel (supporting Serverless functions) |
| **Communication** | REST API & Server-Sent Events (SSE) for real-time updates |

---

## 3. Core Features

### 🔐 Authentication & Profile Management
- **Role-Based Access**: Specialized interfaces for **Students** and **Staff**.
- **Secure Login/Registration**: Validates credentials and stores detailed student profiles (Department, Year, Register Number, etc.).
- **Profile Updates**: Users can update their names, emails, and profile pictures.

### 📝 Assessment Engine (Student Portal)
- **Assigned Assessments**: Students see tests specifically assigned to their department/year.
- **Fail-Safe Mechanism**: Prevents multiple attempts on the same test once submitted.
- **Real-time Attempt Tracking**: Tests are marked `in_progress` once started, allowing for resumption on connection loss but blocking re-entry after final submission.
- **Detailed Results**: Instant feedback with scores, percentage, and correctness analysis.

### 🛠️ Administration (Staff Dashboard)
- **Test Creation**: Advanced test builder with support for multiple-choice questions, difficulty levels, and time limits.
- **Targeted Publishing**: Ability to assign tests to specific departments, batches, sections, or years.
- **Live Analytics**: Visual charts (via Chart.js) showing average scores, total participants, and performance trends.
- **Student Lookup**: Searchable database of all registered students and their test history.
- **Participation Sync**: Real-time monitoring of which students are currently taking or have completed a test.

### 🤖 JMC Smart Assistant (AI Buddy)
- **Multimodal AI**: Leverages Google Gemini and Anthropic Claude models.
- **Adaptive Routing**: Automatically switches models if one is unavailable.
- **Smart Navigation**: Users can type "Show me my results" or "Create a new test," and the AI will redirect them to the correct section.
- **Educational Support**: Capable of solving aptitude questions, explaining concepts, and giving career advice.

### 📊 Reports & Exports
- **Performance Ranking**: Global and departmental leaderboards.
- **PDF Generation**: Downloadable performance reports and test summaries.

---

## 4. Project Structure

```text
/
├── backend/            # Express.js Server & Database Logic
│   ├── models/         # Sequelize Data Models
│   ├── server.js       # Main API Entry Point
│   ├── database.js     # DB Connection Config
│   └── init-db.js      # DB Schema Initialization
├── css/                # Global Styles & Component-specific CSS
├── js/                 # Frontend Logic
│   ├── auth.js         # Login/Registration Logic
│   ├── dashboard.js    # Student Dashboard UI Logic
│   ├── staff-dashboard.js # Staff Management Logic
│   ├── ai-buddy.js     # AI Assistant Integration
│   └── db.js           # Client-side API wrapper
├── index.html          # Public Landing Page
├── login.html          # Authentication Page
├── staff-dashboard.html # Admin Portal
├── student-dashboard.html # Candidate Portal
├── take-test.html      # Assessment Interface
├── package.json        # Node.js dependencies
└── README.md           # Quick-start guide
```

---

## 5. Data Models (Database Schema)

The system uses **Sequelize** to manage the following entities:

1.  **User**: Stores credentials and descriptive metadata (Name, Type, Department, Register Number).
2.  **Test**: Stores test parameters (Question set JSON, Time limit, Company, Pass criteria).
3.  **TestAssignment**: Junction table linking tests to students, tracking attempt status (`not_started`, `in_progress`, `submitted`).
4.  **Result**: Stores historical performance data (Score, Percentage, Correct/Incorrect count, Timestamp).
5.  **ActivityLog**: Audits system events (Logins, Test submissions, Test creation).
6.  **ChatHistory**: Persistently stores AI conversation sessions.

---

## 6. How to Run & Maintain

### Local Development
1.  Run `npm install` to get dependencies.
2.  Run `npm start` to start the Node.js server (Default: Port 3000).
3.  Open `index.html` in a web browser.

### Resetting Data
To clear the database and start fresh:
1.  Navigate to `backend/`.
2.  Delete `jmc_placement_portal.sqlite`.
3.  Restart the server; the schema will automatically rebuild from the models.

---
*Generated by Antigravity AI for JMC Placement Project*
