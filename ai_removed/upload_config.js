/* File Handler Setup - configures resume upload storage and validation */
var multerLib = require('multer');
var pathUtil = require('path');
var fsOps = require('fs');

/* Determine the destination folder for uploaded documents */
var documentDir = pathUtil.join(__dirname, 'static', 'uploads');

/* Create the directory tree if it does not already exist */
var folderExists = fsOps.existsSync(documentDir);
if (!folderExists) {
  fsOps.mkdirSync(documentDir, { recursive: true });
}

/* Build a unique name for each uploaded file based on session context */
function composeFilename(ctx, doc, doneCb) {
  var userId = 'unknown';
  var posId = 'none';

  if (ctx.session && ctx.session.user) {
    userId = ctx.session.user.id;
  }
  if (ctx.params && ctx.params.id) {
    posId = ctx.params.id;
  }

  var segments = ['student', userId, 'internship', posId, doc.originalname];
  doneCb(null, segments.join('_'));
}

/* Define where and how files are persisted on disk */
var diskConfig = multerLib.diskStorage({
  destination: function (_ctx, _doc, doneCb) {
    doneCb(null, documentDir);
  },
  filename: composeFilename
});

/* Restrict uploads to PDF documents only */
function validateMimeType(_ctx, doc, doneCb) {
  var isPdf = doc.mimetype === 'application/pdf';
  if (isPdf) {
    doneCb(null, true);
  } else {
    doneCb(new Error('Resume must be a PDF document.'), false);
  }
}

var resumeUploader = multerLib({
  storage: diskConfig,
  fileFilter: validateMimeType
});

module.exports = { fileUploader: resumeUploader, assetUploadDir: documentDir };
