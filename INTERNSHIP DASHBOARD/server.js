/* Application Entry Point - Wires up middleware and route mapping */

const xpress = require('express');
const nodePath = require('path');
const sessLib = require('express-session');
const ejsLayoutPlugin = require('express-ejs-layouts');

const guardFns = require('./middleware_chain');
const routeMap = require('./route_handlers');
const uploadCfg = require('./upload_config');

const appInstance = xpress();
const srvPort = 3000;

/* Body parsers must be registered before route handlers */
appInstance.use(xpress.urlencoded({ extended: true }));
appInstance.use(xpress.json());

/* Session storage with a random secret token */
const sessOpts = {
  secret: 'super_secret_key',
  resave: false,
  saveUninitialized: true
};
appInstance.use(sessLib(sessOpts));

/* Serve assets from the static directory */
appInstance.use(
  '/static',
  xpress.static(nodePath.join(__dirname, 'static'))
);

/* Template engine setup */
appInstance.use(ejsLayoutPlugin);
appInstance.set('view engine', 'ejs');
appInstance.set('layout', 'layout');

/* Flash message + user context middleware */
appInstance.use(guardFns.attachFlashLocals);

/* ---- Publicly accessible endpoints ---- */
appInstance.get('/', routeMap.serveHomeListing);
appInstance.get('/login', routeMap.serveLoginPage);
appInstance.post('/login', routeMap.handleLoginSubmission);

/* ---- Learner registration endpoints ---- */
appInstance.get('/register/student', routeMap.serveLearnerSignupPage);
appInstance.post('/register/student', routeMap.handleLearnerSignup);

/* ---- Instructor registration endpoints ---- */
appInstance.get('/register/faculty', routeMap.serveInstructorSignupPage);
appInstance.post('/register/faculty', routeMap.handleInstructorSignup);

/* ---- Sign-out endpoint ---- */
appInstance.get('/logout', routeMap.handleSignOut);

/* ---- Instructor-protected endpoints ---- */
appInstance.get('/post', guardFns.requireInstructorRole, routeMap.servePostingForm);
appInstance.post('/post', guardFns.requireInstructorRole, routeMap.handleNewPosting);
appInstance.post(
  '/delete_internship/:id',
  guardFns.requireInstructorRole,
  routeMap.handlePostingRemoval
);
appInstance.get('/dashboard', guardFns.requireInstructorRole, routeMap.serveDashboardView);
appInstance.get('/applications', guardFns.requireInstructorRole, routeMap.serveApplicationsList);
appInstance.post(
  '/applications/:id/update_status',
  guardFns.requireInstructorRole,
  routeMap.handleStatusChange
);
appInstance.get('/report', guardFns.requireInstructorRole, routeMap.generateAndDownloadReport);

/* ---- Learner-protected endpoints ---- */
appInstance.post(
  '/apply/:id',
  guardFns.requireLearnerRole,
  uploadCfg.fileUploader.single('resume'),
  routeMap.handleApplicationSubmission
);

/* ---- Direct file download ---- */
appInstance.get('/uploads/:filename', routeMap.serveUploadedFile);

/* ---- Boot the HTTP server ---- */
appInstance.listen(srvPort, function () {
  console.log('HTTP listener active at port ' + srvPort);
});
