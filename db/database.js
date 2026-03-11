const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'D!et0fuck',
    database: 'internship_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        // Students table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                PRN VARCHAR(50) NOT NULL,
                division VARCHAR(10) NOT NULL,
                semester VARCHAR(10) NOT NULL,
                branch VARCHAR(50) NOT NULL
            )
        `);

        // Faculty table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS faculty (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                department VARCHAR(50) NOT NULL
            )
        `);

        // Internships table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS internships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                domain VARCHAR(100) NOT NULL,
                company_name VARCHAR(100) NOT NULL,
                contact VARCHAR(100) NOT NULL,
                eligibility VARCHAR(100),
                duration VARCHAR(50) NOT NULL,
                paid_or_unpaid VARCHAR(20) NOT NULL,
                internship_mode VARCHAR(20) NOT NULL,
                FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
            )
        `);

        // Applications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                internship_id INT NOT NULL,
                resume VARCHAR(200) NOT NULL,
                internship_mode VARCHAR(20) NOT NULL,
                domain VARCHAR(100) NOT NULL,
                company_name VARCHAR(100) NOT NULL,
                duration VARCHAR(50) NOT NULL,
                paid_unpaid VARCHAR(20) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Applied',
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
            )
        `);

        console.log("Database initialized successfully.");
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

// Ensure database is initialized
initDB();

module.exports = pool;
