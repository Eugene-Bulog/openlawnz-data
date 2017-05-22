var AWS = require('aws-sdk');
var s3 = require('s3');
 
var creds = new AWS.SharedIniFileCredentials({profile: 'freelaw-s3'});
AWS.config.credentials = creds; 

function dos3stuff() {
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

    // take the converted file and copy it to s3
    var params = {
    localFile: 'samples/olsson.pdf',
    
    s3Params: {
        Bucket: "nzhc-pdfs",
        Key: "file-upload-test/stamp.pdf",
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

dos3stuff();