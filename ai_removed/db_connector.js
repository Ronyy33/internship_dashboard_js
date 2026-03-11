/* Persistence Layer - establishes database link and bootstraps table schema */
var mysql2Lib = require('mysql2/promise');

/* Connection credentials bundled as a configuration map */
var connCfg = new Map();
connCfg.set('host', 'localhost');
connCfg.set('user', 'root');
connCfg.set('password', 'D!et0fuck');
connCfg.set('database', 'internship_db');

var cfgObj = {};
connCfg.forEach(function (val, key) { cfgObj[key] = val; });

var poolParams = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

Object.keys(poolParams).forEach(function (pk) {
  cfgObj[pk] = poolParams[pk];
});

var sqlLink = mysql2Lib.createPool(cfgObj);

/* Schema declarations stored as an array of tuples [alias, ddl] */
var tableDefinitions = [
  [
    'pupil_accounts',
    'CREATE TABLE IF NOT EXISTS students (' +
    ' id INT AUTO_INCREMENT PRIMARY KEY,' +
    ' name VARCHAR(100) NOT NULL,' +
    ' email VARCHAR(100) NOT NULL UNIQUE,' +
    ' password VARCHAR(255) NOT NULL,' +
    ' PRN VARCHAR(50) NOT NULL,' +
    ' division VARCHAR(10) NOT NULL,' +
    ' semester VARCHAR(10) NOT NULL,' +
    ' branch VARCHAR(50) NOT NULL' +
    ' )'
  ],
  [
    'professor_accounts',
    'CREATE TABLE IF NOT EXISTS faculty (' +
    ' id INT AUTO_INCREMENT PRIMARY KEY,' +
    ' name VARCHAR(100) NOT NULL,' +
    ' email VARCHAR(100) NOT NULL UNIQUE,' +
    ' password VARCHAR(255) NOT NULL,' +
    ' department VARCHAR(50) NOT NULL' +
    ' )'
  ],
  [
    'opportunity_entries',
    'CREATE TABLE IF NOT EXISTS internships (' +
    ' id INT AUTO_INCREMENT PRIMARY KEY,' +
    ' faculty_id INT NOT NULL,' +
    ' domain VARCHAR(100) NOT NULL,' +
    ' company_name VARCHAR(100) NOT NULL,' +
    ' contact VARCHAR(100) NOT NULL,' +
    ' eligibility VARCHAR(100),' +
    ' duration VARCHAR(50) NOT NULL,' +
    ' paid_or_unpaid VARCHAR(20) NOT NULL,' +
    ' internship_mode VARCHAR(20) NOT NULL,' +
    ' FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE' +
    ' )'
  ],
  [
    'submission_records',
    'CREATE TABLE IF NOT EXISTS applications (' +
    ' id INT AUTO_INCREMENT PRIMARY KEY,' +
    ' student_id INT NOT NULL,' +
    ' internship_id INT NOT NULL,' +
    ' resume VARCHAR(200) NOT NULL,' +
    ' internship_mode VARCHAR(20) NOT NULL,' +
    ' domain VARCHAR(100) NOT NULL,' +
    ' company_name VARCHAR(100) NOT NULL,' +
    ' duration VARCHAR(50) NOT NULL,' +
    ' paid_unpaid VARCHAR(20) NOT NULL,' +
    ' status VARCHAR(50) NOT NULL DEFAULT \'Applied\',' +
    ' FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,' +
    ' FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE' +
    ' )'
  ]
];

/* Execute each DDL statement in sequence */
var bootstrapSchema = async function () {
  var idx = 0;
  while (idx < tableDefinitions.length) {
    var pair = tableDefinitions[idx];
    var alias = pair[0];
    var ddlText = pair[1];
    try {
      await sqlLink.query(ddlText);
    } catch (schemaErr) {
      console.error('Schema creation failed for [' + alias + ']:', schemaErr);
    }
    idx += 1;
  }
  console.log('All database tables ready.');
};

bootstrapSchema();

module.exports = sqlLink;
