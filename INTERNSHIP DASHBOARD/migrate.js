const mysql = require('mysql2/promise');
const database = require('./database');

async function migrate() {
    console.log("Starting migration...");
    const pool = database; // Uses existing database.js pool
    
    // Disable FK checks to drop tables
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop existing tables
    await pool.query('DROP TABLE IF EXISTS applications');
    await pool.query('DROP TABLE IF EXISTS internships');
    await pool.query('DROP TABLE IF EXISTS students');
    await pool.query('DROP TABLE IF EXISTS faculty');
    
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log("Old tables dropped. The database.js script will recreate them on require.");
    process.exit(0);
}

migrate();
