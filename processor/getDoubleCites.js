// get double citations for populating case citations

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const mysql = require('promise-mysql');
require('dotenv').config();

var connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'cases',
  charset   : 'UTF8MB4_UNICODE_CI'

}).then(function(conn) {
    connection = conn;
    // get all blank neutral citations ("" instead of NULL due to formatting of initial insert)
    return connection.query('select id, case_name, case_text from cases');

}).then(function(rows) {
    // get first 100 chars of case text
    // var case_text = rows[0].case_text;
    for(var i = 0; i < rows.length; i++) { 
        console.log(rows[i].case_name);
        // get all double cites
        const regDoubleCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)(;|,)\s(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)/g;
        var str = rows[i].case_text;
        var doubleCites = str.match(regDoubleCites);
   // if so, add to case_citations table
        if(doubleCites) {
        // add match
        // connection.query('insert into case_citations ........................)
            console.log(doubleCites);
        }
    }
}).then(function(){
        connection.end();
});

