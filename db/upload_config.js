/* File Upload Configuration Module */
const multerPkg = require('multer');
const nodePath = require('path');
const fileSystem = require('fs');

/* Compute target folder for uploaded resumes */
const resumeDir = nodePath.join(__dirname, 'static', 'uploads');

/* Ensure upload directory exists before accepting files */
const dirPresent = fileSystem.existsSync(resumeDir);
if (!dirPresent) {
  fileSystem.mkdirSync(resumeDir, { recursive: true });
}

/* Configure how uploaded files are named and stored */
const storageStrategy = multerPkg.diskStorage({
  destination: function (_httpReq, _uploadedDoc, cb) {
    cb(null, resumeDir);
  },
  filename: function (httpReq, uploadedDoc, cb) {
    /* Determine the user and internship identifiers */
    let uid = 'unknown';
    if (httpReq.session && httpReq.session.user) {
      uid = httpReq.session.user.id;
    }
    let iid = 'none';
    if (httpReq.params && httpReq.params.id) {
      iid = httpReq.params.id;
    }
    /* Compose a unique filename from user and context */
    const assembled = [
      'student', uid, 'internship', iid, uploadedDoc.originalname
    ].join('_');
    cb(null, assembled);
  }
});

/* Only allow PDF mime type for resume uploads */
const pdfOnlyFilter = function (_httpReq, uploadedDoc, cb) {
  const allowed = (uploadedDoc.mimetype === 'application/pdf');
  if (allowed) {
    cb(null, true);
  } else {
    cb(new Error('Resume must be a PDF document.'), false);
  }
};

const fileUploader = multerPkg({
  storage: storageStrategy,
  fileFilter: pdfOnlyFilter
});

module.exports = { fileUploader: fileUploader, assetUploadDir: resumeDir };
