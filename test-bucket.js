// upload a file to an s3 bucket
// nb - uses default credentials at ~./aws/credentials

var AWS = require('aws-sdk');
var s3 = new AWS.S3();

// bucket name
var myBucket = 'nzhc-pdfs';

// file key (path and name)
var myKey = 'file-upload-test';

// file content
var myBody = 'Hello!';

// put myKey into myBucket
s3.putObject({Bucket: myBucket, Key: myKey, Body: myBody}, function(err, data) {

    if (err) {

        console.log(err)

    } else {

        console.log("Successfully uploaded data to " + myBucket + " - " + myKey);

    }

});
