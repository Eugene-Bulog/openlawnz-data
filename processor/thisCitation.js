// get first neutral citation inside 1000 characters of case text, likely to be this case's neutral citation

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

var getText = "select case_name, case_text from cases where id = ?";

var query = connection.query(getText, [738]);

query
    .on('error', function(err) {
        console.log(err);
    })
    .on('result', function(row) {
        // limit to first 1000 chars, should be on front page if it exists
        var case_text = (JSON.stringify(row.case_text).substr(0,1000));
        const regNeutralCite = /((?:\[\d{4}\]\s*)(?:(NZDC|NZFC|NZHC|NZCA|NZSC))(?:\s*(\w{1,6})))/;
        var citation = case_text.match(regNeutralCite);
        console.log(citation[0]);

    })
    .on('end', function() {
      console.log('end');
      connection.end();
    });
