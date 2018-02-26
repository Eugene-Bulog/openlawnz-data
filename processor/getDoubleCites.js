// get double citations for populating case citations

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const mysql = require('promise-mysql');
const _ = require('underscore');
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
    _.map(rows, function(cases) {
        const regDoubleCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)(;|,)\s(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)/g;
        const commaOrSemi = /,|;/g;
        // check that case_text exists
        if (cases.case_text) {
            var str = cases.case_text;
            console.log(cases.id);
            // get the double citations from case text
            var doubleCites = str.match(regDoubleCites);
            // if there are matches
            if(doubleCites) {
                // will be array even if just one, need to iterate through
                _.map(doubleCites, function(doubles) {

                    // each result is a string being the combined double citation match
                    // split it into an array containing each individual citation
                    var arrayofDoubleCites = doubles.split(commaOrSemi);
                    console.log("First " + arrayofDoubleCites[0] + "\nSecond " + arrayofDoubleCites[1]);

                    // look up database for arrayofDoubleCites[0]
                    // if match, add arrayofdoublecites[1] to id of matched arrayofDoubleCites[0] in case_citations
                });
            } 
        }
    });


}).then(function(result){
    console.log(result);
}).then(function(){
    console.log('done');
    connection.end();
});

