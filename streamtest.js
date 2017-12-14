var streamToS3 = require('stream-to-s3');
var file = '/convert/1.pdf';      // any file format! 
streamToS3(file, function(err, url) { // url is the url of the file on S3 
  console.log(file, ' Was uploaded to S3. Visit:', url);
});