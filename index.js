"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const AWS = require('aws-sdk');
const async = require("async");
const mysql = require('mysql');
const download = require('download');
const fs = require('fs');
const lib = require('./lib/functions.js');
const {execSync} = require('child_process');

const jsonData = JSON.parse(fs.readFileSync('jsons/data-limited.json'))

require('dotenv').config();

//mysql connect
var connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'cases',
  charset   : 'UTF8MB4_UNICODE_CI'
});

connection.connect();

var creds = new AWS.SharedIniFileCredentials({profile: 'node-s3'});
AWS.config.credentials = creds;

var s3 = new AWS.S3({
  params: {Bucket: 'freelaw-pdfs'}
});

function processCase(caseData, cb) {

  let caseItem = {};

  console.log("processing case", caseData);

  async.series([

    // download file
    function(cb) {

        const url = lib.getMOJURL(caseData.id)
        const bucket_key = lib.slashToDash(caseData.id);
        caseItem.bucket_key = bucket_key;

        download(url).then(data => {
          fs.writeFileSync('./cache/' + bucket_key, data);
          cb();
        })
    },

    // Run program text extract
    function(cb) {
// path.resolve here
      const child = execSync("/mnt/i/Dev/openlaw-data/xpdf/bin64/pdftotext /mnt/i/Dev/openlaw-data/cache/" + caseItem.bucket_key);
      const noExtension = caseItem.bucket_key.replace(/\.pdf/g, '');
      const case_text = fs.readFileSync("./cache/" + noExtension + ".txt");
      caseItem.case_text = case_text;
      cb();


    },

    // upload to bucket
    function(cb) {
      console.log("s3");
      s3.upload({
        Key: caseItem.bucket_key,
        Body: fs.readFileSync('./cache/' + caseItem.bucket_key)
      }, cb);

    },

    // delete local readFileSync
    function(cb) {
      console.log("deleting");
      // do you want to use fs.unlinkSync()?
      fs.unlink('./cache/' + caseItem.bucket_key);
      cb();
    },
// dick
    // tidy up object
     function(cb) {
       // This might need to be a mysql formatted date YYYY-MM-DD
       // do u need time
      caseItem.pdf_fetch_date = new Date();

      caseItem.case_name = caseData.caseName ? lib.formatName(caseData.caseName) : "Unknown case";

      caseItem.case_neutral_citation = caseData.caseName ? lib.getCitation(caseData.caseName) : "";
      // ok lets just put it in this table since we have the info, we can always delete it from this table later if it makes sense


      cb();
  },

    // insert case into database
      function(cb) {
      console.log("database");
      connection.query('INSERT INTO cases SET ?', caseItem, function(err, result) {

        if(err) { cb(err); return; }

        caseItem.id = result.insertId;

        cb();

      });
    }
  ], cb)

}

async.series(jsonData.cases.map(caseItem => {

  return processCase.bind(null, caseItem)

}), (err, results) => {

  console.log("results", results)

})


/*
loadJSON.then(function(fulljson) {
    console.log("JSON Loaded. Processing Data.")
    // map json file
    // here
    _.map(fulljson, function(cases) {
        // here, var fulljson is whole file so cases =  [{cases[0], cases[1], etc}]
        // map again to iterate through each case
        _.map(cases, function(singleCase) {
            // add fields we need to case object

            singleCase.pdf_fetch_date = new Date();
            // nb singleCase.CaseName = long string case name plus citation in MOJ JSON - so separate:
            // sometimes "" so check exists first
            if(singleCase.CaseName) {singleCase.case_name = lib.getName(singleCase.CaseName);}
            else {singleCase.case_name = "Unknown case";} // need to add error handling

            singleCase.bucket_ref = lib.slashToDash(singleCase.id);
            singleCase.mojPDFURL = lib.getMOJURL(singleCase.id);

            if(singleCase.CaseName) {singleCase.case_neutral_citation = lib.getCitation(singleCase.CaseName);}

            else {singleCase.case_neutral_citation = "[0000] NZXX 0";}

            // probably unnecessary - just making new case_date field same as JudgmentDate:
            singleCase.case_date = singleCase.JudgmentDate;
            // get case fulltext to be done later
            // something like singleCase.full_text = child_process.exec('~./xpdf-tools-linux-4.00/bin64/pdftotext [PDF NAME]') but that will save to text file in same dir not save text to object
            singleCase.full_text = "";

            console.log(singleCase);
        });
    });
});




*/
