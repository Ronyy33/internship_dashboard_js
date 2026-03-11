const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'D!et0fuck'
        });
        console.log(`SUCCESS!`);
        await conn.query('CREATE DATABASE IF NOT EXISTS internship_db;');
        console.log('Database internship_db created or already exists.');
        await conn.end();
        process.exit(0);
    } catch (error) {
        console.log(`Failed: ${error.message}`);
        process.exit(1);
    }
}

testConnection();
