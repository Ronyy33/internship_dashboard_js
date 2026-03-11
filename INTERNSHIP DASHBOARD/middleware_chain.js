/* Middleware functions for authentication, authorization, and flash messages */

function attachFlashLocals(webReq, webRes, continueChain) {
  /* Guard: if session is missing, skip flash logic entirely */
  if (webReq.session === null || webReq.session === undefined) {
    continueChain();
    return;
  }

  /* Map session keys to response local variables */
  const msgKeyPairs = {
    success: 'successMsg',
    error: 'errorMsg',
    warning: 'warningMsg'
  };
  const pairKeys = Object.keys(msgKeyPairs);
  let ci = 0;
  while (ci < pairKeys.length) {
    const sessKey = pairKeys[ci];
    const viewKey = msgKeyPairs[sessKey];
    const rawValue = webReq.session[sessKey];
    if (rawValue !== undefined && rawValue !== null) {
      webRes.locals[viewKey] = rawValue;
    } else {
      webRes.locals[viewKey] = null;
    }
    webReq.session[sessKey] = null;
    ci = ci + 1;
  }

  /* Expose the authenticated user and the request object to views */
  if (webReq.session.user) {
    webRes.locals.user = webReq.session.user;
  } else {
    webRes.locals.user = null;
  }
  webRes.locals.request = webReq;
  continueChain();
}

function requireAuthentication(webReq, webRes, continueChain) {
  if (!webReq.session || !webReq.session.user) {
    webReq.session.error = 'You must sign in before continuing.';
    webRes.redirect('/login');
    return;
  }
  continueChain();
}

function requireInstructorRole(webReq, webRes, continueChain) {
  /* First ensure a session with a user exists */
  if (!webReq.session || !webReq.session.user) {
    webReq.session.error = 'This area is restricted to faculty members.';
    webRes.redirect('/');
    return;
  }
  /* Then verify the role is correct */
  const assignedRole = webReq.session.user.role;
  if (assignedRole !== 'faculty') {
    webReq.session.error = 'This area is restricted to faculty members.';
    webRes.redirect('/');
    return;
  }
  continueChain();
}

function requireLearnerRole(webReq, webRes, continueChain) {
  if (!webReq.session || !webReq.session.user) {
    webReq.session.error = 'Only students are allowed to view this page.';
    webRes.redirect('/');
    return;
  }
  const assignedRole = webReq.session.user.role;
  if (assignedRole !== 'student') {
    webReq.session.error = 'Only students are allowed to view this page.';
    webRes.redirect('/');
    return;
  }
  continueChain();
}

function setSessionNotice(sessObj, category, content) {
  if (sessObj && category && content) {
    sessObj[category] = content;
  }
}

module.exports = {
  attachFlashLocals: attachFlashLocals,
  requireAuthentication: requireAuthentication,
  requireInstructorRole: requireInstructorRole,
  requireLearnerRole: requireLearnerRole,
  setSessionNotice: setSessionNotice
};
