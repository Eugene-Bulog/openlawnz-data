// this app should convert pdf to html and store in a bucket
// next step - get pdf from bucket, convert to html, store in bucket
// then - get lots of pdfs from bucket, convert each, store in bucket

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const   pdftohtml = require('pdftohtmljs'),
AWS = require('aws-sdk'),
async = require("async"),
mysql = require('mysql'),
limits = require('limits.js'),
download = require('download'),
fs = require('fs');

// set delay for downloads in milliseconds:
var delay = 1000;

// load creds
require('dotenv').config();

// get aws creds - set profile, using profile set from ~/.aws/credentials
var creds = new AWS.SharedIniFileCredentials({profile: 'node-s3-laptop'});
AWS.config.credentials = creds; 

// open s3 connection
var s3 = new AWS.S3({
  params: {Bucket: 'freelaw-pdfs'}
});

// get today's date yyyy/mm/dd

var today = new Date();
var dd = today.getDate();
var mm = today.getMonth()+1; //January is 0
var yyyy = today.getFullYear();
if(dd<10){
  dd='0'+dd;
} 

if(mm<10) {
  mm='0'+mm;
} 
var today = yyyy+'/'+mm+'/'+dd; 

// open database
var connection = mysql.createConnection({
  host  : process.env.DB_HOST,
  user  : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'caselaw',
  charset : 'UTF8MB4_UNICODE_CI'
});

connection.connect(function(err){});

function sleep (millis) {
  return new Promise(function (resolve) {
    setTimeout(resolve, millis)
  })
}

function doDownload (row) {
  
  return download(row.url)
  .then(data => {
    console.log("Downloading " + row.case_name_full + "\n");
    fs.writeFileSync(row.case_name_full + '.pdf', data);
    })
  
  .then(data => {
    // upload to bucket
      s3.upload(
          {
            Key: row.bucket_ref + '.pdf', 
            Body: fs.readFileSync(row.case_name_full + '.pdf')
          }, 
        function(err, data) {
          if(err) {
              return console.log("Error uploading: ", err.message);
          }
          console.log("Success uploading " + row.case_name_full + '\n');
        }
      )
    })
    
  .then(data => {
      // delete file
      var filetoDelete = row.case_name_full + '.pdf'; 
      fs.unlink(filetoDelete, function(error) {
        if(error) { throw error; }
      // set downloaded to true in downloaded table
      // problem - must leave mysql connection open
      connection.query('UPDATE downloads SET downloaded = 1 WHERE bucket_ref = ?', row.bucket_ref);
      // set pdf fetch date in cases table to current date
      connection.query('UPDATE cases SET pdf_fetch_date = ? WHERE bucket_ref = ?', ['2018/01/11', row.bucket_ref]);
      });
    });
  }

      
function lookupURLs () {
  return new Promise((resolve, reject) => {
    // Bag of promises we'll fill up
    const promises = [];
    let n = 0;

    connection.query('SELECT id, case_name_full, url, bucket_ref from downloads WHERE id < 10')
    .on('error', reject)

    .on('result', (row) => promises.push(
      sleep(delay * n++).then(() => doDownload(row))
      ))

    .on('end', () => {
      resolve(Promise.all(promises))
      })
    });
  }

lookupURLs()
    .then() // should be able to close mysql here but can't ??
    .catch(function (error) {
      console.error("Error: " + error)
    })


