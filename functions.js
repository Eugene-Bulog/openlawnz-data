// OLD UPLOAD LOCAL DIR TO BUCKET SCRIPT - NOT USED

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