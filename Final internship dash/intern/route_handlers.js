/* Endpoint Controllers - all route handling logic for the application */
const hashLib = require('bcryptjs');
var { createObjectCsvWriter: buildCsvExporter } = require('csv-writer');
var sqlLink = require('./db_connector');
var { setSessionNotice: storeAlert } = require('./middleware_chain');

/* ========== LANDING PAGE ========== */
var renderLandingPage = async function (ctx, reply) {
  try {
    var queryOutput = await sqlLink.query('SELECT * FROM internships');
    var opportunities = queryOutput[0];
    reply.render('index', { internships: opportunities });
  } catch (loadErr) {
    console.error('Failed to retrieve landing data:', loadErr);
    reply.status(500).send('An unexpected error occurred.');
  }
};

/* AUTHENTICATION SCREENS  */
var renderSignInForm = function (_ctx, reply) {
  reply.render('login');
};

/* Helper: locate user record in the correct table */
async function locateAccount(tableName, emailAddr) {
  var stmt = 'SELECT * FROM ' + tableName + ' WHERE email = ?';
  var outcome = await sqlLink.query(stmt, [emailAddr]);
  return outcome[0];
}

/* Helper: validate password hash */
async function verifySecret(plaintext, hashed) {
  return await hashLib.compare(plaintext, hashed);
}

var processCredentials = async function (ctx, reply) {
  var submittedEmail = ctx.body.email;
  var submittedPass = ctx.body.password;
  var selectedRole = ctx.body.role;

  /* Reject if any credential field is blank */
  if (!submittedEmail || !submittedPass || !selectedRole) {
    storeAlert(ctx.session, 'error', 'Credentials are incorrect or missing.');
    reply.redirect('/login');
    return;
  }

  /* Map role to the appropriate database table */
  var targetTable = (selectedRole === 'faculty') ? 'faculty' : 'students';

  try {
    var matchedRows = await locateAccount(targetTable, submittedEmail);

    if (matchedRows.length === 0) {
      storeAlert(ctx.session, 'error', 'Credentials are incorrect or missing.');
      reply.redirect('/login');
      return;
    }

    var accountData = matchedRows[0];
    var passwordOk = await verifySecret(submittedPass, accountData.password);

    if (!passwordOk) {
      storeAlert(ctx.session, 'error', 'Credentials are incorrect or missing.');
      reply.redirect('/login');
      return;
    }

    /* Persist identity in the session store */
    ctx.session.user = {
      id: accountData.id,
      name: accountData.name,
      role: selectedRole
    };
    storeAlert(ctx.session, 'success', 'Welcome back! You are now signed in.');

    var landingPath = (selectedRole === 'faculty') ? '/dashboard' : '/';
    reply.redirect(landingPath);
  } catch (authErr) {
    storeAlert(ctx.session, 'error', 'Credentials are incorrect or missing.');
    reply.redirect('/login');
  }
};

/* ========== STUDENT REGISTRATION ========== */
var renderPupilEnrollForm = function (_ctx, reply) {
  reply.render('register_student');
};

var processPupilEnrollment = async function (ctx, reply) {
  var formData = ctx.body;
  if (!formData || !formData.name || !formData.email || !formData.password) {
    storeAlert(ctx.session, 'error', 'That email is taken or some fields are invalid.');
    reply.redirect('/register/student');
    return;
  }

  var securedPw = await hashLib.hash(formData.password, 10);

  try {
    var insertStmt =
      'INSERT INTO students' +
      ' (name, email, password, PRN, division, semester, branch)' +
      ' VALUES (?, ?, ?, ?, ?, ?, ?)';
    var fieldValues = [
      formData.name, formData.email, securedPw,
      formData.PRN, formData.division,
      formData.semester, formData.branch
    ];
    await sqlLink.query(insertStmt, fieldValues);
    storeAlert(ctx.session, 'success', 'Account created! Please sign in now.');
    reply.redirect('/login');
  } catch (enrollErr) {
    storeAlert(ctx.session, 'error', 'That email is taken or some fields are invalid.');
    reply.redirect('/register/student');
  }
};

/* ========== FACULTY REGISTRATION ========== */
var renderProfessorEnrollForm = function (_ctx, reply) {
  reply.render('register_faculty');
};

var processProfessorEnrollment = async function (ctx, reply) {
  var formData = ctx.body;
  if (!formData || !formData.name || !formData.email || !formData.password) {
    storeAlert(ctx.session, 'error', 'That email is taken or some fields are invalid.');
    reply.redirect('/register/faculty');
    return;
  }

  var securedPw = await hashLib.hash(formData.password, 10);

  try {
    var insertStmt =
      'INSERT INTO faculty (name, email, password, department)' +
      ' VALUES (?, ?, ?, ?)';
    await sqlLink.query(insertStmt, [
      formData.name, formData.email,
      securedPw, formData.department
    ]);
    storeAlert(ctx.session, 'success', 'Account created! Please sign in now.');
    reply.redirect('/login');
  } catch (enrollErr) {
    storeAlert(ctx.session, 'error', 'That email is taken or some fields are invalid.');
    reply.redirect('/register/faculty');
  }
};

/* ========== SIGN OUT ========== */
var terminateSession = function (ctx, reply) {
  ctx.session.destroy();
  reply.redirect('/');
};

/* ========== CREATE INTERNSHIP ========== */
var renderOpportunityForm = async function (ctx, reply) {
  var professorId = ctx.session.user.id;
  var lookupResult = await sqlLink.query(
    'SELECT * FROM internships WHERE faculty_id = ?', [professorId]
  );
  var currentListings = lookupResult[0];
  reply.render('post_internship', { internships: currentListings });
};

var processNewOpportunity = async function (ctx, reply) {
  var payload = ctx.body;
  if (!payload) {
    storeAlert(ctx.session, 'error', 'Submission data was empty.');
    reply.redirect('/post');
    return;
  }

  var insertStmt =
    'INSERT INTO internships' +
    ' (faculty_id, domain, company_name, contact,' +
    ' eligibility, duration, paid_or_unpaid, internship_mode,' +
    ' industry_mentor, start_date, end_date)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  var columnVals = [
    ctx.session.user.id, payload.domain,
    payload.company_name, payload.contact, payload.eligibility,
    payload.duration, payload.paid_or_unpaid, payload.internship_mode,
    payload.industry_mentor || null, payload.start_date || null, payload.end_date || null
  ];

  await sqlLink.query(insertStmt, columnVals);
  storeAlert(ctx.session, 'success', 'New internship listing has been published!');
  reply.redirect('/post');
};

/* ========== REMOVE INTERNSHIP ========== */
var removeOpportunity = async function (ctx, reply) {
  var listingId = ctx.params.id;
  var ownerId = ctx.session.user.id;
  if (listingId && ownerId) {
    var deleteStmt = 'DELETE FROM internships WHERE id = ? AND faculty_id = ?';
    await sqlLink.query(deleteStmt, [listingId, ownerId]);
  }
  storeAlert(ctx.session, 'success', 'The internship listing was removed.');
  reply.redirect('/dashboard');
};

/* ========== STUDENT APPLICATION ========== */
var processApplication = async function (ctx, reply) {
  var pupilId = ctx.session.user.id;
  var opportunityId = ctx.params.id;

  /* Validate that a document was attached */
  if (!ctx.file) {
    storeAlert(ctx.session, 'error', 'A resume file in PDF format is required.');
    reply.redirect('/');
    return;
  }

  /* Guard against duplicate submissions */
  var dupCheck = await sqlLink.query(
    'SELECT * FROM applications WHERE student_id = ? AND internship_id = ?',
    [pupilId, opportunityId]
  );
  if (dupCheck[0].length > 0) {
    storeAlert(ctx.session, 'warning', 'You already submitted an application for this one.');
    reply.redirect('/');
    return;
  }

  /* Retrieve the opportunity details for denormalized storage */
  var opLookup = await sqlLink.query(
    'SELECT * FROM internships WHERE id = ?', [opportunityId]
  );
  var opRecords = opLookup[0];
  if (opRecords.length === 0) {
    storeAlert(ctx.session, 'error', 'That position could not be found.');
    reply.redirect('/');
    return;
  }

  var opDetail = opRecords[0];
  var docLocation = 'static/uploads/' + ctx.file.filename;

  var appStmt =
    'INSERT INTO applications' +
    ' (student_id, internship_id, resume, internship_mode,' +
    ' domain, company_name, duration, paid_unpaid,' +
    ' faculty_mentor, status)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  var appVals = [
    pupilId, opportunityId, docLocation,
    opDetail.internship_mode, opDetail.domain,
    opDetail.company_name, opDetail.duration,
    opDetail.paid_or_unpaid,
    ctx.body.faculty_mentor || null,
    'Applied'
  ];

  await sqlLink.query(appStmt, appVals);
  storeAlert(ctx.session, 'success', 'Your application was submitted!');
  reply.redirect('/');
};

/* ========== ANALYTICS HELPERS ========== */
function assembleMetricQueries() {
  var countPrefix = 'SELECT COUNT(*) as cnt FROM ';
  return [
    { tag: 'totalApps', stmt: countPrefix + 'applications', args: [] },
    { tag: 'doneApps', stmt: countPrefix + 'applications WHERE status = "Completed"', args: [] }
  ];
}

async function gatherMetrics() {
  var metricMap = {};
  var queries = assembleMetricQueries();
  for (var q = 0; q < queries.length; q += 1) {
    var spec = queries[q];
    var res = await sqlLink.query(spec.stmt, spec.args);
    metricMap[spec.tag] = res[0][0].cnt;
  }
  return metricMap;
}

async function computeBranchDistribution() {
  var branchResult = await sqlLink.query('SELECT DISTINCT branch FROM students');
  var branchRows = branchResult[0];
  var distribution = {};
  for (var b = 0; b < branchRows.length; b += 1) {
    var branchName = branchRows[b].branch;
    var cntRes = await sqlLink.query(
      'SELECT COUNT(*) as cnt FROM students WHERE branch = ?', [branchName]
    );
    distribution[branchName] = cntRes[0][0].cnt;
  }
  return distribution;
}

/* ========== DASHBOARD VIEW ========== */
var renderAnalytics = async function (ctx, reply) {
  var metrics = await gatherMetrics();
  var branchInfo = await computeBranchDistribution();

  var [paidData] = await sqlLink.query('SELECT paid_or_unpaid, COUNT(*) as count FROM internships GROUP BY paid_or_unpaid');
  var [modeData] = await sqlLink.query('SELECT internship_mode, COUNT(*) as count FROM internships GROUP BY internship_mode');
  var [domainData] = await sqlLink.query('SELECT domain, COUNT(*) as count FROM internships GROUP BY domain');

  /* Parse out the totals for Paid and Unpaid to power the top cards */
  var totalPaid = 0;
  var totalUnpaid = 0;
  paidData.forEach(row => {
    let lowerStr = (row.paid_or_unpaid || '').toLowerCase();
    if (lowerStr === 'paid') totalPaid += row.count;
    else if (lowerStr === 'unpaid') totalUnpaid += row.count;
  });

  reply.render('dashboard', {
    total: metrics.totalApps,
    completed: metrics.doneApps,
    paid: totalPaid,
    unpaid: totalUnpaid,
    paid_unpaid_data: JSON.stringify(paidData),
    mode_data: JSON.stringify(modeData),
    domain_data: JSON.stringify(domainData),
    branch_stats: JSON.stringify(branchInfo)
  });
};

/* ========== SUBMISSIONS TABLE ========== */
var displaySubmissions = async function (ctx, reply) {
  var professorId = ctx.session.user.id;
  if (!professorId) {
    reply.redirect('/');
    return;
  }

  var queryParts = [
    'SELECT a.id, a.resume, a.status, a.faculty_mentor,',
    's.name as student_name, s.PRN, s.division, s.branch, s.semester,',
    'i.company_name, i.domain, i.duration, i.industry_mentor, i.start_date, i.end_date, i.paid_or_unpaid, i.internship_mode',
    'FROM applications a',
    'JOIN students s ON a.student_id = s.id',
    'JOIN internships i ON a.internship_id = i.id'
  ];
  var combinedSql = queryParts.join(' ');

  var outcome = await sqlLink.query(combinedSql);
  var submissionRows = outcome[0];
  reply.render('applications', { applications: submissionRows });
};

/* ========== MODIFY APPLICATION STATUS ========== */
var modifySubmissionStatus = async function (ctx, reply) {
  var updatedStatus = ctx.body.status;
  var recordId = ctx.params.id;
  if (updatedStatus && recordId) {
    var updateStmt = 'UPDATE applications SET status = ? WHERE id = ?';
    await sqlLink.query(updateStmt, [updatedStatus, recordId]);
    storeAlert(ctx.session, 'success', 'Status was changed successfully.');
  }
  reply.redirect('/applications');
};

/* ========== CSV EXPORT ========== */
var exportToCsv = async function (ctx, reply) {
  var reportParts = [
    'SELECT a.id, a.status, a.faculty_mentor,',
    'i.internship_mode, i.paid_or_unpaid as paid_unpaid, i.company_name, i.domain, i.industry_mentor, i.start_date, i.end_date,',
    's.name as student_name, s.PRN, s.division, s.branch, s.semester',
    'FROM applications a',
    'JOIN students s ON a.student_id = s.id',
    'JOIN internships i ON a.internship_id = i.id'
  ];
  var reportSql = reportParts.join(' ');

  var reportResult = await sqlLink.query(reportSql);
  var dataRows = reportResult[0];

  /* Build CSV-ready rows with Sr. No and calculated Duration */
  var csvRows = [];
  for (var r = 0; r < dataRows.length; r += 1) {
    var row = dataRows[r];
    var calculatedDuration = '';
    if (row.start_date && row.end_date) {
      var startMs = new Date(row.start_date).getTime();
      var endMs = new Date(row.end_date).getTime();
      var diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      calculatedDuration = diffDays + ' days';
    }
    /* Format dates as DD-MM-YYYY for display */
    var fmtStart = '';
    var fmtEnd = '';
    if (row.start_date) {
      var sd = new Date(row.start_date);
      fmtStart = String(sd.getDate()).padStart(2, '0') + '-' + String(sd.getMonth() + 1).padStart(2, '0') + '-' + sd.getFullYear();
    }
    if (row.end_date) {
      var ed = new Date(row.end_date);
      fmtEnd = String(ed.getDate()).padStart(2, '0') + '-' + String(ed.getMonth() + 1).padStart(2, '0') + '-' + ed.getFullYear();
    }
    csvRows.push({
      sr_no: r + 1,
      prn: (row.PRN || '').trim(),
      name: (row.student_name || '').trim(),
      division: (row.division || '').trim(),
      faculty_mentor: (row.faculty_mentor || '').trim(),
      semester: (row.semester || '').trim(),
      branch: (row.branch || '').trim(),
      company: (row.company_name || '').trim(),
      domain: (row.domain || '').trim(),
      industry_mentor: (row.industry_mentor || '').trim(),
      start_date: fmtStart,
      end_date: fmtEnd,
      duration: calculatedDuration,
      mode: (row.internship_mode || '').trim(),
      paid_unpaid: (row.paid_unpaid || '').trim(),
      status: (row.status || '').trim()
    });
  }

  /* Define CSV column descriptors in strict order */
  var colDescriptors = [];
  [
    ['sr_no', 'Sr. No'],
    ['prn', 'PRN'],
    ['name', 'Name'],
    ['division', 'Division'],
    ['faculty_mentor', 'Faculty Mentor'],
    ['semester', 'Semester'],
    ['branch', 'Branch'],
    ['company', 'Company'],
    ['domain', 'Domain'],
    ['industry_mentor', 'Industry Mentor'],
    ['start_date', 'Start Date'],
    ['end_date', 'End Date'],
    ['duration', 'Duration'],
    ['mode', 'Mode'],
    ['paid_unpaid', 'Paid / Unpaid'],
    ['status', 'Status']
  ].forEach(function (pair) {
    colDescriptors.push({ id: pair[0], title: pair[1] });
  });

  var csvExporter = buildCsvExporter({
    path: 'internship_report.csv',
    header: colDescriptors
  });

  await csvExporter.writeRecords(csvRows);
  reply.download('internship_report.csv');
};

/* ========== FILE SERVING ========== */
var deliverUploadedFile = function (ctx, reply) {
  var pathUtil = require('path');
  var requestedName = ctx.params.filename;
  if (!requestedName) {
    reply.status(404).send('Requested file does not exist.');
    return;
  }
  var absolutePath = pathUtil.join(__dirname, 'static', 'uploads', requestedName);
  reply.sendFile(absolutePath);
};

/* ========== EXPORTED CONTROLLER MAP ========== */
module.exports = {
  serveHomeListing: renderLandingPage,
  serveLoginPage: renderSignInForm,
  handleLoginSubmission: processCredentials,
  serveLearnerSignupPage: renderPupilEnrollForm,
  handleLearnerSignup: processPupilEnrollment,
  serveInstructorSignupPage: renderProfessorEnrollForm,
  handleInstructorSignup: processProfessorEnrollment,
  handleSignOut: terminateSession,
  servePostingForm: renderOpportunityForm,
  handleNewPosting: processNewOpportunity,
  handlePostingRemoval: removeOpportunity,
  handleApplicationSubmission: processApplication,
  serveDashboardView: renderAnalytics,
  serveApplicationsList: displaySubmissions,
  handleStatusChange: modifySubmissionStatus,
  generateAndDownloadReport: exportToCsv,
  serveUploadedFile: deliverUploadedFile
};
