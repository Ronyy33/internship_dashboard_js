/* Application Bootstrap - wires middleware layers and binds URL endpoints */

var express = require('express');
var pathModule = require('path');
var sessionManager = require('express-session');
var layoutEngine = require('express-ejs-layouts');

var guards = require('./middleware_chain');
var controllers = require('./route_handlers');
var fileHandling = require('./upload_config');

var webapp = express();
var listenPort = 3000;

/* Register body parsing middleware before any route bindings */
webapp.use(express.urlencoded({ extended: true }));
webapp.use(express.json());

/* Configure session persistence with a fixed secret */
webapp.use(sessionManager({
  secret: 'super_secret_key',
  resave: false,
  saveUninitialized: true
}));

/* Mount public asset directory at /static path prefix */
webapp.use(
  '/static',
  express.static(pathModule.join(__dirname, 'static'))
);

/* Activate EJS layout support and set defaults */
webapp.use(layoutEngine);
webapp.set('view engine', 'ejs');
webapp.set('layout', 'layout');

/* Inject alert messages and user context into every response */
webapp.use(guards.attachFlashLocals);

/* ---- Open access routes ---- */
webapp.get('/', controllers.serveHomeListing);
webapp.get('/login', controllers.serveLoginPage);
webapp.post('/login', controllers.handleLoginSubmission);

/* ---- Student enrollment routes ---- */
webapp.get('/register/student', controllers.serveLearnerSignupPage);
webapp.post('/register/student', controllers.handleLearnerSignup);

/* ---- Faculty enrollment routes ---- */
webapp.get('/register/faculty', controllers.serveInstructorSignupPage);
webapp.post('/register/faculty', controllers.handleInstructorSignup);

/* ---- Session termination ---- */
webapp.get('/logout', controllers.handleSignOut);

/* ---- Faculty-gated routes ---- */
webapp.get('/post', guards.requireInstructorRole, controllers.servePostingForm);
webapp.post('/post', guards.requireInstructorRole, controllers.handleNewPosting);
webapp.post(
  '/delete_internship/:id',
  guards.requireInstructorRole,
  controllers.handlePostingRemoval
);
webapp.get('/dashboard', guards.requireInstructorRole, controllers.serveDashboardView);
webapp.get('/applications', guards.requireInstructorRole, controllers.serveApplicationsList);
webapp.post(
  '/applications/:id/update_status',
  guards.requireInstructorRole,
  controllers.handleStatusChange
);
webapp.get('/report', guards.requireInstructorRole, controllers.generateAndDownloadReport);

webapp.post(
  '/apply/:id',
  guards.requireLearnerRole,
  fileHandling.fileUploader.single('resume'),
  controllers.handleApplicationSubmission
);


webapp.get('/uploads/:filename', controllers.serveUploadedFile);


webapp.listen(listenPort, function () {
  console.log('HTTP listener active at port ' + listenPort);
});
