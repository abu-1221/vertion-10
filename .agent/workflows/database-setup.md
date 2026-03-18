---
description: How to initialize, seed, and manage the JMC Placement Portal database
---

# Database Management Workflow

## Prerequisites
- Node.js installed
- All npm dependencies installed (`npm install` in `backend/` directory)

## 1. Initialize the Database (Fresh Setup)

This completely **wipes** the existing database and creates a fresh one with demo data.

```bash
cd backend
// turbo
node init-db.js
```

This will create:
- **2 Staff accounts** (STF001, STF002)
- **10 Student accounts** across 6 departments
- **4 Tests** (Google, TCS, Infosys, Wipro) with realistic questions
- **Proper test assignments** based on department/year targeting
- **3 Pre-completed results** for demo purposes
- **13 Activity log entries**

## 2. Start the Server

```bash
cd backend
// turbo
node server.js
```

Server runs on `http://localhost:3000`

## 3. Login Credentials

### Staff
| Username | Password     | Name               | Department         |
|----------|-------------|--------------------|--------------------|
| YMI      | JMC         | YMI Staff          | Jamal Mohamed College |
| STF001   | password123 | Dr. Iqbal Ahmed    | Computer Science   |
| STF002   | password123 | Prof. Meera Krishnan | Information Technology |

### Students (Password = DOB in DDMMYYYY format)
| Username      | DOB (Password) | Name              | Department          | Year |
|---------------|---------------|-------------------|---------------------|------|
| 23ucs006      | 11111111      | Student 23ucs006  | Computer Science    | 2    |
| student_demo_01 | 123456      | Demo Student      | Computer Science    | 4    |
| 2024CSE001    | 24052006      | Abu Bakar S       | Computer Science    | 4    |
| 2024CSE002    | 15031005      | Priya Dharshini R | Computer Science    | 4    |
| 2024CSE003    | 22072005      | Mohammed Farhan K | Computer Science    | 3    |
| 2024IT001     | 10112004      | Kavitha Lakshmi M | Information Technology | 4 |
| 2024IT002     | 05062005      | Rajesh Kumar S    | Information Technology | 3 |
| 2024MATH001   | 18091005      | Aishwarya V       | Mathematics         | 2    |
| 2024COM001    | 30012005      | Suresh Babu T     | Commerce            | 3    |
| 2024ENG001    | 12042005      | Fathima Zahra N   | English             | 2    |
| 2024PHY001    | 25082004      | Karthik Rajan P   | Physics             | 4    |

## 4. Database Schema Overview

### Users Table
- `username` (PK, unique) — Register number for students, staff code for staff
- `password` — DOB (DDMMYYYY) for students, custom for staff
- `type` — 'student' or 'staff'
- `name`, `email`, `profilePic`
- `details` (JSON) — Department, Year, Section, Gender, Batch, etc.
- `isActive` — Soft delete flag
- `lastLoginAt` — Tracks last successful login

### Tests Table
- `name`, `company`, `duration` (minutes), `description`
- `questions` (JSON) — Array of `{question, options[], answer}`
- `createdBy` — Staff username
- `status` — draft | active | published | archived
- `targetAudience` (JSON) — `{departments[], years[], sections[], genders[]}`
- `date` — Scheduled test date
- `totalMarks` — Auto-calculated from questions count
- `passingPercentage` — Default 50%

### TestAssignments Table
- `testId` + `studentUsername` (unique composite)
- `status` — not_started | in_progress | submitted
- `assignedAt`, `startedAt`, `submittedAt`

### Results Table
- `username` + `testId` (unique composite — enforces one attempt)
- `testName`, `company` — Snapshots at submission time
- `score` (%), `correctCount`, `totalQuestions`
- `status` — passed | failed
- `answers` (JSON), `questionTimes` (JSON), `questions` (JSON snapshot)
- `timeTaken` (seconds)

### ActivityLog Table
- `action` — register | login | publish_test | start_test | submit_test | delete_test | delete_student
- `username`, `userType`, `details` (JSON), `ipAddress`, `userAgent`
- `timestamp`

## 5. API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login

### Student
- `GET /api/tests/available?username=X` — Get available tests
- `GET /api/tests/:id` — Get test details
- `POST /api/tests/start-attempt` — Lock test attempt
- `POST /api/tests/submit` — Submit test results
- `GET /api/results/student/:username` — Get student results

### Staff
- `POST /api/staff/create-test` — Create & assign test
- `GET /api/staff/tests` — List all tests
- `DELETE /api/staff/tests/:id` — Delete test (cascades)
- `GET /api/staff/students` — List all students
- `DELETE /api/staff/students/:username` — Delete student (cascades)
- `GET /api/staff/test-participation/:testId` — Test analytics
- `GET /api/results/all` — All results

### System
- `GET /api/activity-logs` — Activity logs
- `GET /api/realtime/updates` — SSE stream
