var AWS = require('aws-sdk');
var s3 = require('s3');
 
var creds = new AWS.SharedIniFileCredentials({profile: 'freelaw-s3'});
AWS.config.credentials = creds; 

console.log(creds.accessKeyId);