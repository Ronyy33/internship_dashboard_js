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
                branch VARCHAR(50) NOT NULL,
                year VARCHAR(10) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE
            )
        `);

        // Internships table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS internships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company VARCHAR(100) NOT NULL,
                faculty VARCHAR(100) NOT NULL,
                eligibility VARCHAR(50) NOT NULL,
                duration VARCHAR(50) NOT NULL,
                paid VARCHAR(10) NOT NULL,
                mode VARCHAR(20) NOT NULL
            )
        `);

        // Applications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                internship_id INT NOT NULL,
                offer_letter VARCHAR(200) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'applied',
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
