// get first neutral citation inside 100 characters of case text, likely to be this case's neutral citation
// required because initial import of MOJ .json file sometimes has blank case name and citation data
// add neutral citation (if found) to case_citations table with id referencing case in cases table

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
    return connection.query('select * from case_citations where citation = ""');

}).then(function(rows) {
    // get first 100 chars of case text
    var case_text = (JSON.stringify(rows[0].case_text).substr(0,100));
    // check if neutral citation appears there
    const regNeutralCite = /((?:\[\d{4}\]\s*)(?:(NZDC|NZFC|NZHC|NZCA|NZSC))(?:\s*(\w{1,6})))/;
    var citation = case_text.match(regNeutralCite);
    // if so, add to case_citations table
    if(citation) {
        console.log(citation);
        // var result = connection.query('insert into case_citations(case_id, citation) values("' + rows[0].id + '", "' + citation[0] + '")');
    }
    return result;

}).then(function(){
        connection.end();
});

