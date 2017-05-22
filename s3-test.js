"use: strict";

var dir = require('node-dir');

console.log(dir.files("pdf", function(err,files){
      if (err) throw err;
    }))