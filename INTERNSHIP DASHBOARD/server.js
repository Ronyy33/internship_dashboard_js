const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const db = require('./database');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = 3000;

// Setup Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout');
// Note: We'll put views in 'views' folder

// Session for flash messages (if needed, otherwise we can pass directly)
app.use(session({
    secret: 'super_secret_key',
    resave: false,
    saveUninitialized: true
}));

const uploadDir = path.join(__dirname, 'static', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        // e.g. student_X_internship_Y_filename
        const { student_id } = req.body;
        const internship_id = req.params.id;
        cb(null, `student_${student_id}_internship_${internship_id}_${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Middleware for flash messages
app.use((req, res, next) => {
    res.locals.successMsg = req.session.success || null;
    res.locals.errorMsg = req.session.error || null;
    res.locals.warningMsg = req.session.warning || null;
    req.session.success = null;
    req.session.error = null;
    req.session.warning = null;
    res.locals.request = req; // Make request available in views
    next();
});

// Helper for redirecting with messages
const flash = (req, type, msg) => {
    req.session[type] = msg;
};

// -- ROUTES --

app.get('/', async (req, res) => {
    try {
        const [internships] = await db.query('SELECT * FROM internships');
        const [students] = await db.query('SELECT * FROM students');
        res.render('index', { internships, students });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.get('/post', async (req, res) => {
    const [internships] = await db.query('SELECT * FROM internships');
    res.render('post_internship', { internships });
});

app.post('/post', async (req, res) => {
    const { company, faculty, eligibility, duration, paid, mode } = req.body;
    await db.query(`INSERT INTO internships (company, faculty, eligibility, duration, paid, mode) VALUES (?, ?, ?, ?, ?, ?)`, 
        [company, faculty, eligibility, duration, paid, mode]);
    flash(req, 'success', 'Internship posted successfully!');
    res.redirect('/post');
});

app.post('/delete_internship/:id', async (req, res) => {
    await db.query('DELETE FROM internships WHERE id = ?', [req.params.id]);
    flash(req, 'success', 'Internship deleted successfully.');
    res.redirect('/post');
});

app.get('/add_student', async (req, res) => {
    const [students] = await db.query('SELECT * FROM students');
    res.render('add_student', { students });
});

app.post('/add_student', async (req, res) => {
    const { name, branch, year, email } = req.body;
    await db.query(`INSERT INTO students (name, branch, year, email) VALUES (?, ?, ?, ?)`,
        [name, branch, year, email]);
    flash(req, 'success', 'Student added successfully!');
    res.redirect('/add_student');
});

app.post('/delete_student/:id', async (req, res) => {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    flash(req, 'success', 'Student deleted successfully.');
    res.redirect('/add_student');
});

app.post('/apply/:id', upload.single('offer_letter'), async (req, res) => {
    const { student_id } = req.body;
    const internship_id = req.params.id;

    // Validation
    const [studentInfo] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
    const [internshipInfo] = await db.query('SELECT * FROM internships WHERE id = ?', [internship_id]);

    if (studentInfo.length === 0) {
        flash(req, 'error', 'Student not found');
        return res.redirect('/');
    }
    const student = studentInfo[0];
    const internship = internshipInfo[0];

    if (student.branch.toLowerCase() !== internship.eligibility.toLowerCase() && internship.eligibility.toLowerCase() !== 'any') {
        flash(req, 'error', 'Student branch is not eligible for this internship');
        return res.redirect('/');
    }

    const [existing] = await db.query('SELECT * FROM applications WHERE student_id = ? AND internship_id = ?', [student_id, internship_id]);
    if (existing.length > 0) {
        flash(req, 'warning', 'You have already applied for this internship.');
        return res.redirect('/');
    }

    if (!req.file) {
        flash(req, 'error', 'Please upload an offer letter.');
        return res.redirect('/');
    }

    const relPath = `static/uploads/${req.file.filename}`;
    await db.query(`INSERT INTO applications (student_id, internship_id, offer_letter, status) VALUES (?, ?, ?, ?)`,
        [student_id, internship_id, relPath, 'Applied']);
    
    flash(req, 'success', 'Successfully applied for internship!');
    res.redirect('/');
});

app.get('/dashboard', async (req, res) => {
    const [[{total}]] = await db.query('SELECT COUNT(*) as total FROM applications');
    const [[{completed}]] = await db.query('SELECT COUNT(*) as completed FROM applications WHERE status = "completed"');
    
    const [[{paid}]] = await db.query('SELECT COUNT(*) as paid FROM internships WHERE paid = "yes"');
    const [[{unpaid}]] = await db.query('SELECT COUNT(*) as unpaid FROM internships WHERE paid = "no"');
    
    const [[{online}]] = await db.query('SELECT COUNT(*) as online FROM internships WHERE mode = "online"');
    const [[{offline}]] = await db.query('SELECT COUNT(*) as offline FROM internships WHERE mode = "offline"');

    const [[{se}]] = await db.query('SELECT COUNT(*) as se FROM students WHERE year = "SE"');
    const [[{te}]] = await db.query('SELECT COUNT(*) as te FROM students WHERE year = "TE"');
    const [[{be}]] = await db.query('SELECT COUNT(*) as be FROM students WHERE year = "BE"');

    const [branches] = await db.query('SELECT DISTINCT branch FROM students');
    let branch_stats = {};
    for (let b of branches) {
        const [[{count}]] = await db.query('SELECT COUNT(*) as count FROM students WHERE branch = ?', [b.branch]);
        branch_stats[b.branch] = count;
    }

    res.render('dashboard', {
        total, completed, paid, unpaid, online, offline, se, te, be, branch_stats: JSON.stringify(branch_stats)
    });
});

app.get('/applications', async (req, res) => {
    // JOIN syntax since we dont have ORM relationships out of the box
    const [apps] = await db.query(`
        SELECT a.id, a.offer_letter, a.status, s.name as student_name, s.branch, s.year, i.company, i.duration 
        FROM applications a
        JOIN students s ON a.student_id = s.id
        JOIN internships i ON a.internship_id = i.id
    `);
    res.render('applications', { applications: apps });
});

app.post('/applications/:id/update_status', async (req, res) => {
    const { status } = req.body;
    if (status) {
        await db.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
        flash(req, 'success', 'Application status updated successfully.');
    }
    res.redirect('/applications');
});

app.get('/report', async (req, res) => {
    const [apps] = await db.query(`
        SELECT a.id, a.status, s.name as student_name, s.branch, s.year, i.company, i.duration, i.mode, i.paid
        FROM applications a
        JOIN students s ON a.student_id = s.id
        JOIN internships i ON a.internship_id = i.id
    `);
    
    const cw = createObjectCsvWriter({
        path: 'internship_report.csv',
        header: [
            { id: 'id', title: 'Application ID' },
            { id: 'student_name', title: 'Student Name' },
            { id: 'branch', title: 'Student Branch' },
            { id: 'year', title: 'Student Year' },
            { id: 'company', title: 'Company' },
            { id: 'duration', title: 'Internship Duration' },
            { id: 'mode', title: 'Mode' },
            { id: 'paid', title: 'Paid' },
            { id: 'status', title: 'Status' }
        ]
    });

    await cw.writeRecords(apps);
    res.download('internship_report.csv');
});

// Serve uploads correctly depending on original URL setup
app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'uploads', req.params.filename));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
