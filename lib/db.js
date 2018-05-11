const mysql = require("mysql");
require("dotenv").config({ path: __dirname + "/../.env" });
// Charset must be be utf8mb4 in db and connection
// Edit my.cnf on any new mysql sever https://mathiasbynens.be/notes/mysql-utf8mb4
module.exports = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: "cases",
	charset: "UTF8MB4_UNICODE_CI",
	multipleStatements: true
});
