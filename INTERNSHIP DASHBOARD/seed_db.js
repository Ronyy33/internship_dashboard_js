const mysqlAdapter = require('mysql2/promise');

const poolOpts = {
  host: 'localhost',
  user: 'root',
  password: 'D!et0fuck',
  database: 'internship_db'
};
const connectionPool = mysqlAdapter.createPool(Object.assign({}, poolOpts, { waitForConnections: true, connectionLimit: 10, queueLimit: 0 }));

const RAW_DATA = [
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

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DOMAINS = ['Software Development', 'Data Science', 'Machine Learning', 'Cyber Security', 'Cloud Computing', 'Embedded Systems', 'QA Automation', 'Web Development'];
const MODES = ['Online', 'Offline', 'Hybrid'];
const PAID_STATUS = ['Paid', 'Unpaid'];
const SEMESTERS = ['SEM1', 'SEM2', 'SEM3', 'SEM4', 'SEM5', 'SEM6', 'SEM7', 'SEM8'];
const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'];

async function runSeed() {
  console.log("Starting DB seeding...");
  
  // Ensure we have a faculty member
  let [facultyRows] = await connectionPool.query("SELECT id FROM faculty LIMIT 1");
  let facultyId;
  
  if (facultyRows.length === 0) {
    const insertFac = "INSERT INTO faculty (name, email, password, department) VALUES ('Dr. Pradeep Kumar', 'pradeep@college.edu', 'hashedpassword', 'Computer Science')";
    const [res] = await connectionPool.query(insertFac);
    facultyId = res.insertId;
    console.log("Created default faculty");
  } else {
    facultyId = facultyRows[0].id;
  }

  const internshipCache = {}; // key: "company|duration", val: internshipId
  
  for (let record of RAW_DATA) {
    const [company, studentName, duration] = record;
    
    // Create or get internship
    const internKey = `${company}|${duration}`;
    let internshipId;
    
    let paidSt = getRandomItem(PAID_STATUS);
    let modeSt = getRandomItem(MODES);
    let domainSt = getRandomItem(DOMAINS);
    
    if (internshipCache[internKey]) {
      internshipId = internshipCache[internKey];
    } else {
      const q = "INSERT INTO internships (faculty_id, domain, company_name, contact, eligibility, duration, paid_or_unpaid, internship_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const params = [
        facultyId,
        domainSt,
        company,
        "hr@" + company.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com",
        "CS/IT Students",
        duration,
        paidSt,
        modeSt
      ];
      const [iRes] = await connectionPool.query(q, params);
      internshipId = iRes.insertId;
      internshipCache[internKey] = internshipId;
    }
    
    // Create student
    const email = studentName.toLowerCase().replace(/[^a-z0-9]/g, '') + "@student.edu";
    const prn = "PRN" + Math.floor(Math.random() * 100000000);
    const sem = getRandomItem(SEMESTERS);
    const branch = getRandomItem(BRANCHES);
    const div = getRandomItem(['A', 'B', 'C']);
    
    // Check if student exists (some students like Rishi Harish Sharma appear twice)
    let [stuExists] = await connectionPool.query("SELECT id FROM students WHERE name = ?", [studentName]);
    let studentId;
    
    if (stuExists.length > 0) {
      studentId = stuExists[0].id;
    } else {
      const qStu = "INSERT INTO students (name, email, password, PRN, division, semester, branch) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const paramsStu = [studentName, email, "hashedpassword", prn, div, sem, branch];
      const [sRes] = await connectionPool.query(qStu, paramsStu);
      studentId = sRes.insertId;
    }
    
    // Create application
    const qApp = "INSERT INTO applications (student_id, internship_id, resume, internship_mode, domain, company_name, duration, paid_unpaid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')";
    const paramsApp = [
      studentId, 
      internshipId, 
      "uploads/default_resume.pdf", 
      modeSt, 
      domainSt, 
      company, 
      duration, 
      paidSt
    ];
    await connectionPool.query(qApp, paramsApp);
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

runSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
