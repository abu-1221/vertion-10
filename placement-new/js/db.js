/**
 * PlaceMeDB (JMCTestDB) - API Client Layer
 * Handles communication with the Node.js Backend.
 */
class JMCTestDB {
    constructor() {
        // Determine the API URL based on the current environment
        // If we are opening the HTML files directly (file://), we must point to the local server
        if (window.location.protocol === 'file:') {
            this.API_URL = 'http://localhost:3000/api';
        } else {
            // Otherwise, we use a relative path which works for both localhost:3000 and production
            this.API_URL = '/api';
        }
    }

    /**
     * Register a new user
     */
    async addUser(user) {
        try {
            const response = await fetch(`${this.API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            return data;
        } catch (error) {
            console.error('[JMCTestDB] Register Error:', error);
            throw error;
        }
    }

    /**
     * Authenticate user
     */
    async authenticate(username, password, type) {
        try {
            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.success) {
                if (type && data.user.type !== type) {
                    console.warn(`User type mismatch: Expected ${type}, got ${data.user.type}`);
                }
                // Normalize: merge Student/Staff profile into user.details for frontend compatibility
                const user = data.user;
                user.details = user.Student || user.Staff || user.details || {};
                delete user.Student;
                delete user.Staff;
                return user;
            }
            return null;
        } catch (error) {
            console.error('[JMCTestDB] Login Error:', error);
            return null;
        }
    }

    /**
     * Get all active tests (for students)
     */
    async getTests(username) {
        try {
            const url = username ? `${this.API_URL}/tests/available?username=${encodeURIComponent(username)}` : `${this.API_URL}/tests/available`;
            const response = await fetch(url);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] GetTests Error:', error);
            return [];
        }
    }

    /**
     * Get single test details
     */
    async getTestById(id) {
        try {
            const response = await fetch(`${this.API_URL}/tests/${id}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] GetTestById Error:', error);
            return null;
        }
    }

    /**
     * Get ALL tests regardless of status (for staff)
     */
    async getAllTests() {
        try {
            const response = await fetch(`${this.API_URL}/staff/tests`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] GetAllTests Error:', error);
            return [];
        }
    }

    /**
     * Mark test as in_progress immediately (Strict Attempt Control)
     */
    async startAttempt(testId, username) {
        try {
            const response = await fetch(`${this.API_URL}/tests/start-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId, username })
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] StartAttempt Error:', error);
            throw error;
        }
    }

    /**
     * Submit Test Result
     */
    async submitTest(resultData) {
        try {
            const response = await fetch(`${this.API_URL}/tests/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultData)
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] SubmitTest Error:', error);
            throw error;
        }
    }

    /**
     * Get Student Results
     */
    async getStudentResults(username) {
        try {
            const response = await fetch(`${this.API_URL}/results/student/${username}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] GetResults Error:', error);
            return [];
        }
    }

    /**
     * Create a new test (Staff)
     */
    async createTest(testData) {
        try {
            const response = await fetch(`${this.API_URL}/staff/create-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] CreateTest Error:', error);
            throw error;
        }
    }

    /**
     * Get all results (Staff)
     */
    async getAllResults() {
        try {
            const response = await fetch(`${this.API_URL}/results/all`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] GetAllResults Error:', error);
            return [];
        }
    }

    /**
     * Get all registered students (Staff)
     */
    async getStudents() {
        try {
            const response = await fetch(`${this.API_URL}/staff/students`);
            if (!response.ok) return [];
            const students = await response.json();
            // Normalize: merge Student profile into .details for frontend compatibility
            return students.map(s => {
                s.details = s.Student || s.details || {};
                delete s.Student;
                return s;
            });
        } catch (error) {
            console.error('[JMCTestDB] GetStudents Error:', error);
            return [];
        }
    }

    /**
     * Get participation data for a test (Staff)
     */
    async getTestParticipation(testId) {
        try {
            const response = await fetch(`${this.API_URL}/staff/test-participation/${testId}`);
            if (!response.ok) throw new Error('API Sync Failed');
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] GetTestParticipation Error:', error);
            throw error;
        }
    }

    /**
     * Delete a test (Staff)
     */
    async deleteTest(testId) {
        try {
            const response = await fetch(`${this.API_URL}/staff/tests/${testId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] DeleteTest Error:', error);
            throw error;
        }
    }

    /**
     * Delete a student (Staff)
     */
    async deleteStudent(username) {
        try {
            const response = await fetch(`${this.API_URL}/staff/students/${username}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] DeleteStudent Error:', error);
            throw error;
        }
    }

    /**
     * Execute Code (Backend VM)
     */
    async executeCode(code, language = 'javascript', compileOnly = false, stdin = '') {
        try {
            const response = await fetch(`${this.API_URL}/code/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, compileOnly, stdin })
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] CodeExecution Error:', error);
            return { success: false, error: 'Connection to execution engine lost.' };
        }
    }

    /**
     * Update User Profile (Self)
     */
    async updateUser(username, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/users/${encodeURIComponent(username)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            return await response.json();
        } catch (error) {
            console.error('[JMCTestDB] UpdateProfile Error:', error);
            throw error;
        }
    }
}

// Export global instance
window.DB = new JMCTestDB();
