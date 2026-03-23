// Authentication JavaScript

// Helper to format date YYYY-MM-DD to DDMMYYYY
function formatDobToPassword(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}${parts[1]}${parts[0]}`;
}

// Login form handling
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        let password = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        const btn = document.getElementById('loginBtn');
        const alertBox = document.getElementById('authAlert');
        const btnText = btn.querySelector('span');
        const spinner = btn.querySelector('.spinner');

        // For students, convert the date input value to DDMMYYYY
        if (userType === 'student') {
            password = formatDobToPassword(password);
        }

        // Reset errors
        clearErrors();

        // Validate
        let valid = true;
        if (!username) { showError('username', 'Identification is required'); valid = false; }
        if (!password) { showError('password', 'Password is required'); valid = false; }

        if (!valid) return;

        // Show loading
        btn.disabled = true;

        if (alertBox) alertBox.style.display = 'none';

        try {
            // CALL BACKEND API
            const user = await window.DB.authenticate(username, password, userType);

            if (user) {
                // Normalize and clean user object
                const { password: _, ...safeUser } = user;
                if (!safeUser.name && safeUser.fullName) safeUser.name = safeUser.fullName;
                safeUser.type = userType; 

                // Store session
                if (rememberMe) {
                    localStorage.setItem('user', JSON.stringify(safeUser));
                } else {
                    sessionStorage.setItem('user', JSON.stringify(safeUser));
                }

                // Show success
                if (alertBox) {
                    alertBox.className = 'alert success';
                    alertBox.style.display = 'block';
                    alertBox.textContent = 'Successfully authenticated. Accessing system...';
                }

                // Redirect
                const target = safeUser.type === 'student' ? 'student-dashboard.html' : 'staff-dashboard.html';
                window.location.replace(target);
            } else {
                throw new Error('Invalid credentials. Please check your ID and password.');
            }
        } catch (error) {
            console.error(error);
            if (alertBox) {
                alertBox.className = 'alert error';
                alertBox.style.display = 'block';
                alertBox.textContent = error.message || 'Authentication failed. Please try again.';
            }
            btn.disabled = false;
            if (btnText) btnText.textContent = 'Sign In';
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// Registration form workflow and dynamic dependencies
function initRegisterWorkflow() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const departmentMapping = {
        "B.Sc": ["Mathematics", "Physics", "Chemistry", "Botany", "Zoology", "Bio Technology", "Microbiology", "Nutrition & Dietetics", "Computer Science", "Information Technology", "Visual Communication", "Hotel Management", "Fashion Technology", "Physical Education"],
        "BCA": ["Computer Science"],
        "M.Sc": ["Mathematics", "Physics", "Chemistry", "Botany", "Zoology", "Bio Technology", "Microbiology", "Nutrition & Dietetics", "Computer Science", "Information Technology", "Visual Communication", "Fashion Technology"],
        "MCA": ["Computer Science"],
        "B.A": ["Arabic", "English", "Tamil", "Urdu", "Hindi", "French", "Economics", "History", "Social Work"],
        "M.A": ["Arabic", "English", "Tamil", "Urdu", "Hindi", "French", "Economics", "History"],
        "B.Com": ["Commerce"],
        "M.Com": ["Commerce"],
        "BBA": ["Business Administration"],
        "MSW": ["Social Work"]
    };

    // Helper to enable a field with animation and focus
    const enableField = (id) => {
        const field = document.getElementById(id);
        if (field && field.disabled) {
            field.disabled = false;
        }
    };

    // 1. Full Name -> Email
    document.getElementById('fullName').addEventListener('input', (e) => {
        if (e.target.value.trim().length > 2) enableField('email');
    });

    // 2. Email -> Phone
    document.getElementById('email').addEventListener('input', (e) => {
        if (e.target.value.includes('@') && e.target.value.includes('.')) enableField('mobile');
    });

    // 2.1 Phone -> Send OTP
    document.getElementById('mobile').addEventListener('input', (e) => {
        const btn = document.getElementById('sendOtpBtn');
        if (e.target.value.length >= 10) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    });

    // 2.2 Send OTP Behavior
    document.getElementById('sendOtpBtn').addEventListener('click', () => {
        const btn = document.getElementById('sendOtpBtn');
        const otpInput = document.getElementById('otp');
        const verifyBtn = document.getElementById('verifyOtpBtn');
        
        btn.textContent = 'Resend';
        otpInput.disabled = false;
        verifyBtn.disabled = false;
        otpInput.focus();
        
        // Mock alert
        alert('A mock OTP "123456" has been sent to your phone number.');
    });

    // 2.3 Verify OTP -> Register Number
    document.getElementById('verifyOtpBtn').addEventListener('click', () => {
        const otpVal = document.getElementById('otp').value;
        if (otpVal === '123456') {
            alert('Phone verified successfully!');
            document.getElementById('mobile').disabled = true;
            document.getElementById('otp').disabled = true;
            document.getElementById('verifyOtpBtn').disabled = true;
            document.getElementById('sendOtpBtn').disabled = true;
            enableField('registerNumber');
        } else {
            alert('Invalid OTP. Please try "123456".');
        }
    });

    // 3. Register Number -> Stream + Auto-Batch
    document.getElementById('registerNumber').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length >= 2) {
            enableField('stream');
            
            const digits = val.match(/^\d{2}/);
            if (digits) {
                const startYear = 2000 + parseInt(digits[0]);
                const endYear = startYear + 3;
                const batchField = document.getElementById('batch');
                batchField.value = `${startYear}-${endYear}`;
            }
        }
    });

    // 4. Stream -> Department
    document.getElementById('stream').addEventListener('change', (e) => {
        const stream = e.target.value;
        const deptSelect = document.getElementById('department');
        deptSelect.innerHTML = '<option value="">Select</option>';
        
        if (departmentMapping[stream]) {
            departmentMapping[stream].forEach(dept => {
                const opt = document.createElement('option');
                opt.value = dept;
                opt.textContent = dept;
                deptSelect.appendChild(opt);
            });
            enableField('department');
        }
    });

    // 5. Department -> Year
    document.getElementById('department').addEventListener('change', (e) => {
        if (e.target.value) enableField('year');
    });

    // 6. Year -> Semester
    document.getElementById('year').addEventListener('change', (e) => {
        const year = parseInt(e.target.value);
        const semSelect = document.getElementById('semester');
        semSelect.innerHTML = '<option value="">Select</option>';
        
        if (year) {
            const semStart = (year - 1) * 2 + 1;
            const options = [semStart, semStart + 1];
            options.forEach(sem => {
                const opt = document.createElement('option');
                opt.value = sem;
                opt.textContent = `Sem ${sem}`;
                semSelect.appendChild(opt);
            });
            enableField('semester');
        }
    });

    // 7. Semester -> Gender
    document.getElementById('semester').addEventListener('change', (e) => {
        if (e.target.value) enableField('gender');
    });

    // 8. Gender -> Stream Type
    document.getElementById('gender').addEventListener('change', (e) => {
        if (e.target.value) enableField('streamType');
    });

    // 9. Stream Type -> Section
    document.getElementById('streamType').addEventListener('change', (e) => {
        const type = e.target.value;
        const sectionSelect = document.getElementById('section');
        sectionSelect.innerHTML = '<option value="">Select</option>';
        
        if (type) {
            let options = [];
            if (type === 'Aided') {
                options = ['A'];
            } else {
                options = ['B', 'C', 'D', 'E', 'F', 'G'];
            }
            
            options.forEach(sec => {
                const opt = document.createElement('option');
                opt.value = sec;
                opt.textContent = `Section ${sec}`;
                sectionSelect.appendChild(opt);
            });
            enableField('section');
        }
    });

    // 10. Section -> DOB
    document.getElementById('section').addEventListener('change', (e) => {
        if (e.target.value) {
            enableField('batch');
            enableField('dob');
        }
    });
}

// Register form handling
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Initialize workflow logic
    initRegisterWorkflow();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const userType = document.getElementById('userType').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const btn = document.getElementById('registerBtn');
        const alertBox = document.getElementById('authAlert');
        const btnText = btn.querySelector('span');
        const spinner = btn.querySelector('.spinner');

        // Reset errors
        clearErrors();

        let valid = true;
        if (!fullName) { showError('fullName', 'Full name is required'); valid = false; }
        if (!email) { showError('email', 'Email is required'); valid = false; }
        if (!agreeTerms) {
            if (alertBox) {
                alertBox.className = 'alert error';
                alertBox.style.display = 'block';
                alertBox.textContent = 'You must agree to the terms to proceed.';
            }
            valid = false;
        }

        if (!valid) return;

        let username = '';
        let password = '';
        let details = {};

        if (userType === 'student') {
            const data = {
                registerNumber: document.getElementById('registerNumber').value.trim(),
                stream: document.getElementById('stream').value,
                department: document.getElementById('department').value,
                year: document.getElementById('year').value,
                semester: document.getElementById('semester').value,
                streamType: document.getElementById('streamType').value,
                section: document.getElementById('section').value,
                gender: document.getElementById('gender').value,
                batch: document.getElementById('batch').value,
                dob: document.getElementById('dob').value
            };

            for (const key in data) {
                if (!data[key]) {
                    showError(key, `${key.charAt(0).toUpperCase() + key.slice(1)} is required`);
                    valid = false;
                }
            }

            if (!valid) return;

            username = data.registerNumber;
            password = formatDobToPassword(data.dob);
            details = data;
        } else {
            const staffCode = document.getElementById('staffCode').value.trim();
            const pwd = document.getElementById('staffPassword').value;

            if (!staffCode) { showError('staffCode', 'Staff Code is required'); valid = false; }
            if (!pwd) { showError('staffPassword', 'Password is required'); valid = false; }

            if (!valid) return;

            username = staffCode;
            password = pwd;
            details = {
                staffCode,
                department: document.getElementById('staffDepartment').value,
                designation: document.getElementById('designation').value
            };
        }

        // Show loading
        btn.disabled = true;

        try {
            const result = await window.DB.addUser({
                username, password, email, name: fullName, type: userType, details
            });

            if (result.success) {
                if (alertBox) {
                    alertBox.className = 'alert success';
                    alertBox.style.display = 'block';
                    alertBox.textContent = 'Account created successfully! Preparing your access...';
                }
                window.location.href = `login.html?type=${userType}`;
            } else {
                throw new Error(result.error || 'Registration failed. Please check your details.');
            }
        } catch (error) {
            console.error(error);
            if (alertBox) {
                alertBox.className = 'alert error';
                alertBox.style.display = 'block';
                alertBox.textContent = error.message;
            }
            btn.disabled = false;
            if (btnText) btnText.textContent = 'Create Account';
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// Tab switching
function initAuthTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const userTypeInput = document.getElementById('userType');

    // Login page specific elements
    const usernameLabel = document.querySelector('label[for="username"]');
    const usernameInput = document.getElementById('username');
    const passwordLabel = document.querySelector('label[for="password"]');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');

    // Registration page specific sections
    const studentFields = document.getElementById('studentFields');
    const staffFields = document.getElementById('staffFields');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const typeValue = tab.dataset.type;
            if (userTypeInput) userTypeInput.value = typeValue;

            // Login Page Logic
            if (usernameInput) {
                if (typeValue === 'student') {
                    if (usernameLabel) usernameLabel.textContent = 'Register Number';
                    usernameInput.placeholder = 'e.g., 23UCS001';
                    if (passwordLabel) passwordLabel.textContent = 'Date of Birth';
                    if (passwordInput) {
                        passwordInput.type = 'date';
                        passwordInput.style.paddingRight = '1rem';
                        if (togglePasswordBtn) togglePasswordBtn.style.display = 'none';
                    }
                } else {
                    if (usernameLabel) usernameLabel.textContent = 'Staff Code';
                    usernameInput.placeholder = 'e.g., STF001';
                    if (passwordLabel) passwordLabel.textContent = 'Password';
                    if (passwordInput) {
                        passwordInput.type = 'password';
                        passwordInput.placeholder = 'Enter password';
                        passwordInput.style.paddingRight = '3rem';
                        if (togglePasswordBtn) togglePasswordBtn.style.display = 'flex';
                    }
                }
            }

            // Register Page Logic
            if (studentFields && staffFields) {
                const container = document.querySelector('.auth-container');
                if (typeValue === 'student') {
                    studentFields.style.display = 'block';
                    staffFields.style.display = 'none';
                    if (container) container.classList.add('student-mode');
                    document.body.classList.add('student-mode');
                    studentFields.querySelectorAll('input, select').forEach(i => {
                        if (i.id !== 'batch') i.setAttribute('required', '');
                    });
                    staffFields.querySelectorAll('input, select').forEach(i => i.removeAttribute('required'));
                } else {
                    studentFields.style.display = 'none';
                    staffFields.style.display = 'block';
                    if (container) container.classList.remove('student-mode');
                    document.body.classList.remove('student-mode');
                    studentFields.querySelectorAll('input, select').forEach(i => i.removeAttribute('required'));
                    staffFields.querySelectorAll('input, select').forEach(i => i.setAttribute('required', ''));
                }
            }
        });
    });

    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) activeTab.click();
}

function initPasswordToggle() {
    document.querySelectorAll('.toggle-password, #toggleStaffPassword').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const wrapper = btn.closest('.input-wrapper');
            const input = wrapper.querySelector('input');
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');

            if (input.type === 'password') {
                input.type = 'text';
                if (eyeOpen) eyeOpen.style.display = 'none';
                if (eyeClosed) eyeClosed.style.display = 'block';
            } else {
                input.type = 'password';
                if (eyeOpen) eyeOpen.style.display = 'block';
                if (eyeClosed) eyeClosed.style.display = 'none';
            }
        };
    });
}

// Helper functions for errors
function showError(field, message) {
    const inputEl = document.getElementById(field);
    if (inputEl) {
        inputEl.classList.add('error');
        inputEl.placeholder = message;
        // Optional: you could add a tooltip or temporary text here
    }
}

function clearErrors() {
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    const alert = document.getElementById('authAlert');
    if (alert) { alert.className = 'alert'; alert.textContent = ''; alert.style.display = 'none'; }
}

// Global Exports
window.initLoginForm = initLoginForm;
window.initRegisterForm = initRegisterForm;
window.initAuthTabs = initAuthTabs;
window.initPasswordToggle = initPasswordToggle;

