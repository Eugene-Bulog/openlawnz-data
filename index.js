"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const AWS = require('aws-sdk');
const async = require("async");
const mysql = require('mysql');
const download = require('download');
const fs = require('fs');
const lib = require('./lib/functions.js');
const {spawn} = require('child_process');

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

var s3 = new AWS.S3({
  params: {Bucket: 'freelaw-pdfs'}
});

function processCase(caseData, cb) {

  let cases = {};

  console.log("processing case", caseData);

  async.series([

    // download file
    function(cb) {

        const url = lib.getMOJURL(caseData.id)
        const bucket_key = lib.slashToDash(caseData.id);
        cases.bucket_key = bucket_key;

        download(url).then(data => {
          fs.writeFileSync('./cache/' + bucket_key, data);
          cb();
        })


    },

    // Run program text extract
    function(cb) {

      const child = spawn("./xpdf/bin64/pdftotext ./cache/" + cases.bucket_key);
      child.on('exit', function(){
        const case_text = fs.readFileSync("./cache/" + cases.bucket_key + ".txt");
        cases.case_text = case_text;
        cb();
      });

    },

    // upload to bucket
    function(cb) {

      s3.upload({
        Key: cases.bucket_key,
        Body: fs.readFileSync('./cache/' + cases.bucket_key)
      }, cb);

    },

    // insert case into database
    function(cb) {

      connection.query('INSERT INTO cases SET ?', cases, function(err, result) {

        if(err) { cb(err); return; }

        cases.id = result.insertId;

        cb();

      });

    }], cb)

}

async.series(jsonData.cases.map(cases => {

  return processCase.bind(null, cases)

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
