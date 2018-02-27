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

const regDoubleCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)(;|,)\s(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)/g;
const commaOrSemi = /,|;/g;

// this wont scale but rewrite in sql later cos we cant be fucked right now
connection.query("select * from cases ; select * from case_citations", function(error, results, fields) {
	
	var allCases = results[0];
	var allCitations = results[1];

	var insertQueries = [];
	
	function findCaseByCitation(citation) {
		return allCitations.find(function(row) {
			return row.citation === citation
		})
    }

	allCases.forEach(function(row) {
		
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
				insertQueries.push("insert into case_citations (case_id, citation) values ('" + foundCase.case_id + "', '" + separatedCitations[1] + "')")
			}
		}
		
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

/*
query.on('error', function(err) {
	
	console.log(err);
	
}).on('result', function(row) {
	
	console.log('Looking in:');
	console.log(row.case_neutral_citation);
	
	var case_text = (JSON.stringify(row.case_text));
	
	//get all single citations
	const RegAllCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)([\s\S]at[\s\S]\d{0,16}(((\]|\.)|\;)|([\s\S]\(.{0,20}\))))?/g;
	
	var citations = case_text.match(RegAllCites);
	
	if(citations) {
		console.log('found:')
		console.log(citations[1])
	}
	
	console.log('---');
	
	//connection.query("select id from cases where case_neutral_citation LIKE
	
        
}).on('end', function() {
	console.log('end');
	connection.end();
});
*/
