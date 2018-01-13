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

const jsonData = JSON.parse(fs.readFileSync('jsons/data-test-set.json'))

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
      fs.unlinkSync('./cache/' + caseItem.bucket_key);
      const noExtension = caseItem.bucket_key.replace(/\.pdf/g, '');
      fs.unlinkSync("./cache/" + noExtension + ".txt");
      cb();
    },

    // tidy up object
     function(cb) {

      caseItem.pdf_fetch_date = new Date();
      caseItem.case_name = caseData.CaseName ? lib.formatName(caseData.CaseName) : "Unknown case";
      caseItem.case_neutral_citation = caseData.CaseName ? lib.getCitation(caseData.CaseName) : "";
      caseItem.case_date = caseData.JudgmentDate;

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

  console.log("Done");

})
