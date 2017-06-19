var fs = require('fs');
var async = require('async');

var scan = function(dir, suffix, callback) {
  fs.readdir(dir, function(err, files) {
    var returnFiles = [];
    async.each(files, function(file, next) {
      var filePath = dir + '/' + file;
      fs.stat(filePath, function(err, stat) {
        if (err) {
          return next(err);
        }
        if (stat.isDirectory()) {
          scan(filePath, suffix, function(err, results) {
            if (err) {
              return next(err);
            }
            returnFiles = returnFiles.concat(results);
            next();
          })
        }
        else if (stat.isFile()) {
          if (file.indexOf(suffix, file.length - suffix.length) !== -1) {
            returnFiles.push(filePath);
          }
          next();
        }
      });
    }, function(err) {
      callback(err, returnFiles);
    });
  });
};

scan('pdf', 'pdf', function(err, files) {
  // Do something with files that ends in '.ext'.
  console.log(files);
});