// search for rows in the case_citations table where citation is blank
// get the full case data including case text
// trim the case text to first 200 characters and look for a neutral citation there
// if found, add that citation to case_citations table

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
//  get all blank citations
// TODO: get all half-complete citations eg "[2017] NZHC" - run citation fix on those cases too
connection.query("select * from cases INNER JOIN case_citations ON case_citations.case_id = cases.id WHERE case_citations.citation = ''", function(error, results, fields) {
  
  // array of mysql update statements
  var updateCitations = [];

  results.forEach(function(row) {
    
      if(!row.case_text) { return console.log("No text to parse for missing citation") }
      var case_text = (JSON.stringify(row.case_text).substr(0,300));
      // regex for neutral citation
      const regNeutralCite = /((?:\[\d{4}\]\s*)(?:(NZDC|NZFC|NZHC|NZCA|NZSC|NZEnvC|NZEmpC|NZACA|NZBSA|NZCC|NZCOP|NZCAA|NZDRT|NZHRRT|NZIACDT|NZIPT|NZIEAA|NZLVT|NZLCDT|NZLAT|NZSHD|NZLLA|NZMVDT|NZPSPLA|NZREADT|NZSSAA|NZSAAA|NZTRA))(?:\s*(\w{1,6})))/g;
      var citation = case_text.match(regNeutralCite);
      // for now, limit to the first citation found (in case double citation appears in header - deal with double citations in header later)
      citation = citation[0];
      // add to array of update statements
      updateCitations.push("update case_citations set citation = '" + citation + "' where case_id = '" + row.id + "'");
      })

  if(updateCitations.length > 0) {
		 connection.query(updateCitations.join(";"), function(error, results, fields) {
			console.log("error", error);
      console.log("results", results);
      connection.end();
    }); 
  // console.log(updateCitations);
  }
  else connection.end();
});