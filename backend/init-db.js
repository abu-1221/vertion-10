/**
 * ═══════════════════════════════════════════════════════════════════
 *  JMC-Test — Professional DB Initialization Script
 *  Jamal Mohamed College (Autonomous), Tiruchirappalli
 * ═══════════════════════════════════════════════════════════════════
 */

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
Test.hasMany(TestAssignment, { foreignKey: 'testId', onDelete: 'CASCADE' });
TestAssignment.belongsTo(Test, { foreignKey: 'testId' });
Test.hasMany(Result, { foreignKey: 'testId', onDelete: 'CASCADE' });
Result.belongsTo(Test, { foreignKey: 'testId' });

User.hasOne(Student, { foreignKey: 'userId', onDelete: 'CASCADE' });
Student.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Staff, { foreignKey: 'userId', onDelete: 'CASCADE' });
Staff.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Certificate, { foreignKey: 'studentUsername', sourceKey: 'username', onDelete: 'CASCADE' });
Certificate.belongsTo(User, { foreignKey: 'studentUsername', targetKey: 'username' });

async function init() {
    try {
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║   JMC-Test — Professional DB Init             ║');
        console.log('╚══════════════════════════════════════════════════╝');

        // 1. Force sync — drops and recreates all tables
        await sequelize.sync({ force: true });
        console.log('✓ Schema created in separate tables for students and staff.\n');

        // ═══════════════ STAFF SEEDING ═══════════════
        console.log('── Seeding Staff ──');
        const staffData = [
            {
                username: 'STF001', password: 'password123', name: 'Dr. Iqbal Ahmed', type: 'staff', email: 'iqbal.ahmed@jmc.edu',
                profile: { staffCode: 'STF001', department: 'Computer Science', designation: 'HOD & Associate Professor' }
            },
            {
                username: 'STF002', password: 'password123', name: 'Prof. Meera Krishnan', type: 'staff', email: 'meera.k@jmc.edu',
                profile: { staffCode: 'STF002', department: 'Information Technology', designation: 'Assistant Professor' }
            },
            {
                username: 'YMI', password: 'JMC', name: 'YMI Staff', type: 'staff', email: 'ymi@jmc.edu',
                profile: { staffCode: 'YMI', department: 'Placement Cell', designation: 'Coordinator' }
            }
        ];

        for (const s of staffData) {
            const u = await User.create({ username: s.username, password: s.password, name: s.name, type: s.type, email: s.email });
            await Staff.create({ userId: u.id, ...s.profile });
            console.log(`  ✓ Staff: ${u.name}`);
        }

        // ═══════════════ STUDENT SEEDING ═══════════════
        console.log('\n── Seeding Students ──');
        const studentData = [
            {
                username: '2024CSE001', password: '24052006', name: 'Abu Bakar S', type: 'student', email: 'abubakar@student.jmc.edu',
                profile: { registerNumber: '2024CSE001', department: 'Computer Science', year: '4', section: 'A', gender: 'Male', batch: '2022-2026', streamType: 'UG', dob: '2006-05-24' }
            },
            {
                username: '2024CSE002', password: '15031005', name: 'Priya Dharshini R', type: 'student', email: 'priya.d@student.jmc.edu',
                profile: { registerNumber: '2024CSE002', department: 'Computer Science', year: '4', section: 'A', gender: 'Female', batch: '2022-2026', streamType: 'UG', dob: '2005-03-15' }
            },
            {
                username: '23ucs006', password: '11111111', name: 'Student 23ucs006', type: 'student', email: '23ucs006@student.jmc.edu',
                profile: { registerNumber: '23ucs006', department: 'Computer Science', year: '2', section: 'A', gender: 'Male', batch: '2023-2026', streamType: 'UG', dob: '2005-01-01' }
            }
        ];

        for (const s of studentData) {
            const u = await User.create({ username: s.username, password: s.password, name: s.name, type: s.type, email: s.email });
            await Student.create({ userId: u.id, ...s.profile });
            console.log(`  ✓ Student: ${u.name}`);
        }

        // ═══════════════ TESTS ═══════════════
        console.log('\n── Seeding Tests ──');
        const test1 = await Test.create({
            name: 'Full Stack Coding Challenge',
            company: 'Google',
            duration: 60,
            description: 'Advanced coding test for SDE roles.',
            date: '2026-03-10',
            questions: [
                { question: 'What is the root of the web?', options: ['/', '/home', '/root', '/var'], answer: 'A' },
                { isCoding: true, question: 'Implement a function to reverse a string.', title: 'String Reversal', difficulty: 'Easy', allowedLanguages: ['JavaScript', 'Python'], testCases: [{ input: '"hello"', expected: '"olleh"' }] }
            ],
            createdBy: 'YMI',
            status: 'published',
            passingPercentage: 50,
            targetAudience: { departments: ['Computer Science'], years: ['4'], sections: [], genders: [] }
        });

        // ═══════════════ ASSIGNMENTS ═══════════════
        await TestAssignment.create({ testId: test1.id, studentUsername: '2024CSE001', status: 'not_started' });
        await TestAssignment.create({ testId: test1.id, studentUsername: '2024CSE002', status: 'not_started' });

        console.log(`  ✓ Test: ${test1.name} assigned to target audience.`);
        console.log('\n✓ Database initialization complete.');
        process.exit(0);
    } catch (err) {
        console.error('\n✗ Initialization FAILED:', err);
        process.exit(1);
    }
}

init();
