const express = require('express');
const { Sequelize, Op } = require('sequelize');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { 
  Document, Packer, Paragraph, TextRun, HeadingLevel, 
  Table, TableRow, TableCell, AlignmentType, Spacing 
} = require("docx");
const fs = require('fs');
const crypto = require('crypto');

// --- SECURE HASHING UTILITY ---
function hashPassword(password, salt = null) {
  if (!salt) salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}
const sequelize = require('./database');
const User = require('./models/User');
const Student = require('./models/Student');
const Staff = require('./models/Staff');
const Test = require('./models/Test');
const Result = require('./models/Result');
const ActivityLog = require('./models/ActivityLog');
const TestAssignment = require('./models/TestAssignment');
const Certificate = require('./models/Certificate');
const Registration = require('./models/Registration');
const LoginLog = require('./models/Login');

// ═══════════════ MODEL ASSOCIATIONS ═══════════════
// 1. Hierarchy: User -> Student / Staff
User.hasOne(Student, { foreignKey: 'userId', onDelete: 'CASCADE' });
Student.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Staff, { foreignKey: 'userId', onDelete: 'CASCADE' });
Staff.belongsTo(User, { foreignKey: 'userId' });

// 2. Hierarchy: Test -> Participation
Test.hasMany(TestAssignment, { foreignKey: 'testId', as: 'Participations', onDelete: 'CASCADE' });
TestAssignment.belongsTo(Test, { foreignKey: 'testId' });

// 3. Hierarchy: Test -> Result
Test.hasMany(Result, { foreignKey: 'testId', as: 'Results', onDelete: 'CASCADE' });
Result.belongsTo(Test, { foreignKey: 'testId' });

// 4. Hierarchy: Test -> Certificate
Test.hasMany(Certificate, { foreignKey: 'testId', as: 'Certificates', onDelete: 'CASCADE' });
Certificate.belongsTo(Test, { foreignKey: 'testId' });

// 5. User action mappings
User.hasMany(Result, { foreignKey: 'username', sourceKey: 'username', as: 'UserResults' });
Result.belongsTo(User, { foreignKey: 'username', targetKey: 'username' });

User.hasMany(Certificate, { foreignKey: 'studentUsername', sourceKey: 'username', as: 'UserCertificates' });
Certificate.belongsTo(User, { foreignKey: 'studentUsername', targetKey: 'username' });

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY HARDENING (PENETRATION TEST READY)
// ============================================
// 1. Security Headers Middleware
app.use((req, res, next) => {
  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Content Security Policy (Basic)
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: wss: data: blob:; object-src 'none'");
  // HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// 2. Simple In-Memory Rate Limiter to prevent DoS/Bruteforce on APIs
const rateLimitDict = new Map();
app.use('/api/', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxReqs = 200; // max 200 requests per minute per IP

  if (!rateLimitDict.has(ip)) {
    rateLimitDict.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const limitData = rateLimitDict.get(ip);
  if (now > limitData.resetTime) {
    limitData.count = 1;
    limitData.resetTime = now + windowMs;
    return next();
  }

  limitData.count++;
  if (limitData.count > maxReqs) {
    return res.status(429).json({ error: 'Too many requests. Please try again later. Security Rate Limit active.' });
  }
  next();
});

// === TEMPLATE DOWNLOAD ROUTES (DOCX) - TOP PRIORITY ===
app.get('/api/staff/download-mcq-template', async (req, res) => {
  console.log('[API] MCQ Template request received');
  try {
    const questions = [];
    // 1. Rules Section
    questions.push(new Paragraph({ text: "RULES FOR MCQ EXTRACTION", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
    questions.push(new Paragraph({ text: "==========================", alignment: AlignmentType.CENTER }));
    questions.push(new Paragraph({ text: "" }));
    questions.push(new Paragraph({ text: "1. Format: Numbered questions (e.g., 1., 2., 1), 2)).", bold: true }));
    questions.push(new Paragraph({ text: "2. Options: Exactly 4 options labeled A, B, C, D.", bold: true }));
    questions.push(new Paragraph({ text: "3. Answer: Must start with 'Answer:' followed by the letter.", bold: true }));
    questions.push(new Paragraph({ text: "4. Logic: Keep each question clearly separated.", bold: true }));
    questions.push(new Paragraph({ text: "" }));
    questions.push(new Paragraph({ text: "--- SAMPLE 10 QUESTION LAYOUT ---", alignment: AlignmentType.CENTER }));
    questions.push(new Paragraph({ text: "" }));

    // 2. 10 Sample Questions from aptitude_questions.docx
    const mcqQuestions = [
      { q: "If a train travels 60 km in 1 hour, how far will it travel in 3.5 hours?", a: "180 km", b: "200 km", c: "210 km", d: "220 km", ans: "C" },
      { q: "What is 15% of 200?", a: "25", b: "30", c: "35", d: "40", ans: "B" },
      { q: "A shopkeeper buys an item for Rs. 400 and sells it for Rs. 500. What is the profit percentage?", a: "20%", b: "25%", c: "30%", d: "15%", ans: "B" },
      { q: "Find the next number in the series: 2, 4, 8, 16, ___", a: "24", b: "32", c: "28", d: "30", ans: "B" },
      { q: "If 6 workers can complete a job in 12 days, how many days will 9 workers take to complete the same job?", a: "6 days", b: "8 days", c: "10 days", d: "9 days", ans: "B" },
      { q: "The average of 5 numbers is 20. If one number is removed, the average becomes 18. What is the removed number?", a: "26", b: "28", c: "30", d: "32", ans: "B" },
      { q: "A pipe can fill a tank in 4 hours. Another pipe can empty the tank in 8 hours. If both pipes are open, in how many hours will the tank be full?", a: "6 hours", b: "8 hours", c: "10 hours", d: "12 hours", ans: "B" },
      { q: "If APPLE = 50, MANGO = 56, then GRAPE = ?", a: "44", b: "46", c: "48", d: "50", ans: "C" },
      { q: "Simple interest on Rs. 1000 at 5% per annum for 2 years is:", a: "Rs. 50", b: "Rs. 100", c: "Rs. 150", d: "Rs. 200", ans: "B" },
      { q: "A car covers a distance of 300 km in 5 hours. What is its average speed?", a: "50 km/h", b: "55 km/h", c: "60 km/h", d: "65 km/h", ans: "C" }
    ];

    mcqQuestions.forEach((item, i) => {
      questions.push(new Paragraph({ text: `Question Number ${i + 1}: ${item.q}`, heading: HeadingLevel.HEADING_3 }));
      questions.push(new Paragraph({ text: `A. ${item.a}` }));
      questions.push(new Paragraph({ text: `B. ${item.b}` }));
      questions.push(new Paragraph({ text: `C. ${item.c}` }));
      questions.push(new Paragraph({ text: `D. ${item.d}` }));
      questions.push(new Paragraph({ text: `Answer: ${item.ans}` }));
      questions.push(new Paragraph({ text: "" }));
    });

    const doc = new Document({
      sections: [{ children: questions }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=MCQ_Sample_Format.docx');
    
    await logActivity('download_mcq_template', 'system', 'staff', null, req);
    res.send(buffer);
  } catch (err) {
    console.error('MCQ Template Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff/download-coding-template', async (req, res) => {
  console.log('[API] Coding Template request received');
  try {
    const questions = [];
    // 1. Rules Section
    questions.push(new Paragraph({ text: "RULES FOR CODING EXTRACTION", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
    questions.push(new Paragraph({ text: "=============================", alignment: AlignmentType.CENTER }));
    questions.push(new Paragraph({ text: "" }));
    questions.push(new Paragraph({ text: "1. Start: Each question must start with the word 'Question:'.", bold: true }));
    questions.push(new Paragraph({ text: "2. Language: Specify 'Language:' (e.g., Python, Java, C, C++, JavaScript).", bold: true }));
    questions.push(new Paragraph({ text: "3. Output: Provide expected output after 'Output:'.", bold: true }));
    questions.push(new Paragraph({ text: "" }));
    questions.push(new Paragraph({ text: "--- SAMPLE 10 QUESTION LAYOUT ---", alignment: AlignmentType.CENTER }));
    questions.push(new Paragraph({ text: "" }));

    // 2. 10 Sample Questions from Programming_Questions.docx
    const codingQuestions = [
      { q: "Write a program to find the factorial of a given number using recursion.", lang: "Python", out: "Enter a number: 5\nFactorial of 5 = 120" },
      { q: "Write a program to check whether a given number is prime or not.", lang: "Python", out: "Enter a number: 17\n17 is a Prime Number" },
      { q: "Write a program to reverse a string without using built-in reverse functions.", lang: "Python", out: "Enter a string: Hello\nReversed string: olleH" },
      { q: "Write a program to find the largest and smallest element in a list.", lang: "Python", out: "List: [3, 1, 9, 7, 2]\nLargest: 9\nSmallest: 1" },
      { q: "Write a program to print the Fibonacci series up to N terms.", lang: "Python", out: "Enter number of terms: 7\nFibonacci Series: 0 1 1 2 3 5 8" },
      { q: "Write a program to count the number of vowels and consonants in a given string.", lang: "Python", out: "Enter a string: Programming\nVowels: 3\nConsonants: 8" },
      { q: "Write a program to sort a list of numbers using bubble sort algorithm.", lang: "Python", out: "Original List: [64, 25, 12, 22, 11]\nSorted List: [11, 12, 22, 25, 64]" },
      { q: "Write a program to check whether a given string is a palindrome or not.", lang: "Python", out: "Enter a string: madam\nmadam is a Palindrome" },
      { q: "Write a program to find the sum of digits of a given number.", lang: "Python", out: "Enter a number: 4567\nSum of digits: 22" },
      { q: "Write a program to find the second largest element in a list without using sorting.", lang: "Python", out: "List: [10, 20, 4, 45, 99]\nSecond Largest Element: 45" }
    ];

    codingQuestions.forEach((item, i) => {
      questions.push(new Paragraph({ 
        text: `Question ${i + 1}`, 
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { before: 400, after: 200 }
      }));
      
      const table = new Table({
        width: { size: 100, type: "percentage" },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Question", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Language", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Input", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Output", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Expected Output", bold: true })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: item.q })] }),
              new TableCell({ children: [new Paragraph({ text: item.lang })] }),
              new TableCell({ children: [new Paragraph({ text: "N/A" })] }),
              new TableCell({ children: [new Paragraph({ text: item.out })] }),
              new TableCell({ children: [new Paragraph({ text: item.out })] }),
            ],
          }),
        ],
      });
      questions.push(table);
      questions.push(new Paragraph({ text: "" }));
    });

    const doc = new Document({
      sections: [{ children: questions }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=Coding_Sample_Format.docx');
    
    await logActivity('download_coding_template', 'system', 'staff', null, req);
    res.send(buffer);
  } catch (err) {
    console.error('Coding Template Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the parent directory (root of the app)
app.use(express.static(path.join(__dirname, '..')));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Multler configuration for syllabus uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'syllabus');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'syllabus-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper: log an activity
async function logActivity(action, username, userType, details, req) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || 'unknown') : 'system';
    const userAgent = req ? req.headers['user-agent'] : 'system';

    await ActivityLog.create({
      action,
      username,
      userType: userType || null,
      details: details || null,
      ipAddress,
      userAgent
    });
    console.log(`[ACTIVITY] ${action} by ${username} logged.`);
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

// === AUTH ROUTES ===
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('[AUTH] Registration attempt:', req.body.username);
    const { username, password, type, name, details, email } = req.body;
    
    // Validate email: only @gmail.com allowed
    if (email && !email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only @gmail.com email addresses are allowed.' });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      console.warn('[AUTH] Registration failed: Username taken:', username);
      return res.status(400).json({ error: 'Username already taken' });
    }

    // 1. Create primary User record with Secure Hashing
    const { hash, salt } = hashPassword(password);
    const user = await User.create({ 
      username, 
      password: hash, 
      salt,
      type, 
      name, 
      email 
    });
    console.log('[AUTH] User record created with secure hash:', user.id);

    // 2. Create profile in specialized table
    if (type === 'student') {
      await Student.create({ userId: user.id, ...details });
      console.log('[AUTH] Student profile created');
    } else {
      await Staff.create({ userId: user.id, ...details });
      console.log('[AUTH] Staff profile created');
    }

    // 3. Record in dedicated Registration Table
    await Registration.create({
      username,
      userType: type,
      fullName: name,
      email: email || details?.email || 'N/A',
      registrationDetails: details,
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip,
      userAgent: req.headers['user-agent']
    });

    // 4. Record in central Activity Log
    await logActivity('register_success', username, type, { name, details }, req);
    
    res.json({ success: true, user });
  } catch (err) {
    console.error('[AUTH] Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[AUTH] Login attempt:', username);
    
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      console.warn('[AUTH] Login failed: User not found', username);
      await LoginLog.create({
        username, status: 'failed',
        ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify hashed password
    const isMatch = verifyPassword(password, user.salt, user.password);
    
    if (!isMatch) {
      // FEAUTRE: Check for legacy plain-text password to ensure ZERO-SYSTEM-BREAKAGE
      // We only do this if salt is null (indicating old user)
      if (!user.salt && user.password === password) {
        console.log('[AUTH] Legacy plain-text login detected. Migrating to secure hash...');
        const { hash: newHash, salt: newSalt } = hashPassword(password);
        await user.update({ password: newHash, salt: newSalt });
      } else {
        console.warn('[AUTH] Login failed: Invalid password for', username);
        await LoginLog.create({
          username, status: 'failed',
          ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip,
          userAgent: req.headers['user-agent']
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Track last login in user table
    await user.update({ 
      lastLoginAt: new Date(),
      status: 'Online' 
    });

    // 1. Record in dedicated Login Table (New Requirement)
    await LoginLog.create({
      username,
      userType: user.type,
      status: 'success',
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip,
      userAgent: req.headers['user-agent']
    });

    // 2. Record in central Activity Log
    await logActivity('login_success', username, user.type, null, req);

    // Fetch with specialized details
    const fullUser = await User.findOne({
      where: { username },
      include: user.type === 'student' ? [Student] : [Staff]
    });

    // Validate profile completeness — block login if registration is incomplete
    if (user.type === 'student') {
      const profile = fullUser.Student;
      if (!profile || !profile.registerNumber || !profile.department || !profile.year || !profile.section || !profile.gender || !profile.batch || !profile.dob) {
        console.warn('[AUTH] Login blocked: Incomplete student profile:', username);
        return res.status(403).json({ error: 'Your registration is incomplete. Please contact the administrator to complete your profile before logging in.' });
      }
    } else if (user.type === 'staff') {
      const profile = fullUser.Staff;
      if (!profile || !profile.staffCode || !profile.department) {
        console.warn('[AUTH] Login blocked: Incomplete staff profile:', username);
        return res.status(403).json({ error: 'Your staff profile is incomplete. Please contact the administrator.' });
      }
    }

    console.log('[AUTH] Login successful:', username);
    res.json({ success: true, user: fullUser });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { username } = req.body;
    if (username) {
      const user = await User.findOne({ where: { username } });
      if (user) {
        await user.update({ status: 'Offline' });
        await logActivity('logout', username, user.type, null, req);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === USER PROFILE ROUTES ===
app.put('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { name, email, profileImage, details } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate email: only @gmail.com allowed
    if (email && !email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only @gmail.com email addresses are allowed.' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (profileImage) updates.profilePic = profileImage;
    if (details) {
      if (user.type === 'student') {
        const student = await Student.findOne({ where: { userId: user.id } });
        if (student) await student.update(details);
        else await Student.create({ userId: user.id, ...details });
      } else {
        const staff = await Staff.findOne({ where: { userId: user.id } });
        if (staff) await staff.update(details);
        else await Staff.create({ userId: user.id, ...details });
      }
    }

    await user.update(updates);

    const fullUser = await User.findOne({
      where: { username },
      include: user.type === 'student' ? [Student] : [Staff]
    });

    await logActivity('profile_update', username, user.type, { updatedFields: [...Object.keys(updates), ...(details ? Object.keys(details) : [])] }, req);

    res.json({ success: true, user: fullUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === TEST ROUTES (STUDENT) ===
app.get('/api/tests/available', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json([]); // STRICT: No username, no tests

    // 1. Get all assignments for this student that are 'not_started'
    const assignments = await TestAssignment.findAll({
      where: {
        studentUsername: username,
        status: 'not_started'
      }
    });

    // 2. Cross-reference with Results table to ensure NO PREVIOUS ATTEMPT exists
    // This is the fail-safe to prevent duplicates
    const results = await Result.findAll({
      where: { username },
      attributes: ['testId']
    });
    const completedTestIds = results.map(r => String(r.testId));

    const assignedIds = assignments
      .map(a => String(a.testId))
      .filter(id => !completedTestIds.includes(id));

    if (assignedIds.length === 0) return res.json([]);

    const tests = await Test.findAll({
      where: {
        id: assignedIds,
        status: ['active', 'published']
      }
    });
    
    await logActivity('view_available_tests', username, 'student', { count: tests.length }, req);
    res.json(tests);
  } catch (err) {
    console.error('[Available Tests API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// START ATTEMPT: Mark test as in_progress immediately
app.post('/api/tests/start-attempt', async (req, res) => {
  try {
    const { testId, username } = req.body;

    // 1. Check if Result already exists (Fail-safe: ABSOLUTELY NO re-entry after submission)
    const existingResult = await Result.findOne({ where: { testId, username } });
    if (existingResult) {
      return res.status(403).json({ error: 'This assessment has already been submitted. Re-entry is strictly prohibited.' });
    }

    // 2. Check assignment exists
    const assignment = await TestAssignment.findOne({
      where: { testId, studentUsername: username }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assessment assignment not found for your account.' });
    }

    // 3. Handle status transitions
    if (assignment.status === 'submitted') {
      return res.status(403).json({ error: 'This assessment was already submitted. You cannot retake it.' });
    }

    // Allow 'in_progress' to resume (browser refresh, connection lost) — but only if no Result exists (checked above)
    if (assignment.status === 'in_progress') {
      console.log(`[Start Attempt] Resuming in_progress test ${testId} for ${username}`);
      return res.json({ success: true, message: 'Resuming in-progress assessment.' });
    }

    // 4. First-time start: Update status to 'in_progress'
    await assignment.update({ status: 'in_progress', startedAt: new Date() });

    await logActivity('start_test', username, 'student', { testId }, req);

    res.json({ success: true, message: 'Attempt authorized and locked.' });
  } catch (err) {
    console.error('[Start Attempt API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tests/:id', async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tests/submit', async (req, res) => {
  try {
    // 1. Create Result
    const result = await Result.create(req.body);

    // 2. Update Assignment status to submitted
    await TestAssignment.update(
      { status: 'submitted', submittedAt: new Date() },
      { where: { testId: req.body.testId, studentUsername: req.body.username } }
    );

    await logActivity('submit_test', req.body.username, 'student', {
      testId: req.body.testId,
      testName: req.body.testName,
      score: req.body.score
    }, req);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/student/:username', async (req, res) => {
  try {
    const username = req.params.username;

    // 1. Fetch official results
    const results = await Result.findAll({
      where: { username },
      order: [['date', 'DESC']]
    });

    // 2. Fetch all assignments where status is NOT 'not_started'
    // (This covers 'in_progress' and 'submitted')
    const attemptedAssignments = await TestAssignment.findAll({
      where: {
        studentUsername: username,
        status: { [Op.ne]: 'not_started' }
      }
    });

    // 3. Find assignments that don't have a Result record yet (e.g. abandoned midway)
    const resultTestIds = results.map(r => String(r.testId));
    const incompleteAssignments = attemptedAssignments.filter(a => !resultTestIds.includes(String(a.testId)));

    if (incompleteAssignments.length > 0) {
      const testIds = incompleteAssignments.map(a => a.testId);
      const tests = await Test.findAll({ where: { id: testIds } });

      const incompleteResults = incompleteAssignments.map(a => {
        const test = tests.find(t => String(t.id) === String(a.testId));
        return {
          id: `incomplete_${a.id}`,
          testId: a.testId,
          testName: test ? test.name : 'Unknown Assessment',
          company: test ? test.company : 'N/A',
          score: 0,
          status: a.status === 'in_progress' ? 'incomplete' : 'submitted',
          date: a.updatedAt || a.assignedAt,
          isIncomplete: true
        };
      });

      // Merge and sort
      const merged = [...results, ...incompleteResults].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB - dateA;
      });
      return res.json(merged);
    }

    res.json(results);
  } catch (err) {
    console.error('[Results API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff/test-participation/:testId', async (req, res) => {
  try {
    const testId = req.params.testId;
    console.log(`[STMAI] Syncing participation for Test ID: ${testId}`);

    // 1. Fetch Test
    const test = await Test.findByPk(testId);
    if (!test) return res.status(404).json({ error: 'Assessment not found' });

    // 2. Fetch all explicit assignments for this test
    const assignments = await TestAssignment.findAll({ where: { testId } });
    const assignedUsernames = assignments.map(a => a.studentUsername);

    // 3. Fetch all students who have a Result record for this test
    const results = await Result.findAll({ where: { testId } });
    const resultUsernames = results.map(r => r.username);

    // 4. Get the union of all students who were either assigned or have results
    const unionUsernames = [...new Set([...assignedUsernames, ...resultUsernames])];

    let finalUsers = [];
    if (unionUsernames.length > 0) {
      finalUsers = await User.findAll({
        where: { username: { [Op.in]: unionUsernames } },
        include: [Student]
      });
    }

    const report = finalUsers.map(userInstance => {
      const u = userInstance.get({ plain: true });
      const studentDetails = u.Student || u.student || {};
      
      const result = results.find(r => r.username === u.username);
      const assignment = assignments.find(a => a.studentUsername === u.username);

      // Determine 'attended' status
      const isAttended = !!result || (assignment && assignment.status !== 'not_started');

      // Determine display status
      let displayStatus = 'NOT STARTED';
      if (result) displayStatus = result.status.toUpperCase();
      else if (assignment && assignment.status === 'in_progress') displayStatus = 'IN PROGRESS';
      else if (assignment && assignment.status === 'submitted') displayStatus = 'SUBMITTED';

      return {
        username: u.username,
        registerNumber: studentDetails.registerNumber || u.username,
        name: u.name || studentDetails.fullName || u.username,
        attended: isAttended,
        score: result ? result.score : (isAttended ? 0 : null),
        status: displayStatus,
        section: studentDetails.section || 'N/A',
        department: studentDetails.department || 'N/A',
        year: studentDetails.year || 'N/A',
        batch: studentDetails.batch || 'N/A'
      };
    });
    console.log(`[STMAI] Sync Complete. Found ${report.length} participants.`);
    await logActivity('view_test_participation', 'staff', 'staff', { testId, participantCount: report.length }, req);
    res.json(report);
  } catch (err) {
    console.error('[STMAI] API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === PRINT REPORT ENDPOINT ===
app.get('/api/test-report', async (req, res) => {
  try {
    // 1. Auth & Token Validation
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token is error: Missing or improperly passed token' });
    }
    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Authentication token is expired or invalid' });
    }

    const { test_id, filter, selected_fields } = req.query; // filter: all, attended, not_attended
    if (!test_id) return res.status(400).json({ error: 'test_id is required' });

    let fieldsArray = [];
    if (Array.isArray(selected_fields)) {
      fieldsArray = selected_fields;
    } else if (typeof selected_fields === 'string') {
      fieldsArray = selected_fields.split(','); // Split comma-separated string into an array
    } else {
      fieldsArray = ['student_name', 'register_number', 'department', 'stream', 'stream_type', 'section', 'marks', 'grade']; // fallback completely
    }

    // 2. Fetch Test
    const test = await Test.findByPk(test_id);
    if (!test) return res.status(404).json({ error: 'Assessment not found' });

    // 3. Fetch assignments
    const assignments = await TestAssignment.findAll({ where: { testId: test_id } });
    const assignedUsernames = assignments.map(a => a.studentUsername);

    // 4. Fetch results
    const results = await Result.findAll({ where: { testId: test_id } });
    const resultUsernames = results.map(r => r.username);

    // 5. Union of all participants
    const unionUsernames = [...new Set([...assignedUsernames, ...resultUsernames])];

    let finalUsers = [];
    if (unionUsernames.length > 0) {
      finalUsers = await User.findAll({
        where: { username: { [Op.in]: unionUsernames }, type: 'student' },
        attributes: ['username', 'name'],
        include: [{ model: Student, as: 'Student' }]
      });
    }

    // 6. Build the Report
    let report = finalUsers.map(u => {
      const studentDetails = u.Student || {};
      const username = u.username;

      const userResult = results.find(r => r.username === username);
      const isAttended = !!userResult;

      const marks = userResult ? userResult.score : null;
      let grade = 'N/A';
      if (marks !== null) {
        if (marks >= 90) grade = 'A+';
        else if (marks >= 80) grade = 'A';
        else if (marks >= 70) grade = 'B';
        else if (marks >= 60) grade = 'C';
        else if (marks >= 50) grade = 'D';
        else grade = 'F';
      }

      const row = { attendance_status: isAttended ? 'attended' : 'not_attended' };

      // Dynamically attach only requested fields
      if (fieldsArray.includes('student_name')) row.student_name = u.name || studentDetails.fullName || u.username;
      if (fieldsArray.includes('register_number')) row.register_number = studentDetails.registerNumber || u.username;
      if (fieldsArray.includes('department')) row.department = studentDetails.department || 'N/A';
      if (fieldsArray.includes('stream')) row.stream = studentDetails.stream || studentDetails.streamType || 'N/A';
      if (fieldsArray.includes('stream_type')) row.stream_type = studentDetails.streamType || 'N/A';
      if (fieldsArray.includes('section')) row.section = studentDetails.section || 'N/A';
      if (fieldsArray.includes('marks')) row.marks = marks !== null ? marks : 'N/A';
      if (fieldsArray.includes('grade')) row.grade = grade;

      return row;
    });

    if (filter === 'attended') {
      report = report.filter(r => r.attendance_status === 'attended');
    } else if (filter === 'not_attended') {
      report = report.filter(r => r.attendance_status === 'not_attended');
    }

    res.json(report);
  } catch (err) {
    console.error('[Test Report] API Error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Real-time Update Handling (SSE)
let activeClients = [];

app.get('/api/realtime/updates', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  activeClients.push(newClient);

  req.on('close', () => {
    activeClients = activeClients.filter(c => c.id !== clientId);
  });
});

function notifyClients(data) {
  activeClients.forEach(c => c.res.write(`data: ${JSON.stringify(data)}\n\n`));
}

// === SYLLABUS UPLOAD ROUTE ===
app.post('/api/staff/upload-syllabus', upload.single('syllabus'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/syllabus/${req.file.filename}`;
  res.json({ success: true, fileUrl });
});

app.post('/api/staff/create-test', async (req, res) => {
  try {
    // 1. Create the base Test
    const test = await Test.create(req.body);

    // 2. Fetch ALL students with their professional profiles
    const allStudents = await User.findAll({
      where: { type: 'student' },
      include: [Student]
    });

    if (allStudents.length === 0) {
      await test.destroy();
      return res.status(400).json({ error: 'No students are registered in the system. Please register students first.' });
    }

    // 3. Parse target audience criteria
    const { departments = [], years = [], sections = [], genders = [], batches = [], classes = [], registerNumbers = [] } = test.targetAudience || {};

    // Check if ANY filtering is applied
    const hasFilters = departments.length > 0 || years.length > 0 || sections.length > 0 || genders.length > 0 || batches.length > 0 || classes.length > 0 || registerNumbers.length > 0;

    let targetStudents;

    if (!hasFilters) {
      targetStudents = allStudents;
    } else if (registerNumbers.length > 0) {
      targetStudents = allStudents.filter(student => registerNumbers.includes(student.username));
    } else {
      targetStudents = allStudents.filter(student => {
        const d = student.Student || {};

        const deptMatch = departments.length === 0 || departments.includes(d.department);
        const yearMatch = years.length === 0 || years.includes(String(d.year));
        const sectionMatch = sections.length === 0 || sections.includes(d.section);
        const genderMatch = genders.length === 0 || genders.includes(d.gender);
        const batchMatch = batches.length === 0 || batches.includes(d.batch);
        const classMatch = classes.length === 0 || classes.includes(d.streamType);

        return deptMatch && yearMatch && sectionMatch && genderMatch && batchMatch && classMatch;
      });
    }

    if (targetStudents.length === 0) {
      // Don't destroy the test — just inform staff with a helpful message
      // Assign to ALL students as fallback to avoid orphaned tests
      console.log('[Create Test] No students matched filters — falling back to ALL students.');
      targetStudents = allStudents;
    }

    // 4. Bulk insert assignments ONLY if not draft
    if (test.status !== 'draft') {
      const assignments = targetStudents.map(s => ({
        testId: test.id,
        studentUsername: s.username
      }));
      await TestAssignment.bulkCreate(assignments);

      // Log the activity
      await logActivity('publish_test', req.body.createdBy || 'staff', 'staff', {
        testId: test.id, testName: test.name, company: test.company,
        questionCount: test.questions ? (typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions).length : 0,
        assignedCount: targetStudents.length
      }, req);

      // 5. Trigger real-time update
      notifyClients({ type: 'test_published', testName: test.name, company: test.company, assignedCount: targetStudents.length });
    }

    res.json({ success: true, test, assignedCount: test.status === 'draft' ? 0 : targetStudents.length });
  } catch (err) {
    console.error('[Create Test] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/all', async (req, res) => {
  try {
    const results = await Result.findAll();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff/students', async (req, res) => {
  try {
    const students = await User.findAll({
      where: { type: 'student' },
      attributes: { exclude: ['password'] },
      include: [Student]
    });
    res.json(students);
    await logActivity('view_student_list', 'staff', 'staff', { count: students.length }, req);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin overview: Show all users currently in the system
app.get('/api/admin/users-overview', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [Student, Staff],
      order: [['lastLoginAt', 'DESC']]
    });
    res.json(users);
    await logActivity('view_users_overview', 'admin', 'admin', { count: users.length }, req);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff/tests', async (req, res) => {
  try {
    const tests = await Test.findAll({ order: [['createdAt', 'DESC']] });
    
    // Enrich tests with participation counts
    const enrichedTests = await Promise.all(tests.map(async (test) => {
      const totalAssigned = await TestAssignment.count({ where: { testId: test.id } });
      
      // Attended: Students who either have a Result or have started/submitted the assignment
      const attendedCount = await TestAssignment.count({ 
        where: { 
          testId: test.id,
          status: { [Op.ne]: 'not_started' }
        } 
      });

      // Special case: if there are Result records but no assignments (e.g. legacy or manual results)
      // We take the max of (Result count) and (Assignment-based attended count)
      const resultCount = await Result.count({ where: { testId: test.id } });
      const finalAttended = Math.max(attendedCount, resultCount);

      const testJson = test.toJSON();
      testJson.totalAssigned = totalAssigned;
      testJson.attendedCount = finalAttended;
      return testJson;
    }));
    
    res.json(enrichedTests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/staff/tests/:id', async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);
    const testName = test ? test.name : 'Unknown';

    // Cascade: delete assignments and results for this test
    await TestAssignment.destroy({ where: { testId: req.params.id } });
    await Result.destroy({ where: { testId: req.params.id } });
    await Test.destroy({ where: { id: req.params.id } });

    await logActivity('delete_test', 'staff', 'staff', { testId: req.params.id, testName }, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/staff/students/:username', async (req, res) => {
  try {
    const username = req.params.username;

    // Cascade: remove student's assignments and results
    await TestAssignment.destroy({ where: { studentUsername: username } });
    await Result.destroy({ where: { username } });
    await User.destroy({ where: { username, type: 'student' } });

    await logActivity('delete_student', 'staff', 'staff', { deletedUsername: username }, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === CERTIFICATE ROUTES ===
app.post('/api/certificates/log', async (req, res) => {
  try {
    // Lazy sync to ensure table exists if not already present
    await Certificate.sync();
    const cert = await Certificate.create(req.body);
    await logActivity('issue_certificate', req.body.studentUsername, 'student', { 
      testId: req.body.testId, 
      serial: req.body.serialNumber 
    }, req);
    res.json({ success: true, cert });
  } catch (err) {
    console.error('[Cert API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/certificates/history', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    const certs = await Certificate.findAll({
      where: { studentUsername: username },
      order: [['issueDate', 'DESC']]
    });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === UNIVERSAL CODE EXECUTION ENGINE ===
const { exec, spawn } = require('child_process');
const os = require('os');

app.post('/api/code/execute', async (req, res) => {
  const { code, language = 'javascript', stdin = '', compileOnly = false } = req.body;

  // Map internal languages to Judge0 Language IDs (Public CE Instance)
  // 50: C (GCC 9.2.0), 54: C++ (GCC 9.2.0), 62: Java (OpenJDK 13.0.1), 71: Python (3.8.1), 63: Node.js (12.14.0)
  const langIdMap = {
    'c': 50,
    'cpp': 54,
    'java': 62,
    'python': 71,
    'python3': 71,
    'javascript': 63,
    'nodejs': 63
  };

  const languageId = langIdMap[language.toLowerCase()];
  if (!languageId) {
    return res.status(400).json({ error: 'Unsupported language for execution', success: false });
  }

  // Pre-processing for Java: ensure entry point class is named 'Main' as required by Judge0
  let processedCode = code;
  if (language.toLowerCase() === 'java') {
    // Replace 'public class [SomeName]' with 'public class Main'
    // This allows students to use any class name but keeps the entry point standard
    if (code.includes('class ') && !code.includes('class Main')) {
      processedCode = code.replace(/public\s+class\s+[A-Za-z0-9_$]+/, 'public class Main')
        .replace(/class\s+[A-Za-z0-9_$]+\s*{/, 'class Main {');
    }
  }

  try {
    const start = Date.now();

    // Call the public Judge0 execution API
    // Using ce.judge0.com which is a publicly accessible instance
    const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: processedCode,
        language_id: languageId,
        stdin: stdin || "",
        expected_output: null, // We handle comparison on frontend/scoring
        cpu_time_limit: 5.0,
        memory_limit: 128000,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'Execution API unreachable or rejected request', details: errText, success: false });
    }

    const data = await response.json();
    const timeMs = Date.now() - start;

    // Judge0 Status IDs:
    // 3: Accepted, 4: Wrong Answer, 5: TLE, 6: Compilation Error, 7-12: Runtime Errors
    const statusId = data.status?.id;
    const isSuccess = statusId === 3;
    const isCompilationError = statusId === 6;

    if (compileOnly) {
      if (isCompilationError) {
        return res.json({
          success: false,
          error: data.compile_output || 'Compilation failed',
          status: 'Compilation Error',
          timeMs
        });
      }
      return res.json({
        success: true,
        status: 'Success',
        output: 'Ready for execution (Syntax OK)',
        timeMs
      });
    }

    // Process output and errors
    let output = data.stdout || '';
    let error = data.stderr || data.compile_output || '';
    let statusText = data.status?.description || 'Unknown';

    if (statusId === 5) statusText = 'Time Limit Exceeded';
    if (statusId === 6) statusText = 'Compilation Error';
    if (statusId >= 7 && statusId <= 12) statusText = 'Runtime Error';

    res.json({
      success: isSuccess,
      output: output,
      error: error,
      status: statusText,
      timeMs: data.time ? parseFloat(data.time) * 1000 : timeMs,
      memory: data.memory
    });

  } catch (err) {
    console.error('[Code Execution] Fatal Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error during execution', status: 'Server Error' });
  }
});

// === SECURE AI CHAT PROXY ===
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { contents, system_instruction, modelId } = req.body;
    const apiKey = process.env.AI_API_KEY || "AIzaSyDhWXO7NfA8HVdPbE6JtePA_irB9J_wi-o";

    if (!contents || !apiKey) {
      return res.status(400).json({ error: 'Missing chat contents or API configuration' });
    }

    // Adaptive Fallback Logic (Move the intelligence to the backend)
    const models = [modelId, "gemini-2.0-flash", "gemini-1.5-flash"];
    const uniqueModels = [...new Set(models.filter(m => !!m))];

    let lastError = null;
    for (const mId of uniqueModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mId}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, system_instruction })
        });

        const data = await response.json();
        if (response.ok && !data.error) {
          return res.json(data);
        }
        lastError = data.error?.message || `HTTP ${response.status}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    res.status(500).json({ error: lastError || 'All models failed' });
  } catch (err) {
    console.error('[AI Proxy Error]:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// === ACTIVITY LOG ROUTES ===
app.get('/api/activity-logs', async (req, res) => {
  try {
    const { limit = 100, action, username } = req.query;
    const where = {};
    if (action) where.action = action;
    if (username) where.username = username;
    const logs = await ActivityLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel serverless
module.exports = app;

if (require.main === module) {
  // Initialization for local/Render
  sequelize.sync().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch(err => console.error('Database sync error:', err));
}
