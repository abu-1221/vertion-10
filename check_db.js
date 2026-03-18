const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function check() {
    const db = await open({
        filename: path.join(__dirname, 'backend', 'jmc_placement_portal.sqlite'),
        driver: sqlite3.Database
    });
    const students = await db.all('SELECT * FROM Students LIMIT 5');
    console.log(JSON.stringify(students, null, 2));
}
check();
