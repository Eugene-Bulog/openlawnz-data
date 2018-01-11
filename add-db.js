"use strict";
var fs = require("fs");
var _=require("underscore");
var mysql = require('mysql');
var strings = require('./lib/string-functions');

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


// get the JSON file
var loadJSON = new Promise(
  function(fulfill, reject) {
    fulfill(JSON.parse(fs.readFileSync('jsons/count.json', 'utf8')));
    reject(Error("Error loading JSON"));
  });
 
  // get number of temporary citations in database already
  // when dealing with both tables - need uniquely generated temporary/dummy citation, because it will be used for s3 bucket keys / urls
  // generate the intended reference by looking up cases table as it holds master record of s3 keys and number of dummy citations
  // in table caselaw.cases, generated_citation is boolean
  // first get a count: look up last generated_citation row id and add one
  var newGenID = 0;
  var getLastDummy = "select count(*) as number from cases WHERE generated_citation = true";
  connection.query(getLastDummy, function(error, results) {
    if(error) throw error;
        if(results[0]) {
        // results[0].number is number of previously generated citations, so add one, if not leave as 0
        var newGenID = results[0].number + 1;
        console.log(newGenID);
        }
      });

  // parse the JSON
  loadJSON.then(function(result) {
    console.log("JSON Loaded. Processing Data.")
    
  // map
  _.map(result, function(data) {
    _.map(data, function(cases) {

      // if json casename data exists (some moj long names ie case + citation = "") and dealt with below
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

          // Can generate intended s3 bucket reference, which should be neutral citation (if found) without symbols
          // ie 2012NZHC1256 or 2015NZSC38. If there is no citation available at time of initial import, will generate temporary one in 'else' below.
          // Here we know citation exists therefore can proceed by trimming and inserting slash          
          // remove spaces and brackets
          const trim = /[^a-zA-Z0-9]/g;
          var intendedBucket = citation[0].replace(trim, "");
          intendedBucket = strings.insertSlash(intendedBucket, "/");

          // mysql queries 
          // put case name, citation, url and downloaded status into database
          var insertDownload = "INSERT into downloads (case_name_full, citation, url, downloaded, moj_id, bucket_ref) VALUES (?, ?, ?, ?, ?, ?)";
          connection.query(insertDownload, [caseName[1], citation[0], url, downloaded, cases.id, intendedBucket], function(err, rows, fields) {
            if (!err) console.log("Inserted into downloads table: " + caseName[1] + "\n"); 
            else console.log("Error inserting into downloads table: " + err + "\n");
          });            

          // fill in what we can into cases table, set generated citation = false since we have citation data
          var insertCases = "INSERT into cases (pdf_name, bucket_ref, case_neutral_citation, case_date, case_name, generated_citation) VALUES (?, ?, ?, ?, ?, ?)";
          connection.query(insertCases, [caseName[1] + '.pdf', intendedBucket, citation[0], JudgmentDate[0], caseName[1], false], function(err, rows, fields) {
            if (!err) console.log("Inserted into cases table: " + caseName[1] + "\n"); 
            else console.log("Error inserting into cases table: " + err + "\n");
          });  
          }
        }
          
      else {
        // either there is no casename, or no citation, so use defaults 
        // still should add to download table for later download
        newGenID++;
        var citation = "Unknown";
        var caseName = "Unknown";
        
        // generate URL from cases.id
        var url = 'https://forms.justice.govt.nz/search/Documents/pdf/' + cases.id;

        // get judgment date - first 10 chars of cases.JudgmentDate should be yyyy/mm/dd
        var fullDate = cases.JudgmentDate;
        const regDate = /.{10}/;
        var JudgmentDate = fullDate.match(regDate);
        // get year - first 4 chars of cases.JudgmentDate should be yyyy/mm/dd, if no data then use 0000
        // this is used to generate temporary citation data for cases table (irrelevant for downloads table which will just use 'unknown')
        const regYear = /.{4}/;
        var JudgmentYear = "0000";
        if(JudgmentDate) {
          var n = JudgmentDate.toString();
          var JudgmentYear = n.match(regYear);
        } 

        // set downloaded to false
        var downloaded = false;
        // parse and generate dummy citation year plus /NZOL plus next number in sequence of dummy citations
        var intendedBucket = JudgmentYear + "/NZOL" + newGenID;
        
        //mysql queries
        // put case name, citation, url, intended bucket ref, and downloaded status into download table
        var insertDownload = "INSERT into downloads (case_name_full, citation, url, downloaded, moj_id, bucket_ref) VALUES (?, ?, ?, ?, ?, ?)";
        connection.query(insertDownload, [caseName, citation, url, downloaded, cases.id, intendedBucket], function(err, rows, fields) {
          if (!err) console.log("Unknown case inserted into downloads table: " + intendedBucket); 
          else console.log(err + "Error inserting unknown case into downloads table: " + intendedBucket);
        });
        // put the details we can extract from MOJ json (pdf name and judgment date) plus bucket ref (generated temporary citation), and mark as generated citation
        var insertCases = "INSERT into cases (pdf_name, case_date, bucket_ref, generated_citation) VALUES (?, ?, ?, ?)";
        connection.query(insertCases, ['Unknown case', JudgmentDate, intendedBucket, true], function(err, rows, fields) {
          if (!err) console.log("Inserted unknown case into cases table: " + intendedBucket); 
          else console.log(err + "Error inserting unknown case into cases table: " + intendedBucket);
          });
        }

    });
  });

  // close database 
  // connection.end();
  }, function(err) {
      console.log(err);
  });