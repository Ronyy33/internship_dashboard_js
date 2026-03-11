const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const db = require('./database');
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcrypt');

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
        const student_id = req.session.user ? req.session.user.id : 'unknown';
        const internship_id = req.params.id || 'none';
        cb(null, `student_${student_id}_internship_${internship_id}_${file.originalname}`);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

// Middleware for flash messages and user context
app.use((req, res, next) => {
    res.locals.successMsg = req.session.success || null;
    res.locals.errorMsg = req.session.error || null;
    res.locals.warningMsg = req.session.warning || null;
    req.session.success = null;
    req.session.error = null;
    req.session.warning = null;
    
    // Add User context to all views if available
    res.locals.user = req.session.user || null;
    res.locals.request = req; // Make request available in views
    next();
});

// Auth Middlewares
const isAuth = (req, res, next) => {
    if (req.session.user) return next();
    req.session.error = "Please login first.";
    res.redirect('/login');
};

const isFaculty = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'faculty') return next();
    req.session.error = "Faculty access only.";
    res.redirect('/');
};

const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'student') return next();
    req.session.error = "Student access only.";
    res.redirect('/');
};

// Helper for redirecting with messages
const flash = (req, type, msg) => {
    req.session[type] = msg;
};

// -- ROUTES --

app.get('/', async (req, res) => {
    try {
        const [internships] = await db.query('SELECT * FROM internships');
        res.render('index', { internships });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// Auth Routes
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    let table = role === 'faculty' ? 'faculty' : 'students';
    try {
        const [users] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);
        if (users.length > 0) {
            const match = await bcrypt.compare(password, users[0].password);
            if (match) {
                req.session.user = { id: users[0].id, name: users[0].name, role };
                flash(req, 'success', 'Logged in successfully!');
                return res.redirect(role === 'faculty' ? '/dashboard' : '/');
            }
        }
    } catch(e) {}
    flash(req, 'error', 'Invalid email or password');
    res.redirect('/login');
});

app.get('/register/student', (req, res) => res.render('register_student'));
app.post('/register/student', async (req, res) => {
    const { name, email, password, PRN, division, semester, branch } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        await db.query(`INSERT INTO students (name, email, password, PRN, division, semester, branch) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [name, email, hash, PRN, division, semester, branch]);
        flash(req, 'success', 'Registration successful! Please login.');
        res.redirect('/login');
    } catch (err) {
        flash(req, 'error', 'Email already exists or invalid data.');
        res.redirect('/register/student');
    }
});

app.get('/register/faculty', (req, res) => res.render('register_faculty'));
app.post('/register/faculty', async (req, res) => {
    const { name, email, password, department } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        await db.query(`INSERT INTO faculty (name, email, password, department) VALUES (?, ?, ?, ?)`, 
            [name, email, hash, department]);
        flash(req, 'success', 'Registration successful! Please login.');
        res.redirect('/login');
    } catch (err) {
        flash(req, 'error', 'Email already exists or invalid data.');
        res.redirect('/register/faculty');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/post', isFaculty, async (req, res) => {
    const [internships] = await db.query('SELECT * FROM internships WHERE faculty_id = ?', [req.session.user.id]);
    res.render('post_internship', { internships });
});

app.post('/post', isFaculty, async (req, res) => {
    const { domain, company_name, contact, eligibility, duration, paid_or_unpaid, internship_mode } = req.body;
    await db.query(`INSERT INTO internships (faculty_id, domain, company_name, contact, eligibility, duration, paid_or_unpaid, internship_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [req.session.user.id, domain, company_name, contact, eligibility, duration, paid_or_unpaid, internship_mode]);
    flash(req, 'success', 'Internship posted successfully!');
    res.redirect('/post');
});

app.post('/delete_internship/:id', isFaculty, async (req, res) => {
    await db.query('DELETE FROM internships WHERE id = ? AND faculty_id = ?', [req.params.id, req.session.user.id]);
    flash(req, 'success', 'Internship deleted successfully.');
    res.redirect('/dashboard'); // Post view might not show listings anymore if moved to dashboard
});

app.post('/apply/:id', isStudent, upload.single('resume'), async (req, res) => {
    const student_id = req.session.user.id;
    const internship_id = req.params.id;

    if (!req.file) {
        flash(req, 'error', 'Please upload your resume (PDF).');
        return res.redirect('/');
    }

    const [existing] = await db.query('SELECT * FROM applications WHERE student_id = ? AND internship_id = ?', [student_id, internship_id]);
    if (existing.length > 0) {
        flash(req, 'warning', 'You have already applied for this internship.');
        return res.redirect('/');
    }

    const [internshipInfo] = await db.query('SELECT * FROM internships WHERE id = ?', [internship_id]);
    if (internshipInfo.length === 0) {
        flash(req, 'error', 'Internship not found.');
        return res.redirect('/');
    }
    const internship = internshipInfo[0];

    const relPath = `static/uploads/${req.file.filename}`;
    await db.query(`INSERT INTO applications (student_id, internship_id, resume, internship_mode, domain, company_name, duration, paid_unpaid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, internship_id, relPath, internship.internship_mode, internship.domain, internship.company_name, internship.duration, internship.paid_or_unpaid, 'Applied']);
    
    flash(req, 'success', 'Successfully applied for internship!');
    res.redirect('/');
});

app.get('/dashboard', isFaculty, async (req, res) => {
    const [[{total}]] = await db.query('SELECT COUNT(*) as total FROM applications');
    const [[{completed}]] = await db.query('SELECT COUNT(*) as completed FROM applications WHERE status = "Completed"');
    
    // Updated accurate query based on new schema
    const [[{paid}]] = await db.query('SELECT COUNT(*) as paid FROM internships WHERE paid_or_unpaid = "paid" AND faculty_id = ?', [req.session.user.id]);
    const [[{unpaid}]] = await db.query('SELECT COUNT(*) as unpaid FROM internships WHERE paid_or_unpaid = "unpaid" AND faculty_id = ?', [req.session.user.id]);
    
    const [[{online}]] = await db.query('SELECT COUNT(*) as online FROM internships WHERE internship_mode = "online" AND faculty_id = ?', [req.session.user.id]);
    const [[{offline}]] = await db.query('SELECT COUNT(*) as offline FROM internships WHERE internship_mode = "offline" AND faculty_id = ?', [req.session.user.id]);

    const [branches] = await db.query('SELECT DISTINCT branch FROM students');
    let branch_stats = {};
    for (let b of branches) {
        const [[{count}]] = await db.query('SELECT COUNT(*) as count FROM students WHERE branch = ?', [b.branch]);
        branch_stats[b.branch] = count;
    }

    res.render('dashboard', {
        total, completed, paid, unpaid, online, offline, se: 0, te: 0, be: 0, branch_stats: JSON.stringify(branch_stats)
    });
});

app.get('/applications', isFaculty, async (req, res) => {
    const [apps] = await db.query(`
        SELECT a.id, a.resume, a.status, s.name as student_name, s.branch, s.semester, a.company_name, a.duration 
        FROM applications a
        JOIN students s ON a.student_id = s.id
        JOIN internships i ON a.internship_id = i.id
        WHERE i.faculty_id = ?
    `, [req.session.user.id]);
    res.render('applications', { applications: apps });
});

app.post('/applications/:id/update_status', isFaculty, async (req, res) => {
    const { status } = req.body;
    if (status) {
        await db.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
        flash(req, 'success', 'Application status updated successfully.');
    }
    res.redirect('/applications');
});

app.get('/report', isFaculty, async (req, res) => {
    const [apps] = await db.query(`
        SELECT a.id, a.status, s.name as student_name, s.branch, s.semester, a.company_name, a.duration, a.internship_mode, a.paid_unpaid
        FROM applications a
        JOIN students s ON a.student_id = s.id
        JOIN internships i ON a.internship_id = i.id
        WHERE i.faculty_id = ?
    `, [req.session.user.id]);
    
    const cw = createObjectCsvWriter({
        path: 'internship_report.csv',
        header: [
            { id: 'id', title: 'Application ID' },
            { id: 'student_name', title: 'Student Name' },
            { id: 'branch', title: 'Branch' },
            { id: 'semester', title: 'Semester' },
            { id: 'company_name', title: 'Company' },
            { id: 'duration', title: 'Duration' },
            { id: 'internship_mode', title: 'Mode' },
            { id: 'paid_unpaid', title: 'Paid' },
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
