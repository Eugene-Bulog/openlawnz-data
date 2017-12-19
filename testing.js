"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const   pdftohtml = require('pdftohtmljs'),
AWS = require('aws-sdk'),
s3 = require('s3'),
async = require("async"),
mysql = require('mysql'),
limits = require('limits.js'),
download = require('download'),
fs = require('fs');

// load creds
require('dotenv').config();

// get aws creds - set profile, using profile set from ~/.aws/credentials
var creds = new AWS.SharedIniFileCredentials({profile: 'freelaw-s3'});
AWS.config.credentials = creds; 

// open s3 connection
var client = s3.createClient({
    maxAsyncS3: 20,     // this is the default 
    s3RetryCount: 3,    // this is the default 
    s3RetryDelay: 1000, // this is the default 
    multipartUploadThreshold: 20971520, // this is the default (20 MB) 
    multipartUploadSize: 15728640, // this is the default (15 MB) 
    s3Options: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
  
// open database
var connection = mysql.createConnection({
  host  : process.env.DB_HOST,
  user  : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'caselaw'
});

// set rate limiting params
var queue = limits({
    minutely: 10  // allow 10 calls per minute 
  });

var testPromise = new Promise(function(resolve, reject) {

    var query = connection.query('SELECT case_name_full, url, unique_id from caseinfo where caseid > 20 AND caseid < 26');

    query
        .on('error', function(err) {
            console.log("No records found: " + err);
            reject(err);
        })
        .on('result', function(rows) {
            
            queue.push(function() {

                download(rows.url).then(data => {
                    fs.writeFileSync(rows.case_name_full + '.pdf', data);
                    
                    // upload to bucket
                    var params = {
                        localFile: rows.case_name_full + '.pdf',
                        s3Params: {
                        Bucket: "nzhc-pdfs",
                        Key: "2017/" + rows.case_name_full + ".pdf",
                        },
                    };

                    var uploader = client.uploadFile(params);
                    uploader.on('error', function(err) {
                        console.error("unable to upload: " + rows.case_name_full, err.stack);
                    });

                    uploader.on('progress', function() {
                        console.log("Upload progress for " + rows.case_name_full, (uploader.progressAmount / uploader.progressTotal) * 100);
                    });
        
                    // once done:
                    uploader.on('end', function() {
                        console.log("Done uploading " + rows.case_name_full);
                        // delete local file
                        var filetoDelete = rows.case_name_full + '.pdf'; 
                        fs.unlink(filetoDelete, function(error) {
                        if(error) { throw error; } 
                        })
                    });
                });
            });
        })
        .on('end', function() {    
            resolve();
        });
    });

testPromise
    .then(function(resolve) {
        console.log("MYSQL query processed");
        connection.end();
    })
    .catch(function(error) {
        // promise rejected, log error
        console.log("Unable to complete: " + error);
    });