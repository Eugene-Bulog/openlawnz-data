// this app should convert pdf to html and store in a bucket
// next step - get pdf from bucket, convert to html, store in bucket
// then - get lots of pdfs from bucket, convert each, store in bucket

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
var pdftohtml = require('pdftohtmljs');
var AWS = require('aws-sdk');
var s3 = require('s3');
var async = require("async");
var mysql = require('mysql');
var limits = require('limits.js');

// load creds
require('dotenv').config();

// get aws creds - set profile, using profile set from ~/.aws/credentials
var creds = new AWS.SharedIniFileCredentials({profile: 'freelaw-s3'});
AWS.config.credentials = creds; 

/// get an array of pdf files from database
var connection = mysql.createConnection({
    host  : process.env.DB_HOST,
    user  : process.env.DB_USER,
    password  : process.env.DB_PASS,
    database  : 'caselaw'
  });

for(var caseid = 1; caseid < 5; caseid++) {

connection.query('SELECT case_name_full, url from caseinfo where caseid = ?', caseid, function(err, rows, fields) {
    if (!err) {
        console.log("Downloading: " + rows[0].case_name_full);
         
    }
    else console.log("Error getting database info: " + err);
    }); 

}

connection.end();

    /*
var FILES = ["1.pdf"];

// Needs relative file paths to convert
var FILE_INPUT_DIR =  "../convert";
var FILE_OUTPUT_DIR = "./html";

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

function process(inputFileName, cb){

    console.log("Converting:"); 
    
    var inputFile = FILE_INPUT_DIR + "/" + inputFileName;
    var outputFile = FILE_OUTPUT_DIR + "/" + inputFileName + ".html";

    console.log(inputFile + " =>\n\t " + outputFile);

    var converter = new pdftohtml(inputFile, outputFile);

    converter.convert('ipad').then(function() {

        console.log("Uploading: " + outputFile);
        
        var uploader = client.uploadFile({
            localFile: outputFile,
            s3Params: {
                Bucket: "nzhc-pdfs",
                Key: inputFileName + ".html"
            },
        });

        uploader.on('error', function(err) {
            cb("unable to upload:", err.stack);
        });

        uploader.on('progress', function() {
            console.log("progress", uploader.progressMd5Amount, uploader.progressAmount, uploader.progressTotal);
        });
    
        uploader.on('end', function() {
            cb(null);
        });



    }).catch(function(err) {
        console.log(err["code"]);
        cb("Conversion error: " + err)

    });    
}

// Run the process for each FILES item

async.parallel(FILES.map(function(f) { return process.bind(null, f ); } ), function(err, results) {

    if(err) {
        console.log(err);
        return;
    }

    console.log("Done broooo");

} );

*/