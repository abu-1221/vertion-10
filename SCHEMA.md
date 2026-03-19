# JMCTest - Database Schema (Optimized)

The following schema defines the relationships and storage structure for the JMCTest Full-Stack application. It is designed for maximum efficiency, scalability, and compatibility across both Web and Mobile platforms.

## 1. Authentication & Users (`Users` Table)

Central table for all system participants.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier for the user. |
| `username` | String (Unique) | Primary login identifier (Register Number for students). |
| `password` | String (Hashed) | Secure password hash. |
| `email` | String | Verified contact email. |
| `type` | Enum | `student` or `staff`. |
| `status` | String | `Online`, `Offline`, or `In-Test`. |
| `lastLoginAt`| DateTime | Timestamp of the most recent access. |

---

## 2. Shared Profiles

### 🔹 Student Profiles (`Students` Table)
Linked to `Users` via `userId`.

| Column | Type | Description |
| :--- | :--- | :--- |
| `userId` | UUID (FK) | Reference to `Users.id`. |
| `registerNumber`| String | Official institution identifier. |
| `department` | String | Academic department (e.g., CS, IT). |
| `year` | Integer | Current academic year (1-4). |
| `batch` | String | Intake year range (e.g., 2021-2025). |
| `cgpa` | Decimal | Current academic standing. |

### 🔹 Staff Profiles (`Staff` Table)
Linked to `Users` via `userId`.

| Column | Type | Description |
| :--- | :--- | :--- |
| `userId` | UUID (FK) | Reference to `Users.id`. |
| `staffCode` | String | Official department code. |
| `department` | String | Assigned department. |
| `designation` | String | Role (e.g., HOD, Coordinator). |

---

## 3. Assessments & Results

### 🔹 Assessments (`Tests` Table)
Created by Staff.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Primary key. |
| `name` | String | Assessment title. |
| `company` | String | Sponsoring company (if applicable). |
| `questions` | JSONB | Array of MCQ and Coding question blocks. |
| `status` | Enum | `draft`, `active`, `published`, `archived`. |
| `duration` | Integer | Time limit in minutes. |

### 🔹 Test Assignments (`TestAssignments` Table)
Strict mapping of students to specific assessments.

| Column | Type | Description |
| :--- | :--- | :--- |
| `testId` | UUID (FK) | Reference to `Tests.id`. |
| `studentUsername` | String (FK) | Reference to `Users.username`. |
| `status` | Enum | `not_started`, `in_progress`, `submitted`. |

### 🔹 Results (`Results` Table)
Finalized attempt data once submitted.

| Column | Type | Description |
| :--- | :--- | :--- |
| `testId` | UUID (FK) | Reference to `Tests.id`. |
| `username` | String (FK) | Reference to `Users.username`. |
| `score` | Integer | Percentage achieved. |
| `answers` | JSONB | Detailed log of student responses. |
| `status` | String | `passed` or `failed`. |

---

## 🏗️ Optimized Indexing Strategy

To ensure **efficient queries** (Instruction 5), the following indexes are implemented:
*   **Unique Index** on `Users(username)` for instant logins.
*   **Composite Index** on `Results(testId, username)` for fast performance lookups.
*   **FK Index** on `TestAssignments(studentUsername, status)` to filter available tests instantly.
