// get all citations inside a case including pinpoint 
// still need to add lookup for each result to see if in database, then add to case-to-case table

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const mysql = require('mysql');
require('dotenv').config();

var connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'cases',
  charset   : 'UTF8MB4_UNICODE_CI',
  multipleStatements: true
});

connection.connect();

connection.query("select * from cases INNER JOIN case_citations ON case_citations.case_id = cases.id WHERE case_citations.citation = ''", function(error, results, fields) {
	console.log(error)
	console.log(results)
	
});
