"use strict";
var fs = require("fs");
var _=require("underscore");
var mysql = require('mysql');
var stringfunctions = require('./lib/string-functions');

var newGenID = 0;
var JudgmentDate = "2015/08/31";

// get year - first 4 chars of cases.JudgmentDate should be yyyy/mm/dd
var testString = "2012NZHC1234";


var insertedString = stringfunctions.insertSlash(testString, "/");

console.log(insertedString);



