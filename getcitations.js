"use strict";

// VARIABLES, DEPENDENCIES ETC
// ---------------------------
const AWS = require('aws-sdk');
const async = require("async");
const mysql = require('mysql');
const download = require('download');
const fs = require('fs');
const path = require('path');
const lib = require('./lib/functions.js');
const {execSync} = require('child_process');

require('dotenv').config();

var connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASS,
  database  : 'cases',
  charset   : 'UTF8MB4_UNICODE_CI'
});

connection.connect();

var getText = "select case_text from cases where id > ?";

var query = connection.query(getText, [2395]);

query
    .on('error', function(err) {
        console.log(err);
    })
    .on('result', function(row) {
        var case_text = (JSON.stringify(row.case_text));
        const regNeutralCite = /((?:\[\d{4}\]\s)(?:(NZDC|NZFC|NZHC|NZCA|NZSC))(?:\s(\w{1,6})))/g
        var citations = case_text.match(regNeutralCite);
        console.log(citations);
    })
    .on('end', function() {
      console.log('end');
      connection.end();
    });
