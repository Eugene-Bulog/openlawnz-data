"use strict";

const AWS = require('aws-sdk');
const async = require("async");
const mysql = require('mysql');
const download = require('download');
const fs = require('fs');
const path = require('path');
const lib = require('./lib/functions.js');
const { execSync } = require('child_process');
const argv = require('yargs').argv;

require('dotenv').config();

const casesToProcess = JSON.parse(decodeURIComponent(argv.cases)) //sec hmmm

// remember, charset should be utf8mb4 in db and connection
// and edit my.cnf on any new mysql sever https://mathiasbynens.be/notes/mysql-utf8mb4
//mysql connect
var connection = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: 'cases',
	charset: 'UTF8MB4_UNICODE_CI'
});

connection.connect();

// edit for different computers
// we could pass this in as an argument
var creds = new AWS.SharedIniFileCredentials({ profile: 'node-s3' });
//var creds = new AWS.SharedIniFileCredentials({profile: argv.s3Profile });

AWS.config.credentials = creds;

var s3 = new AWS.S3({
	params: { Bucket: 'freelaw-pdfs' }
});

function processCase(caseData, cb) {

	let caseItem = {};

	process.stdout.write("processing case \n")
	process.stdout.write(JSON.stringify(caseData));
	process.stdout.write("\n\n");

	async.series([

		// download file
		function (cb) {
			//process.stdout.write('downloading file\n')
			const url = lib.getMOJURL(caseData.id)
			const bucket_key = lib.slashToDash(caseData.id);
			caseItem.bucket_key = bucket_key;

			download(url).then(data => {
				fs.writeFileSync('../cache/' + bucket_key, data);
				cb();
			})
		},

		// Run program text extract
		function (cb) {
			//process.stdout.write("extracting text\n")

			try {
				const pathtopdf = path.resolve('../xpdf/bin64/pdftotext');
				const pathtocache = path.resolve('../cache/');

				//process.stdout.write("stdout\n" + pathtopdf + " " + pathtocache + "/" + caseItem.bucket_key + "\n")

				const child = execSync(pathtopdf + " " + pathtocache + "/" + caseItem.bucket_key);
				
				//process.stdout.write(child.toString())
				const noExtension = caseItem.bucket_key.replace(/\.pdf/g, '');
				const case_text = fs.readFileSync("../cache/" + noExtension + ".txt", "utf8");
				caseItem.case_text = case_text;
				cb();
			} catch (ex) {
				cb(ex);

			}

		},

		// upload to bucket
		function (cb) {
			//process.stdout.write("uploading to s3\n");
			try {					
					s3.upload({
					Key: caseItem.bucket_key,
					Body: fs.readFileSync('../cache/' + caseItem.bucket_key)
				}, cb) 
				//process.stdout.write("uploaded\n")
			}  
				catch (ex) {cb(ex)} 
		}, 

		// delete local
		function (cb) {
			try {
				//process.stdout.write("deleting local file\n");
				fs.unlinkSync('../cache/' + caseItem.bucket_key);
				const noExtension = caseItem.bucket_key.replace(/\.pdf/g, '');
				// fs.unlinkSync("../cache/" + noExtension + ".txt"); just keep text files while testing? k
				cb();
			} catch (ex) {
				cb(ex)
			}
		}, 


		// tidy up object
		function (cb) {
			//process.stdout.write("tidying object\n");
			caseItem.pdf_fetch_date = new Date();
			caseItem.case_name = caseData.CaseName ? lib.formatName(caseData.CaseName) : "Unknown case";
			// maybe rename table (and this) to be case_initial_citation ie the first citation found (if any)
			caseItem.case_neutral_citation = caseData.CaseName ? lib.getCitation(caseData.CaseName) : "";
			caseItem.case_date = caseData.JudgmentDate;

			cb();
		},
		// oh yeah also remember callback in other bit isnt working
		// insert case into database
		function (cb) {
			//process.stdout.write("inserting into database\n");
			try {
				connection.query('INSERT INTO cases SET ?', caseItem, function (err, result) {

				if (err) { cb(err); return; }

				caseItem.id = result.insertId;

				cb();

			});
		} catch (ex) {cb(ex)}
		}
	], cb)

}


async.parallel(casesToProcess.map(caseItem => {

	return processCase.bind(null, caseItem)

}), (err, results) => {

	connection.end();

	if (err) {
		process.stderr.write(`[PROCESSOR_RESULT]${err}`);
	} else { 
		process.stdout.write(`[PROCESSOR_RESULT]${JSON.stringify(results)}`);
	}

	process.exit();

})

