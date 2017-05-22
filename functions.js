// this app should convert pdf to html and store in a bucket
// next step - get pdf from bucket, convert to html, store in bucket
// then - get lots of pdfs from bucket, convert each, store in bucket

"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
var pdftohtml = require('pdftohtmljs');
var AWS = require('aws-sdk');
var s3 = require('s3');

// get aws creds - set profile, using profile set from ~/.aws/credentials
var creds = new AWS.SharedIniFileCredentials({profile: 'freelaw-s3'});
AWS.config.credentials = creds; 

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

// FUNCTIONS 
// ---------------------------

// CONVERSION
// function doConvert converts a file from PDF to HTML
// takes input fileName, outputs to fileOutput



function doConvert(fileName, fileOutput, callback){
    
    console.log("Converting..."); 
    
    var converter = new pdftohtml(fileName, fileOutput);
    // preset using 'default' pdf2htmlEX settings
    // see https://github.com/fagbokforlaget/pdftohtmljs/blob/master/lib/presets/ 
    // convert() returns promise 
    converter.convert('default').then(function() {
        console.log("Success");
        }).catch(function(err) {
        console.error("Conversion error: " + err);
    });    
}

// call the function to convert 

doConvert('../convert/175.pdf', '../conversions/175-2.html', copytos3('../conversions/175-2.html'));

// AWS S3 THINGS
// function copytos3
// copies file at path localFile to bucket and key defined in s3Params

function copytos3(convertedFile) {   

    // take the converted file and copy it to s3
    var params = {
    localFile: convertedFile,
    
    s3Params: {
        Bucket: "nzhc-pdfs",
        Key: "file-upload-test/175-2.html",
        // other options supported by putObject, except Body and ContentLength. 
        // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property 
    },
    };
    var uploader = client.uploadFile(params);
    uploader.on('error', function(err) {
    console.error("unable to upload:", err.stack);
    });
    uploader.on('progress', function() {
    console.log("progress", uploader.progressMd5Amount,
                uploader.progressAmount, uploader.progressTotal);
    });
    uploader.on('end', function() {
    console.log("done uploading");
    });


    

    }
