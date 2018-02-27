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

// this wont scale but rewrite in sql later cos we cant be fucked right now
connection.query("select * from cases ; select * from case_citations", function(error, results, fields) {
	
	var allCases = results[0];
	var allCitations = results[1];

	var insertQueries = [];

	allCases.forEach(function(caseRow) {
		
		if(!caseRow.case_text) { return }
        
        allCitations.forEach(function(citationRow){
            if(caseRow.case_text.includes(citationRow.citation) && citationRow.case_id != caseRow.id) {
                insertQueries.push("insert into case_to_case (case_id_1, case_id_2) values ('" + caseRow.id + "', '" + citationRow.case_id + "')")
            }
        })		
	})
	
	console.log(insertQueries)
	
	 if(insertQueries.length > 0) {
		console.log(insertQueries.join(";"))
		connection.query(insertQueries.join(";"), function(error, results, fields) {
			console.log("error", error);
			console.log("results", results);
		});
		
	} 
	
});
