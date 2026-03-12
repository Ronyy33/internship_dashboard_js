

var injectAlertContext = function (ctx, reply, proceed) {
  if (!ctx.session) {
    proceed();
    return;
  }


  var alertMapping = [
    ['success', 'successMsg'],
    ['error', 'errorMsg'],
    ['warning', 'warningMsg']
  ];

  alertMapping.forEach(function (pair) {
    var sessionKey = pair[0];
    var localKey = pair[1];
    var stored = ctx.session[sessionKey];
    reply.locals[localKey] = (stored !== undefined && stored !== null) ? stored : null;
    ctx.session[sessionKey] = null;
  });


  reply.locals.user = ctx.session.user || null;
  reply.locals.request = ctx;
  proceed();
};

var enforceAuthentication = function (ctx, reply, proceed) {
  var sessionMissing = !ctx.session;
  var userMissing = sessionMissing || !ctx.session.user;
  if (userMissing) {
    ctx.session.error = 'You must sign in before continuing.';
    reply.redirect('/login');
    return;
  }
  proceed();
};

var enforceProfessorAccess = function (ctx, reply, proceed) {
  var noSession = !ctx.session || !ctx.session.user;
  if (noSession) {
    ctx.session.error = 'This area is restricted to faculty members.';
    reply.redirect('/');
    return;
  }
  var currentRole = ctx.session.user.role;
  if (currentRole !== 'faculty') {
    ctx.session.error = 'This area is restricted to faculty members.';
    reply.redirect('/');
    return;
  }
  proceed();
};

var enforceStudentAccess = function (ctx, reply, proceed) {
  if (!ctx.session || !ctx.session.user) {
    ctx.session.error = 'Only students are allowed to view this page.';
    reply.redirect('/');
    return;
  }
  if (ctx.session.user.role !== 'student') {
    ctx.session.error = 'Only students are allowed to view this page.';
    reply.redirect('/');
    return;
  }
  proceed();
};

var storeAlert = function (sessionRef, alertKind, alertText) {
  if (!sessionRef || !alertKind || !alertText) return;
  sessionRef[alertKind] = alertText;
};

module.exports = {
  attachFlashLocals: injectAlertContext,
  requireAuthentication: enforceAuthentication,
  requireInstructorRole: enforceProfessorAccess,
  requireLearnerRole: enforceStudentAccess,
  setSessionNotice: storeAlert
};
