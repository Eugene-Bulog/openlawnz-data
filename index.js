var fs = require("fs");
var _=require("underscore");
const download = require("download");
var mysql = require('mysql');
var limits = require('limits.js');

// mysql connects
var connection = mysql.createConnection({
  host  : 'localhost',
  user  : 'root',
  password  : '',
  database  : 'caselaw'
});

connection.connect(function(err){});

var content = fs.readFileSync("data-limited.json", 'utf8');
var jsonContent = JSON.parse(content);

// service defines paramaters for limits.js
// currently - limit will be one call per second
var service = limits({
  secondly: 1,
});


// map the json array and for each object, download it
// url is https://forms.justice.govt.nz/search/Documents/pdf/ plus the ID of the case
     
      _.map(jsonContent, function(data) {
        _.map(data, function(cases) {
          
          // queue mapped function using limits.js to rate limit
          var downloadFile = service.push(function() {
            // download the case
            download('https://forms.justice.govt.nz/search/Documents/pdf/' + cases.id, 'downloads/', { filename: cases.CaseName + '.pdf'}).then(() => {
            
            console.log("Downloaded " + cases.CaseName + "\n"); 
            var str = cases.CaseName;
            
            // Get netural citation 
            const regCite = /(\[?\d{4}\]?) NZ(D|F|H|C|S|L)(A|C|R) (\d+)/;
            var citation = str.match(regCite);
            
            // Get casename
            const regName = /^(.*?)\ \[/;
            var caseName = str.match(regName);
              
            // str.match() is array of all matches combined and then each individual group - [0] is all
            // extracted case name is caseName[1] and extracted citation is citation[0] since will only be one citation match
            var url = 'https://forms.justice.govt.nz/search/Documents/pdf/' + cases.id;
            var downloaded = true;
              
            connection.query('INSERT into caseinfo (case_name_full, citation, url, downloaded) VALUES (?, ?, ?, ?)', [caseName[1], citation[0], url, downloaded], function(err, rows, fields) {
              if (!err) console.log("Inserted into database: " + caseName[1] + "\n"); 
              else console.log("Error: " + err);
            });  
            });
          });       
        });
      });


// next steps:
// save each pdf to bucket instead of locally
