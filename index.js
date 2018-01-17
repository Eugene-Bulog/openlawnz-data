// processCases.js


"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const AWS = require('aws-sdk');
const async = require("async");
const mysql = require('mysql');
const download = require('download');
const fs = require('fs');
const path = require('path');
const lib = require('./lib/functions.js');
const {execSync} = require('child_process');
const argv = require('yargs').argv

require('dotenv').config();

// remember, charset should be utf8mb4 in db and connection
// and edit my.cnf on any new mysql sever https://mathiasbynens.be/notes/mysql-utf8mb4
//mysql connect
var connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'cases',
  charset   : 'UTF8MB4_UNICODE_CI'
});

connection.connect();

// edit for different computers
var creds = new AWS.SharedIniFileCredentials({profile: 'node-s3-laptop'});
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
        console.log('downloading file')
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
      console.log("extracting text")

      try {
        const pathtopdf = path.resolve('./xpdf/bin64/pdftotext');
        const pathtocache = path.resolve('./cache/');
        const child = execSync(pathtopdf + " " + pathtocache + "/" + caseItem.bucket_key);
        const noExtension = caseItem.bucket_key.replace(/\.pdf/g, '');
        const case_text = fs.readFileSync("./cache/" + noExtension + ".txt", "utf8");
        caseItem.case_text = case_text;
        cb();
      } catch(ex) {
        cb(ex);

      }

    },

    // upload to bucket
    function(cb) {
      console.log("uploading to s3");
      s3.upload({
        Key: caseItem.bucket_key,
        Body: fs.readFileSync('./cache/' + caseItem.bucket_key)
      }, cb);

    },

    // delete local
    function(cb) {
      try {
        console.log("deleting local file");
        fs.unlinkSync('./cache/' + caseItem.bucket_key);
        const noExtension = caseItem.bucket_key.replace(/\.pdf/g, '');
        fs.unlinkSync("./cache/" + noExtension + ".txt");
        cb();
      } catch(ex) {
        cb(ex)
      }
    },


    // tidy up object
     function(cb) {

      caseItem.pdf_fetch_date = new Date();
      caseItem.case_name = caseData.CaseName ? lib.formatName(caseData.CaseName) : "Unknown case";
      // maybe rename table (and this) to be case_initial_citation ie the first citation found (if any)
      caseItem.case_neutral_citation = caseData.CaseName ? lib.getCitation(caseData.CaseName) : "";
      caseItem.case_date = caseData.JudgmentDate;

      cb();
  },

    // insert case into database
    function(cb) {
      console.log("inserting into database");
      connection.query('INSERT INTO cases SET ?', caseItem, function(err, result) {

        if(err) { cb(err); return; }

        caseItem.id = result.insertId;

        cb();

      });
    }
  ], cb)

}


async.series(argv.cases.map(caseItem => {

  return processCase.bind(null, caseItem)

}), (err, results) => {

  connection.end();

  if(err) {
    process.stderr.write(err);
  } else {
    process.stdout.write(JSON.stringify(results));
  }

  process.exit();

})





// controller

// index.js

const {exec} = require('child_process');
const download = require('download');
const fs = require('fs');

// So we need to download the json file
// heres the url, i think i have it in the old file fucking automcomplete

// heres json
// https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Location&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50000&json.nl=map&fq=JudgmentDate%3A%5B*%20TO%202017-12-19T23%3A59%3A59Z%5D&sort=JudgmentDate%20desc&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score&wt=json&json.wrf=jQuery1123045201288903118564_1513632996819&_=1513632996820

// this is "all cases before date JudgmentDate%3A%5B*%20TO%202017-12-19
// also just view that JSON cos i manually trimmed it - start and end of file is useless info

// ok sec

/* JSON INSTRUCTIONS

// nb to get updated json file (will need trimming) url is https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Location&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50000&json.nl=map&fq=JudgmentDate%3A%5B*%20TO%202017-12-19T23%3A59%3A59Z%5D&sort=JudgmentDate%20desc&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score&wt=json&json.wrf=jQuery1123045201288903118564_1513632996819&_=1513632996820
// that url gets up to 19 december 2017 - replace date variable
// add    {"cases": [   at start
// trim end so should end with    "score": 1.0 }]}
// format at http://jsonviewer.stack.hu/
// MOJ case ids and therefore urls subject to change retrospectively, links can break - get new JSON before any mass update

*/
const casesPerInstance = 10;
const mojDataFile = "./cache/mojData.json"

const jsonURL = "https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Location&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50000&json.nl=map&fq=JudgmentDate%3A%5B*%20FROM%202017-12-19T23%3A59%3A59Z%5D&sort=JudgmentDate%20desc&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score&wt=json&json.wrf=jQuery1123045201288903118564_1513632996819&_=1513632996820"
// I cbf reading the logic atm, can do later
// might be our "cases" = (mojDATA.json).response.docs, i will check later

const cachedJSON = fs.existsSync(mojDataFile) ? JSON.parse(fs.readFileSync(mojDataFile)).cases : []

Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) === -1;
    });
};

download(jsonURL).then(data => {
  // now we diff with cache
  // imma find a diff thing
  // Not actually sure if it does an object match, which is gay. hm
  const newCases = cachedJSON.diff(data);

  let casesArrays = [];
  let c = 0;

  while(newCases.length > 0) {
    caseArrays.push(newCases.splice(c, Math.min(newCases.length, casesPerInstance)))
    c += casesPerInstance
  }

  // called from parallel process
  function spawnCaseProcessors(cases, cb) {
    exec(`node processCase --cases=${JSON.stringify(caseArray)}`, (error, stdout, stderr) => {
      if (error || stderr) {
        cb(err || stderr)
        return;
      }
      cb(null, stdout)
    });
  }

  async.parallel(caseArrays.map(caseArray => {
    return spawnCaseProcessors.bind(null, caseArray)
  }, (err, results) => {
    if(err) {
      console.log('err', err); return;
    } else {
      console.log('Success', JSON.parse(results))
      fs.writeFileSync(mojDataFile, JSON.stringify(data));
    }
  })

})
