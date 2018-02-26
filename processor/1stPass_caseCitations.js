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
  charset   : 'UTF8MB4_UNICODE_CI'
});

connection.connect();

var getText = "select * from cases";
var RegAllCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)([\s\S]at[\s\S]\d{0,16}(((\]|\.)|\;)|([\s\S]\(.{0,20}\))))?/g;

connection.query(getText, function(error, results, fields) {

	var insertQueries = [];
	
	function findCaseByCitation(citation, orig) {
		return results.find(function(row) {
			return row.case_neutral_citation === citation
		})
	}

	results.forEach(function(row) {
		
		if(!row.case_text) { return }
		
		var citationsMatch = row.case_text.match(RegAllCites);
		
		if(citationsMatch) {
			
			Array.from(new Set(citationsMatch)).forEach(function(citation) {
				
				var foundCase = findCaseByCitation(citation, row.id)
			
				if(foundCase) {
					insertQueries.push(`insert into case_citations (case_id, citation) values ('${foundCase.id}, ${citation}')`)
				}
			})
			
		}
		
	})
	
	console.log(insertQueries);
	
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
