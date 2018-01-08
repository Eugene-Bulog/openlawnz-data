"use strict";
var fs = require("fs");
var _=require("underscore");
var mysql = require('mysql');

// load creds
require('dotenv').config();

// mysql connects

// remember, charset should be utf8mb4 in db and connection
// and edit my.cnf on any new mysql sever https://mathiasbynens.be/notes/mysql-utf8mb4
var connection = mysql.createConnection({
  host  : process.env.DB_HOST,
  user  : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'caselaw',
  charset : 'UTF8MB4_UNICODE_CI'
});

connection.connect(function(err){});

// promise to read and parse JSON file, fulfilling once done
// nb to get updated json file (will need trimming) url is https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Location&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50000&json.nl=map&fq=JudgmentDate%3A%5B*%20TO%202017-12-19T23%3A59%3A59Z%5D&sort=JudgmentDate%20desc&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score&wt=json&json.wrf=jQuery1123045201288903118564_1513632996819&_=1513632996820
// that url gets up to 19 december 2017 - replace date variable
// add    {"cases": [   at start
// trim end so should end with    "score": 1.0 }]}
// format at http://jsonviewer.stack.hu/
// MOJ case ids and therefore urls subject to change retrospectively, links can break - get new JSON before any mass update

// get today's date yyyy/mm/dd
var today = new Date();
var dd = today.getDate();
var mm = today.getMonth()+1; //January is 0!
var yyyy = today.getFullYear();
if(dd<10){
  dd='0'+dd;
} 

if(mm<10) {
  mm='0'+mm;
} 
var today = yyyy+'/'+mm+'/'+dd;

// get the JSON file
var loadJSON = new Promise(
  function(fulfill, reject) {
    fulfill(JSON.parse(fs.readFileSync('jsons/data-test-set.json', 'utf8')));
    reject(Error("Error loading JSON"));
  });
  
  // parse the JSON
  loadJSON.then(function(result) {
    console.log("JSON Loaded. Processing Data.")
    
  // map
  _.map(result, function(data) {
    _.map(data, function(cases) {

      // if json casename data exists (some moj long names ie case + citation = "")
      if(cases.CaseName) {
        
      var str = cases.CaseName;
      // citation, with very basic regex error handling (should cope with unexpected whitespace)
      const regCite = /(\[?\d{4}\]?)(\s*?)NZ(D|F|H|C|S|L)(A|C|R)(\s.*?)(\d+)*/;
      var citation = str.match(regCite);

      // get judgment date - first 10 chars of cases.JudgmentDate should be yyyy/mm/dd
      var fullDate = cases.JudgmentDate;
      const regDate = /.{10}/;
      var JudgmentDate = fullDate.match(regDate);
      
      // if properly formatted citation exists, proceed
      if (citation) {
        
        // casename - everything up to first square bracket
        const regName = /^(.*?)\ \[/;
        var caseName = str.match(regName);
          
        // str.match() is array of all matches combined and then each individual group - [0] is all
        // extracted case name is caseNameArray[1] and extracted citation is citation[0] since will only be one citation match
        // generate URL from cases.id
        var url = "https://forms.justice.govt.nz/search/Documents/pdf/" + cases.id;
          
        // set downloaded to false for now
        var downloaded = false;
          
        // put case name, citation, url and downloaded status into database
        var insertDownload = "INSERT into downloads (case_name_full, citation, url, downloaded, unique_id) VALUES (?, ?, ?, ?, ?)";
        connection.query(insertDownload, [caseName[1], citation[0], url, downloaded, cases.id], function(err, rows, fields) {
          if (!err) console.log("Inserted into downloads table: " + caseName[1] + "\n"); 
          else console.log("Error inserting into downloads table: " + err);
        });  
        
        var insertCases = "INSERT into cases (pdf_name, case_neutral_citation, case_date, case_name) VALUES (?, ?, ?, ?)";
        connection.query(insertCases, [caseName[1] + '.pdf', citation[0], JudgmentDate[0], caseName[1]], function(err, rows, fields) {
          if (!err) console.log("Inserted into cases table: " + caseName[1] + "\n"); 
          else console.log("Error inserting into cases table: " + err);
        });  
        }
      }
          
      else {
        // either no casename, or no citation, so use defaults 
        // still should add to download table for later download
        // will have date, and MOJ unique id (eg /jdo/etc) which may be useful in cases table

        var citation = "Unknown";
        var caseName = "Unknown";
        
        // generate URL from cases.id
        var url = 'https://forms.justice.govt.nz/search/Documents/pdf/' + cases.id;

        // get judgment date - first 10 chars of cases.JudgmentDate should be yyyy/mm/dd
        var fullDate = cases.JudgmentDate;
        const regDate = /.{10}/;
        var JudgmentDate = fullDate.match(regDate);
        
        // set downloaded to false
        var downloaded = false;
        
        // put case name, citation, url and downloaded status into temporary download database
        var insertDownload = "INSERT into downloads (case_name_full, citation, url, downloaded, unique_id) VALUES (?, ?, ?, ?, ?)";
        connection.query(insertDownload, [caseName, citation, url, downloaded, cases.id], function(err, rows, fields) {
          if (!err) console.log("Unknown case inserted into downloads table: " + cases.id); 
          else console.log("Error inserting unknown case into downloads table: " + err);
        });
        
        // put the details we can extract from MOJ json (pdf name and judgment date)
        var insertCases = "INSERT into cases (pdf_name, case_date) VALUES (?, ?)";
        connection.query(insertCases, [cases.id, JudgmentDate[0]], function(err, rows, fields) {
          if (!err) console.log("Inserted unknown case into cases table: " + cases.id); 
          else console.log("Error inserting into cases table: " + err);
        });
      }
    });
  });

  // close database 
  connection.end();
  }, function(err) {
      console.log(err);
  });