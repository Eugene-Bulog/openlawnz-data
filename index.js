// this app should convert pdf to html and store in a bucket
// next step - get pdf from bucket, convert to html, store in bucket
// then - get lots of pdfs from bucket, convert each, store in bucket

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

connection.connect(function(err){});

// set rate limiting params
var queue = limits({
  minutely: 10  // allow 10 calls per minute 
});

// for testing - just do 10 cases
for(var caseid = 30; caseid < 40; caseid++) {
  
  var downloadUploadDelete = new Promise(function(resolve, reject) {
    
    connection.query('SELECT case_name_full, url, unique_id from caseinfo where caseid = ?', caseid, function(err, rows, fields) {
      if (!err) {
        console.log("Downloading: " + rows[0].case_name_full);
        
        // download file 
        // rate limit - queue.push the download function
        queue.push(function() {
          download(rows[0].url).then(data => {
            fs.writeFileSync(rows[0].case_name_full + '.pdf', data);
            // upload to bucket
            var params = {
              localFile: rows[0].case_name_full + '.pdf',
              s3Params: {
                Bucket: "nzhc-pdfs",
                Key: "2017/" + rows[0].case_name_full + ".pdf",
              },
            };
            var uploader = client.uploadFile(params);
            uploader.on('error', function(err) {
              console.error("unable to upload: " + rows[0].case_name_full, err.stack);
            });
            uploader.on('progress', function() {
              console.log("Upload progress for " + rows[0].case_name_full, (uploader.progressAmount / uploader.progressTotal) * 100);
            });

            // once done:
            uploader.on('end', function() {
              console.log("Done uploading " + rows[0].case_name_full);

              // delete local file
              var filetoDelete = rows[0].case_name_full + '.pdf'; 
              fs.unlink(filetoDelete, function(error) {
                if(error) { throw error; }

              // set downloaded = true in database (once local file deleted)
              var update = "UPDATE caseinfo SET downloaded = 1 WHERE caseid = ?";
              connection.query(update, caseid, function(err, rows, fields) {
                  if (!err) console.log("Recorded file as downloaded. \n"); 
                  else console.log("Error recording file as downloaded: " + err);
                  });  
                console.log("Deleted " + rows[0].case_name_full);
              });

            });
          });
        });
      }
      else {
        console.log("Error getting database info: " + err);
        reject(err);
      }
    }); 
  });
}

downloadUploadDelete
.then(function (resolve) {
  // if promise resolved, all done
  console.log("All done");
  connection.end();
})
.catch(function(error) {
  // promise rejected, log error
  console.log("Unable to complete: " + error);
});
// close db connnection

