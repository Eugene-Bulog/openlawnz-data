"use strict";
var fs = require("fs");
var _=require("underscore");
var mysql = require('mysql');
var limits = require('limits.js');

// load creds
require('dotenv').config();

// mysql connects
var connection = mysql.createConnection({
  host  : process.env.DB_HOST,
  user  : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'caselaw'
});

connection.connect(function(err){});

// promise to read and parse JSON file, fulfilling once done
var loadJSON = new Promise(
  function(fulfill, reject) {
   fulfill(JSON.parse(fs.readFileSync('data-limited.json', 'utf8')));
   reject(Error("Error loading JSON"));
  });

// load the JSON
loadJSON.then(function(result) {
    console.log("JSON Loaded. Processing Data.")

    // map
    _.map(result, function(data) {
      _.map(data, function(cases) {
          
          // regex
          var str = cases.CaseName;
          // citation
          const regCite = /(\[?\d{4}\]?) NZ(D|F|H|C|S|L)(A|C|R) (\d+)/;
          var citation = str.match(regCite);
          // casename
          const regName = /^(.*?)\ \[/;
          var caseName = str.match(regName);
            
          // fyi str.match() is array of all matches combined and then each individual group - [0] is all
          // extracted case name is caseName[1] and extracted citation is citation[0] since will only be one citation match

          // generate URL from cases.id
          var url = 'https://forms.justice.govt.nz/search/Documents/pdf/' + cases.id;

          // set downloaded to false
          var downloaded = false;
          
          // put case name, citation, url and downloaded status into database
          connection.query('INSERT into caseinfo (case_name_full, citation, url, downloaded) VALUES (?, ?, ?, ?)', [caseName[1], citation[0], url, downloaded], function(err, rows, fields) {
            if (!err) console.log("Inserted into database: " + caseName[1] + "\n"); 
            else console.log("Error: " + err);
          });  
          });
      });
  // close database 
  connection.end();
}, function(err) {
  console.log(err);
});



     
   


// next steps:
// save each pdf to bucket instead of locally
