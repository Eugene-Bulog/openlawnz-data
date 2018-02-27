// get all citations inside a case including pinpoint 
// still need to add lookup for each result to see if in database, then add to case-to-case table

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
/* const mysql = require('mysql');
require('dotenv').config();

var connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'cases',
  charset   : 'UTF8MB4_UNICODE_CI'
});

connection.connect(); */

var fs = require('fs');

// var getText = "select * from cases";
const regDoubleCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)(;|,)\s(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)/g;
const commaOrSemi = /,|;/g;

var file = JSON.parse(fs.readFileSync('test_data/allcases.json'));

function doStuff (results) {

	var insertQueries = [];
	
	function findCaseByCitation(citation) {
		return results.find(function(row) {
			return row.case_neutral_citation === citation
		})
    }

	results.forEach(function(row) {
		
		if(!row.case_text) { return }
		
		var citationsMatch = row.case_text.match(regDoubleCites);
		
		if(citationsMatch) {
                        
            var separatedCitations = citationsMatch[0].split(commaOrSemi);
            
            // separatedCitations[0] has first of double citation
            // separatedCitations[1] has second of double citation

            var citation = separatedCitations[0];

            console.log("First = " + citation + " | Second = " + separatedCitations[1]);
			
			var foundCase = findCaseByCitation(citation);
			
				if(foundCase) {
                    insertQueries.push(`insert into case_citations (case_id, citation) values ('${foundCase.id}, ${separatedCitations[1]}')`)
				}
		}
		
	})
	
	console.log(insertQueries);
	
}

doStuff(file);
