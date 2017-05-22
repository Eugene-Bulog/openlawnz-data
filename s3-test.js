"use: strict";

var dir = require('node-dir');

dir.files(__dirname, function(err, files) {
    if (err) throw err;
    console.log(files);
});
