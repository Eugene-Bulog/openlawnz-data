// get all citations inside a case

// nb - need to add lookup for each result to see if in database, then add to case-to-case table

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

var i = 1;

query
    .on('error', function(err) {
        console.log(err);
    })
    .on('result', function(row) {
        var case_text = (JSON.stringify(row.case_text));
    
        const RegAllCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)([\s\S]at[\s\S]\d{0,16}(((\]|\.)|\;)|([\s\S]\(.{0,20}\))))?/g;
        var citations = case_text.match(RegAllCites);
        console.log(citations);

    })
    .on('end', function() {
      console.log('end');
      connection.end();
    });
