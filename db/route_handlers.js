/* Route Handler Functions - all endpoint logic resides here */
const hashLib = require('bcrypt');
const { createObjectCsvWriter: makeCsvWriter } = require('csv-writer');
const dbPool = require('./db_connector');
const { setSessionNotice } = require('./middleware_chain');

/* ========== HOME PAGE ========== */
async function serveHomeListing(webReq, webRes) {
  try {
    var rawRows = await dbPool.query('SELECT * FROM internships');
    var allPositions = rawRows[0];
    webRes.render('index', { internships: allPositions });
  } catch (fetchErr) {
    console.error('Home page data fetch failed:', fetchErr);
    webRes.status(500).send('An unexpected error occurred.');
  }
}

/* ========== LOGIN ========== */
function serveLoginPage(_webReq, webRes) {
  webRes.render('login');
}

async function handleLoginSubmission(webReq, webRes) {
  var typedEmail = webReq.body.email;
  var typedSecret = webReq.body.password;
  var chosenRole = webReq.body.role;

  /* Validate that required fields are present */
  var fieldsMissing = (!typedEmail || !typedSecret || !chosenRole);
  if (fieldsMissing) {
    setSessionNotice(webReq.session, 'error', 'Credentials are incorrect or missing.');
    webRes.redirect('/login');
    return;
  }

  /* Determine which database table to search based on role */
  var lookupTable = (chosenRole === 'faculty') ? 'faculty' : 'students';

  try {
    var sqlText = 'SELECT * FROM ' + lookupTable + ' WHERE email = ?';
    var dbResult = await dbPool.query(sqlText, [typedEmail]);
    var foundUsers = dbResult[0];

    /* No user found with that email */
    if (foundUsers.length < 1) {
      setSessionNotice(webReq.session, 'error', 'Credentials are incorrect or missing.');
      webRes.redirect('/login');
      return;
    }

    var userRecord = foundUsers[0];
    var secretValid = await hashLib.compare(typedSecret, userRecord.password);

    /* Password did not match */
    if (!secretValid) {
      setSessionNotice(webReq.session, 'error', 'Credentials are incorrect or missing.');
      webRes.redirect('/login');
      return;
    }

    /* Store authenticated user in session */
    webReq.session.user = {
      id: userRecord.id,
      name: userRecord.name,
      role: chosenRole
    };
    setSessionNotice(webReq.session, 'success', 'Welcome back! You are now signed in.');

    /* Redirect faculty to dashboard, students to home */
    var dest = (chosenRole === 'faculty') ? '/dashboard' : '/';
    webRes.redirect(dest);
  } catch (loginErr) {
    setSessionNotice(webReq.session, 'error', 'Credentials are incorrect or missing.');
    webRes.redirect('/login');
  }
}

/* ========== STUDENT REGISTRATION ========== */
function serveLearnerSignupPage(_webReq, webRes) {
  webRes.render('register_student');
}

async function handleLearnerSignup(webReq, webRes) {
  var payload = webReq.body;
  var isIncomplete = (!payload || !payload.name || !payload.email || !payload.password);
  if (isIncomplete) {
    setSessionNotice(webReq.session, 'error', 'That email is taken or some fields are invalid.');
    webRes.redirect('/register/student');
    return;
  }

  var encryptedPw = await hashLib.hash(payload.password, 10);

  try {
    var insertSql =
      'INSERT INTO students' +
      ' (name, email, password, PRN, division, semester, branch)' +
      ' VALUES (?, ?, ?, ?, ?, ?, ?)';
    var paramList = [
      payload.name, payload.email, encryptedPw,
      payload.PRN, payload.division,
      payload.semester, payload.branch
    ];
    await dbPool.query(insertSql, paramList);
    setSessionNotice(webReq.session, 'success', 'Account created! Please sign in now.');
    webRes.redirect('/login');
  } catch (regErr) {
    setSessionNotice(webReq.session, 'error', 'That email is taken or some fields are invalid.');
    webRes.redirect('/register/student');
  }
}

/* ========== FACULTY REGISTRATION ========== */
function serveInstructorSignupPage(_webReq, webRes) {
  webRes.render('register_faculty');
}

async function handleInstructorSignup(webReq, webRes) {
  var payload = webReq.body;
  var isIncomplete = (!payload || !payload.name || !payload.email || !payload.password);
  if (isIncomplete) {
    setSessionNotice(webReq.session, 'error', 'That email is taken or some fields are invalid.');
    webRes.redirect('/register/faculty');
    return;
  }

  var encryptedPw = await hashLib.hash(payload.password, 10);

  try {
    var insertSql =
      'INSERT INTO faculty (name, email, password, department)' +
      ' VALUES (?, ?, ?, ?)';
    await dbPool.query(insertSql, [
      payload.name, payload.email,
      encryptedPw, payload.department
    ]);
    setSessionNotice(webReq.session, 'success', 'Account created! Please sign in now.');
    webRes.redirect('/login');
  } catch (regErr) {
    setSessionNotice(webReq.session, 'error', 'That email is taken or some fields are invalid.');
    webRes.redirect('/register/faculty');
  }
}

/* ========== SIGN-OUT ========== */
function handleSignOut(webReq, webRes) {
  webReq.session.destroy();
  webRes.redirect('/');
}

/* ========== POST INTERNSHIP ========== */
async function servePostingForm(webReq, webRes) {
  var userId = webReq.session.user.id;
  var fetchResult = await dbPool.query(
    'SELECT * FROM internships WHERE faculty_id = ?', [userId]
  );
  var ownedPositions = fetchResult[0];
  webRes.render('post_internship', { internships: ownedPositions });
}

async function handleNewPosting(webReq, webRes) {
  var f = webReq.body;
  if (!f) {
    setSessionNotice(webReq.session, 'error', 'Submission data was empty.');
    webRes.redirect('/post');
    return;
  }

  var insertSql =
    'INSERT INTO internships' +
    ' (faculty_id, domain, company_name, contact,' +
    ' eligibility, duration, paid_or_unpaid, internship_mode)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  var vals = [
    webReq.session.user.id, f.domain,
    f.company_name, f.contact, f.eligibility,
    f.duration, f.paid_or_unpaid, f.internship_mode
  ];

  await dbPool.query(insertSql, vals);
  setSessionNotice(webReq.session, 'success', 'New internship listing has been published!');
  webRes.redirect('/post');
}

/* ========== DELETE INTERNSHIP ========== */
async function handlePostingRemoval(webReq, webRes) {
  var entryId = webReq.params.id;
  var creatorId = webReq.session.user.id;
  if (entryId && creatorId) {
    var delSql = 'DELETE FROM internships WHERE id = ? AND faculty_id = ?';
    await dbPool.query(delSql, [entryId, creatorId]);
  }
  setSessionNotice(webReq.session, 'success', 'The internship listing was removed.');
  webRes.redirect('/dashboard');
}

/* ========== STUDENT APPLY ========== */
async function handleApplicationSubmission(webReq, webRes) {
  var stuId = webReq.session.user.id;
  var posId = webReq.params.id;

  /* Ensure a PDF file was actually uploaded */
  if (!webReq.file) {
    setSessionNotice(webReq.session, 'error', 'A resume file in PDF format is required.');
    webRes.redirect('/');
    return;
  }

  /* Check if this student already applied to this position */
  var dupeResult = await dbPool.query(
    'SELECT * FROM applications WHERE student_id = ? AND internship_id = ?',
    [stuId, posId]
  );
  var existingApps = dupeResult[0];
  if (existingApps.length > 0) {
    setSessionNotice(webReq.session, 'warning', 'You already submitted an application for this one.');
    webRes.redirect('/');
    return;
  }

  /* Fetch the internship details to copy into the application record */
  var posResult = await dbPool.query(
    'SELECT * FROM internships WHERE id = ?', [posId]
  );
  var posRows = posResult[0];
  if (posRows.length < 1) {
    setSessionNotice(webReq.session, 'error', 'That position could not be found.');
    webRes.redirect('/');
    return;
  }

  var posData = posRows[0];
  var filePath = 'static/uploads/' + webReq.file.filename;

  var appSql =
    'INSERT INTO applications' +
    ' (student_id, internship_id, resume, internship_mode,' +
    ' domain, company_name, duration, paid_unpaid, status)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  var appVals = [
    stuId, posId, filePath,
    posData.internship_mode, posData.domain,
    posData.company_name, posData.duration,
    posData.paid_or_unpaid, 'Applied'
  ];

  await dbPool.query(appSql, appVals);
  setSessionNotice(webReq.session, 'success', 'Your application was submitted!');
  webRes.redirect('/');
}

/* ========== DASHBOARD HELPERS ========== */
function buildStatQueries(instructorId) {
  /* Returns an array of {key, sql, params} for dashboard metrics */
  var base = 'SELECT COUNT(*) as cnt FROM ';
  return [
    { key: 'totalApps',
      sql: base + 'applications',
      params: [] },
    { key: 'doneApps',
      sql: base + 'applications WHERE status = "Completed"',
      params: [] },
    { key: 'paidPositions',
      sql: base + 'internships WHERE paid_or_unpaid = "paid"',
      params: [] },
    { key: 'unpaidPositions',
      sql: base + 'internships WHERE paid_or_unpaid = "unpaid"',
      params: [] },
    { key: 'remotePositions',
      sql: base + 'internships WHERE internship_mode = "online"',
      params: [] },
    { key: 'onsitePositions',
      sql: base + 'internships WHERE internship_mode = "offline"',
      params: [] }
  ];
}

async function collectDashboardStats(instructorId) {
  var metricsStore = new Map();
  var queries = buildStatQueries(instructorId);
  var qi = 0;
  while (qi < queries.length) {
    var entry = queries[qi];
    var result = await dbPool.query(entry.sql, entry.params);
    metricsStore.set(entry.key, result[0][0].cnt);
    qi = qi + 1;
  }
  return metricsStore;
}

async function collectBranchBreakdown() {
  var brResult = await dbPool.query('SELECT DISTINCT branch FROM students');
  var brRows = brResult[0];
  var breakdown = {};
  var bi = 0;
  while (bi < brRows.length) {
    var brName = brRows[bi].branch;
    var cntResult = await dbPool.query(
      'SELECT COUNT(*) as cnt FROM students WHERE branch = ?', [brName]
    );
    breakdown[brName] = cntResult[0][0].cnt;
    bi = bi + 1;
  }
  return breakdown;
}

/* ========== DASHBOARD VIEW ========== */
async function serveDashboardView(webReq, webRes) {
  var facId = webReq.session.user.id;
  var stats = await collectDashboardStats(facId);
  var branchData = await collectBranchBreakdown();

  webRes.render('dashboard', {
    total: stats.get('totalApps'),
    completed: stats.get('doneApps'),
    paid: stats.get('paidPositions'),
    unpaid: stats.get('unpaidPositions'),
    online: stats.get('remotePositions'),
    offline: stats.get('onsitePositions'),
    se: 0,
    te: 0,
    be: 0,
    branch_stats: JSON.stringify(branchData)
  });
}

/* ========== APPLICATIONS LIST ========== */
async function serveApplicationsList(webReq, webRes) {
  var facId = webReq.session.user.id;
  if (!facId) {
    webRes.redirect('/');
    return;
  }

  var selectParts = [
    'SELECT a.id, a.resume, a.status,',
    's.name as student_name, s.branch, s.semester,',
    'a.company_name, a.duration'
  ];
  var fromParts = [
    'FROM applications a',
    'JOIN students s ON a.student_id = s.id',
    'JOIN internships i ON a.internship_id = i.id'
  ];
  var fullSql = selectParts.concat(fromParts).join(' ');

  var result = await dbPool.query(fullSql);
  var records = result[0];
  webRes.render('applications', { applications: records });
}

/* ========== UPDATE APPLICATION STATUS ========== */
async function handleStatusChange(webReq, webRes) {
  var newStat = webReq.body.status;
  var appId = webReq.params.id;
  if (newStat && appId) {
    var updSql = 'UPDATE applications SET status = ? WHERE id = ?';
    await dbPool.query(updSql, [newStat, appId]);
    setSessionNotice(webReq.session, 'success', 'Status was changed successfully.');
  }
  webRes.redirect('/applications');
}

/* ========== CSV REPORT GENERATION ========== */
async function generateAndDownloadReport(webReq, webRes) {
  var facId = webReq.session.user.id;

  var selCols = [
    'SELECT a.id, a.status,',
    's.name as student_name, s.branch, s.semester,',
    'a.company_name, a.duration, a.internship_mode, a.paid_unpaid'
  ];
  var joinTables = [
    'FROM applications a',
    'JOIN students s ON a.student_id = s.id',
    'JOIN internships i ON a.internship_id = i.id'
  ];
  var rptSql = selCols.concat(joinTables).join(' ');

  var rptResult = await dbPool.query(rptSql);
  var rptRows = rptResult[0];

  /* Define CSV columns as an array of descriptor objects */
  var columnSpec = [];
  columnSpec.push({ id: 'id', title: 'Application ID' });
  columnSpec.push({ id: 'student_name', title: 'Student Name' });
  columnSpec.push({ id: 'branch', title: 'Branch' });
  columnSpec.push({ id: 'semester', title: 'Semester' });
  columnSpec.push({ id: 'company_name', title: 'Company' });
  columnSpec.push({ id: 'duration', title: 'Duration' });
  columnSpec.push({ id: 'internship_mode', title: 'Mode' });
  columnSpec.push({ id: 'paid_unpaid', title: 'Paid' });
  columnSpec.push({ id: 'status', title: 'Status' });

  var csvHandle = makeCsvWriter({
    path: 'internship_report.csv',
    header: columnSpec
  });

  await csvHandle.writeRecords(rptRows);
  webRes.download('internship_report.csv');
}

/* ========== STATIC FILE SERVER ========== */
function serveUploadedFile(webReq, webRes) {
  var nodePath = require('path');
  var targetName = webReq.params.filename;
  if (!targetName) {
    webRes.status(404).send('Requested file does not exist.');
    return;
  }
  var absLocation = nodePath.join(__dirname, 'static', 'uploads', targetName);
  webRes.sendFile(absLocation);
}

/* ========== PUBLIC API ========== */
module.exports = {
  serveHomeListing: serveHomeListing,
  serveLoginPage: serveLoginPage,
  handleLoginSubmission: handleLoginSubmission,
  serveLearnerSignupPage: serveLearnerSignupPage,
  handleLearnerSignup: handleLearnerSignup,
  serveInstructorSignupPage: serveInstructorSignupPage,
  handleInstructorSignup: handleInstructorSignup,
  handleSignOut: handleSignOut,
  servePostingForm: servePostingForm,
  handleNewPosting: handleNewPosting,
  handlePostingRemoval: handlePostingRemoval,
  handleApplicationSubmission: handleApplicationSubmission,
  serveDashboardView: serveDashboardView,
  serveApplicationsList: serveApplicationsList,
  handleStatusChange: handleStatusChange,
  generateAndDownloadReport: generateAndDownloadReport,
  serveUploadedFile: serveUploadedFile
};
