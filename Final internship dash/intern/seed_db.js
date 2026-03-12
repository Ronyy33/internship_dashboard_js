/* Populate Records - seeds the database with sample internships, students, and applications */
var mysql2Lib = require('mysql2/promise');

var credentials = {
  host: 'localhost',
  user: 'root',
  password: 'admin1234',
  database: 'internship_db'
};
var poolExtras = { waitForConnections: true, connectionLimit: 10, queueLimit: 0 };
var mergedSettings = Object.assign({}, credentials, poolExtras);
var sqlLink = mysql2Lib.createPool(mergedSettings);

var SAMPLE_ENTRIES = [
  ["Adyanta semiconductor", "Nikhil Vijay Patil", "3 Month"],
  ["Adyanta semiconductor", "Abhishek Ramesh Kale", "3 Month"],
  ["Adyanta semiconductor", "Robin Villyam Coutinho", "3 Month"],
  ["Adyanta semiconductor", "Vedika Narendra Sule", "3 Month"],
  ["ARAI", "Aryan Rahul Mane", "3 Month"],
  ["Bentork LLP", "Suhani Mane", "3 Month"],
  ["BINARY BIRD", "Rishi Harish Sharma", "2 Month"],
  ["Bioinformatics department SPPU", "Gunjal Prajakta Anand", "3 Month"],
  ["Brose India", "Anshul Dekate", "3 Month"],
  ["Codtech It Solutions Pvt. Ltd Information Technology Services", "Vaidehi Avinash Magare", "1 Month"],
  ["DRDO R&DE(E), Dighi, Pune, Maharashtra - 411015", "Aatish Dilip More", "6 Month"],
  ["Ebix Cash Financial Technologies", "Hrutanshu Kurankar", "1 Month"],
  ["Equations Work", "Shravani Atul Barathe", "3 Month"],
  ["Equations Work", "Adarsh Kasliwal", "3 Month"],
  ["Hilwitz Private Limited", "Aditya Ajitrao Kulkarni", "12 Month"],
  ["Indio Networks", "Anuj Gulavani", "12 Month"],
  ["Indio Networks", "Varad Vilas Marne", "12 Month"],
  ["Indio Networks", "Rutuparna Shende", "12 Month"],
  ["InlighnX global pvt. Ltd.", "Pranav Sanjay Raut", "1 Month"],
  ["IVC Ventures", "Parth kadam", "8 Month"],
  ["IVC Ventures", "Shweta Ingole", "8 Month"],
  ["IVC Ventures", "Lavesh Akhadkar", "8 Month"],
  ["IVC Ventures", "Bhushan Anokar", "6 Month"],
  ["Kirtane & Pandit LLP", "Omkar Ashish Deodhar", "6 Month"],
  ["Nexarge services Pvt.Ltd.", "Atharva Karval", "3 Month"],
  ["Nexarge services Pvt.Ltd.", "Rokade Saurabh Tanhaji", "3 Month"],
  ["PGAGI consultancy PVT LTd", "Esha Ratnaparkhi", "6 Month"],
  ["PPC", "Sanica Mayna", "6 Month"],
  ["R2 Talentxplore & Research Pvt ltd", "Manas Choudhari", "12 Month"],
  ["R2 Talentxplore & Research Pvt ltd", "Anuj Arun Dengale", "12 Month"],
  ["Socialease Pvt ltd", "Lavale Vedant Sachin", "1 Month"],
  ["Sportvot", "Parth Keshatwar", "5 Month"],
  ["Toro Technology Center India LLP", "Rishi Harish Sharma", "6 Month"],
  ["Sylwen Investments", "Manas Siddharth Deshpande", "6 Month"],
  ["Zentrixel", "Anvita Kashikar", "4 Month"]
];

function pickRandom(collection) {
  var idx = Math.floor(Math.random() * collection.length);
  return collection[idx];
}

var DOMAIN_OPTIONS = ['Software Development', 'Data Science', 'Machine Learning', 'Cyber Security', 'Cloud Computing', 'Embedded Systems', 'QA Automation', 'Web Development'];
var MODE_OPTIONS = ['Online', 'Offline', 'Hybrid'];
var COMPENSATION_OPTIONS = ['Paid', 'Unpaid'];
var SEM_OPTIONS = ['SEM1', 'SEM2', 'SEM3', 'SEM4', 'SEM5', 'SEM6', 'SEM7', 'SEM8'];
var DEPT_OPTIONS = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'];

async function executeSeed() {
  console.log("Starting DB seeding...");
  
  var facQuery = await sqlLink.query("SELECT id FROM faculty LIMIT 1");
  var facRows = facQuery[0];
  var professorId;
  
  if (facRows.length === 0) {
    var createFac = "INSERT INTO faculty (name, email, password, department) VALUES ('Dr. Pradeep Kumar', 'pradeep@college.edu', 'hashedpassword', 'Computer Science')";
    var facResult = await sqlLink.query(createFac);
    professorId = facResult[0].insertId;
    console.log("Created default faculty");
  } else {
    professorId = facRows[0].id;
  }

  var opportunityIndex = {};
  
  for (var r = 0; r < SAMPLE_ENTRIES.length; r += 1) {
    var entry = SAMPLE_ENTRIES[r];
    var orgName = entry[0];
    var pupilName = entry[1];
    var timespan = entry[2];
    
    var cacheKey = orgName + '|' + timespan;
    var opportunityId;
    
    var compensationType = pickRandom(COMPENSATION_OPTIONS);
    var deliveryMode = pickRandom(MODE_OPTIONS);
    var fieldDomain = pickRandom(DOMAIN_OPTIONS);
    
    if (opportunityIndex[cacheKey]) {
      opportunityId = opportunityIndex[cacheKey];
    } else {
      var sanitizedOrg = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');
      var insertOp = "INSERT INTO internships (faculty_id, domain, company_name, contact, eligibility, duration, paid_or_unpaid, internship_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      var opParams = [
        professorId,
        fieldDomain,
        orgName,
        "hr@" + sanitizedOrg + ".com",
        "CS/IT Students",
        timespan,
        compensationType,
        deliveryMode
      ];
      var opResult = await sqlLink.query(insertOp, opParams);
      opportunityId = opResult[0].insertId;
      opportunityIndex[cacheKey] = opportunityId;
    }
    
    var sanitizedName = pupilName.toLowerCase().replace(/[^a-z0-9]/g, '');
    var emailAddr = sanitizedName + "@student.edu";
    var prnCode = "PRN" + Math.floor(Math.random() * 100000000);
    var semChoice = pickRandom(SEM_OPTIONS);
    var deptChoice = pickRandom(DEPT_OPTIONS);
    var divChoice = pickRandom(['A', 'B', 'C']);
    
    var existCheck = await sqlLink.query("SELECT id FROM students WHERE name = ?", [pupilName]);
    var existRows = existCheck[0];
    var pupilId;
    
    if (existRows.length > 0) {
      pupilId = existRows[0].id;
    } else {
      var insertPupil = "INSERT INTO students (name, email, password, PRN, division, semester, branch) VALUES (?, ?, ?, ?, ?, ?, ?)";
      var pupilParams = [pupilName, emailAddr, "hashedpassword", prnCode, divChoice, semChoice, deptChoice];
      var pupilResult = await sqlLink.query(insertPupil, pupilParams);
      pupilId = pupilResult[0].insertId;
    }
    
    var insertApp = "INSERT INTO applications (student_id, internship_id, resume, internship_mode, domain, company_name, duration, paid_unpaid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')";
    var appParams = [
      pupilId, 
      opportunityId, 
      "uploads/default_resume.pdf", 
      deliveryMode, 
      fieldDomain, 
      orgName, 
      timespan, 
      compensationType
    ];
    await sqlLink.query(insertApp, appParams);
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

executeSeed().catch(function (err) {
  console.error(err);
  process.exit(1);
});
