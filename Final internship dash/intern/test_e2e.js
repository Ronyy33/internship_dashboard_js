const pool = require('./database.js');

async function test() {
  try {
    const fRes = await pool.query("INSERT INTO faculty (name, email, password, department) VALUES ('Fac E2E 2', 'fac2@e2e.com', '$2a$10$abcdefghijklmnopqrstuv', 'CS')");
    const fId = fRes[0].insertId;

    const iRes = await pool.query("INSERT INTO internships (faculty_id, domain, company_name, contact, eligibility, duration, paid_or_unpaid, internship_mode, industry_mentor, start_date, end_date) VALUES (?, 'Web Development', 'Google E2E 2', 'hr', 'na', '15 days', 'Paid', 'Online', 'Industry Mentor XYZ', '2026-06-01', '2026-06-16')", [fId]);
    const iId = iRes[0].insertId;

    const sRes = await pool.query("INSERT INTO students (name, email, password, PRN, division, semester, branch) VALUES ('Stu E2E 2', 'stu2@e2e.com', '$2a$10$abcdefghijklmnopqrstuv', 'PRN-888', 'A', '6', 'CS')");
    const sId = sRes[0].insertId;

    await pool.query("INSERT INTO applications (student_id, internship_id, resume, internship_mode, domain, company_name, duration, paid_unpaid, faculty_mentor, status) VALUES (?, ?, 'res.pdf', 'Online', 'Web Development', 'Google E2E 2', '15 days', 'Paid', 'Faculty Mentor ABC', 'Completed')", [sId, iId]);

    console.log("Mock data inserted.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
