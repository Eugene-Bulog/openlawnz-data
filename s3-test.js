"use: strict";

var dir = require('node-dir');

dir.files("pdf", function(err, files) {
    if (err) throw err;
    console.log(files);
});
