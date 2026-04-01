// JMC TEST - Professional Reporting Module
// Handles PDF (jsPDF) and Data Exports for Students

/**
 * Main switch for generating performance reports
 */
function generatePerformanceReport(format = 'pdf') {
    if (format === 'pdf') {
        if (typeof jspdf === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => runPDFGeneration();
            document.head.appendChild(script);
        } else {
            runPDFGeneration();
        }
    } else if (format === 'excel') {
        generatePerformanceExcel();
    }
}

/**
 * PDF Generation Logic
 */
async function runPDFGeneration() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tests = user.testsCompleted || [];

    // Sort tests by date
    tests.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    // Styling
    const brandColor = [102, 126, 234];
    const goldColor = [251, 191, 36];
    const silverColor = [203, 213, 225];
    const bronzeColor = [167, 139, 250];

    // Page 1: Performance Transcript
    doc.setFillColor(...brandColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('PERFORMANCE TRANSCRIPT', 15, 25);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('OFFICIAL ACADEMIC ASSESSMENT RECORD', 15, 33);

    // Student Info
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Student Profile', 15, 55);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${user.name || 'Student'}`, 15, 65);
    doc.text(`Roll No: ${user.username || 'N/A'}`, 15, 72);
    doc.text(`Major: ${user.department || 'N/A'}`, 15, 79);
    doc.text(`Batch: ${user.batch || 'N/A'}`, 15, 86);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 93);

    // Results Table
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Assessment Records', 15, 110);

    doc.setFillColor(...brandColor);
    doc.rect(15, 115, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Date', 20, 121.5);
    doc.text('Assessment Name', 50, 121.5);
    doc.text('Level', 120, 121.5);
    doc.text('Score', 150, 121.5);
    doc.text('Status', 170, 121.5);

    let y = 135;
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');

    tests.forEach((t) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const testDate = new Date(t.date || t.createdAt).toLocaleDateString('en-GB');
        const difficulty = t.difficulty || 'Medium';

        doc.text(testDate, 20, y);
        doc.text((t.testName || 'Test').substring(0, 30), 50, y);
        doc.text(difficulty, 120, y);
        doc.text(`${Math.round(t.score)}%`, 150, y);
        doc.text((t.status || 'N/A').toUpperCase(), 170, y);
        y += 10;
    });

    // Page 2+: Merit Certificates (for qualified tests)
    const qualifiedTests = tests.filter(t => t.status === 'passed' || t.score >= 50);
    const levelBgs = {
        'Easy': 'assets/certificates/easy_bg.jpg',
        'Medium': 'assets/certificates/medium_bg.jpg',
        'Hard': 'assets/certificates/hard_bg.jpg'
    };

    const loadImageAsDataUrl = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const blob = await res.blob();
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    for (const t of qualifiedTests) {
        // Add Landscape Page for Certificate
        doc.addPage('a4', 'l');
        const difficulty = t.difficulty || 'Medium';
        const bgUrl = levelBgs[difficulty];
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const bgBase64 = await loadImageAsDataUrl(bgUrl);
        const logoBase64 = await loadImageAsDataUrl("logo.png");

        // Add Background Template
        if (bgBase64) {
            try {
                const format = bgUrl.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
                doc.addImage(bgBase64, format, 0, 0, pw, ph);
            } catch (e) {
                console.warn("Cert template draw error", e);
            }
        }

        // Branding: Logo & College Name
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, "PNG", 20, 15, 20, 20);
            } catch (e) { console.warn("Logo load error", e); }
        }

        const brandingY = difficulty === 'Medium' ? 30 : 22;
        doc.setFont("times", "bold");
        doc.setTextColor(20, 30, 60);
        doc.setFontSize(24);
        doc.text("JAMAL MOHAMED COLLEGE (Autonomous)", pw / 2, brandingY, { align: "center" });

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const subHeader = "Accredited with A++ Grade by NAAC (4th Cycle) with CGPA 3.69 out of 4.0\nAffiliated to Bharathidasan University | Tiruchirappalli - 620 020";
        doc.text(subHeader, pw / 2, brandingY + 6, { align: "center", lineHeightFactor: 1.4 });

        doc.setFontSize(14);
        doc.setFont("times", "bolditalic");
        doc.text("TRAINING AND PLACEMENT CELL", pw / 2, brandingY + 18, { align: "center" });

        // Student Data Positioning
        let nameY = 115;
        let statementY = 140;
        if (difficulty === 'Hard') { nameY = 122; statementY = 148; }
        if (difficulty === 'Easy') { nameY = 112; statementY = 138; }
        if (difficulty === 'Medium') { nameY = 128; statementY = 155; }

        doc.setTextColor(30, 48, 80);
        doc.setFontSize(40);
        doc.setFont(undefined, 'bold');
        doc.text((user.name || 'STUDENT').toUpperCase(), pw / 2, nameY, { align: 'center' });

        // Achievement Info
        doc.setFontSize(15);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60, 60, 60);
        const dateStr = new Date(t.date || t.createdAt).toLocaleDateString();
        const statement = `Successfully qualified the ${t.testName} Assessment with ${Math.round(t.score)}% score.\nVerified Institution Credential - Conducted on ${dateStr}.`;
        doc.text(statement, pw / 2, statementY, { align: 'center', lineHeightFactor: 1.5 });

        // Signature Area (HOD Placeholder)
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.4);
        doc.line(pw - 80, ph - 35, pw - 30, ph - 35);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Head of the Department", pw - 55, ph - 28, { align: 'center' });

        // Score Highlight Badge - Strict Difficulty Alignment
        let badgeY = brandingY + 30;
        const diffColors = {
            'Easy': [16, 185, 129],   // Green
            'Medium': [37, 99, 235], // Blue
            'Hard': [239, 68, 68]    // Red
        };
        const badgeColor = diffColors[difficulty] || [100, 116, 139]; // Default Gray if mismatch
        
        doc.setFillColor(...badgeColor);
        doc.rect(pw/2 - 40, badgeY, 80, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(`${difficulty.toUpperCase()} LEVEL QUALIFIED`, pw/2, badgeY + 7, { align: 'center' });
    }

    doc.save(`Transcript_Certificates_${user.username}.pdf`);
    showNotification('Report Individual Saved', 'Transcript and certificates have been generated.', 'success');
}

/**
 * Excel (CSV Export) for Performance
 */
function generatePerformanceExcel() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tests = user.testsCompleted || [];

    if (tests.length === 0) return alert('No data to export');

    let csv = "S.No,Test Name,Company,Date,Score,Status\n";
    tests.forEach((t, i) => {
        csv += `${i + 1},"${t.testName}","${t.company}","${new Date(t.date || t.createdAt).toLocaleDateString()}",${t.score}%,${t.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JMC_Score_Analysis_${user.username}.csv`;
    a.click();
}

/**
 * Attempt Summary (Detailed Session Log)
 */
function generateAttemptReport() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tests = user.testsCompleted || [];

    if (tests.length === 0) return alert('No attempts found');

    let log = "--- JMC TEST ATTEMPT SUMMARY ---\n";
    log += `Student: ${user.name} (${user.username})\n`;
    log += `Generated: ${new Date().toLocaleString()}\n\n`;

    tests.forEach((t, i) => {
        log += `${i + 1}. ${t.testName} | ${t.company}\n`;
        log += `   Accuracy: ${t.score}% | Status: ${t.status}\n`;
        log += `   Timestamp: ${new Date(t.date || t.createdAt).toLocaleString()}\n`;

        if (t.questionTimes) {
            const totalMs = Object.values(t.questionTimes).reduce((acc, curr) => acc + curr.total, 0);
            log += `   Time Invested: ${Math.round(totalMs / 1000 / 60)} minutes\n`;
        }
        log += "---------------------------------\n";
    });

    const blob = new Blob([log], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attempt_Summary_${user.username}.txt`;
    a.click();
}

/**
 * Score Analysis (View Only Summary)
 */
function generateScoreAnalysis() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tests = user.testsCompleted || [];

    const summary = {
        total: tests.length,
        qualified: tests.filter(t => t.status === 'passed').length,
        avg: tests.length > 0 ? Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length) : 0
    };

    alert(`📊 Score Analysis for ${user.name}:\n\n` +
        `• Assessments Attempted: ${summary.total}\n` +
        `• Qualification Rate: ${summary.total > 0 ? Math.round((summary.qualified / summary.total) * 100) : 0}%\n` +
        `• Average Proficiency: ${summary.avg}%\n\n` +
        `Analysis based on verified institutional data.`);
}

/**
 * Detailed Result PDF Engine for Staff Dashboard
 */
async function downloadSingleReport(username, testId) {
    if (typeof jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => downloadSingleReport(username, testId);
        document.head.appendChild(script);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fetch Data
    const results = await window.DB.getAllResults();
    const result = results.find(r => r.username === username && String(r.testId) === String(testId));

    if (!result) {
        alert('Could not find result data for PDF generation.');
        return;
    }

    const questions = typeof result.questions === 'string' ? JSON.parse(result.questions) : (result.questions || []);
    const answers = typeof result.answers === 'string' ? JSON.parse(result.answers) : (result.answers || {});
    const detailsArray = typeof result.details === 'string' ? JSON.parse(result.details) : (result.details || []);

    // Branding & Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('ASSESSMENT PERFORMANCE REPORT', 15, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Official Document — ID: ${result.id}`, 15, 30);

    // Profile Info
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Participant Profile', 15, 55);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${result.name || username}`, 15, 65);
    doc.text(`Registration No: ${username}`, 15, 72);
    doc.text(`Assessment: ${result.testName}`, 15, 79);
    doc.text(`Company: ${result.company || 'Institutional'}`, 15, 86);
    doc.text(`Date: ${new Date(result.date).toLocaleString()}`, 15, 93);

    // Score Summary
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(140, 55, 55, 40, 3, 3, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(`${result.score}%`, 147, 80);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('FINAL SCORE', 147, 65);
    doc.text(result.status === 'passed' ? 'QUALIFIED' : 'NOT QUALIFIED', 147, 88);

    // Results Table
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Question-wise Analysis', 15, 110);

    let y = 120;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 8, 'F');
    doc.text('Q#', 18, y + 5.5);
    doc.text('Question Snippet', 35, y + 5.5);
    doc.text('Selected', 130, y + 5.5);
    doc.text('Correct', 155, y + 5.5);
    doc.text('Result', 180, y + 5.5);

    y += 12;
    doc.setFont(undefined, 'normal');
    questions.forEach((q, idx) => {
        if (y > 270) { doc.addPage(); y = 20; }

        const isCoding = q.type === 'coding';
        let isCorrect = false;
        let selectedText = '';
        let correctText = '';

        if (isCoding) {
            const det = (detailsArray || [])[idx] || {};
            const actual = (det.actualOutput !== undefined && det.actualOutput !== null && det.actualOutput !== "") ? det.actualOutput : "";
            const expected = (q.expectedOutput || det.expectedOutput || "").trim();
            isCorrect = actual.trim() === expected.trim() && actual.trim() !== "";
            selectedText = actual ? 'Output Produced' : 'No Output';
            correctText = 'Verified Match';
        } else {
            isCorrect = (answers[idx] || '') === q.answer;
            selectedText = String(answers[idx] || '—');
            correctText = String(q.answer);
        }

        doc.setTextColor(60, 60, 60);
        doc.text(String(idx + 1), 18, y);
        doc.text(q.question.substring(0, 45) + (q.question.length > 45 ? '...' : ''), 35, y);
        doc.text(selectedText.substring(0, 12), 130, y);
        doc.text(correctText.substring(0, 12), 155, y);

        if (isCorrect) doc.setTextColor(16, 185, 129);
        else doc.setTextColor(239, 68, 68);
        doc.text(isCorrect ? 'PASS' : (isCoding ? 'FAIL / PART' : 'WRONG'), 180, y);

        y += 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by JMC TEST Engine on ${new Date().toISOString()}`, 15, 285);

    doc.save(`Report_${username}_${result.testName.replace(/\s+/g, '_')}.pdf`);
}

// Global Exports
window.generatePerformanceReport = generatePerformanceReport;
window.generateAttemptReport = generateAttemptReport;
window.generateScoreAnalysis = generateScoreAnalysis;
window.PDFEngine = {
    downloadSingleReport: downloadSingleReport
};
