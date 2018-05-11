"use strict";

const AWS = require("aws-sdk");
const async = require("async");
const download = require("download");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const argv = require("yargs").argv;
require("dotenv").config({ path: __dirname + "/../.env" });

const lib = require("../lib/functions.js");
const connection = require("../lib/db.js");

const criticalError = msg => {
	process.stderr.write(
		typeof msg !== "string" ? JSON.stringify(msg, null, 4) : msg
	);
	process.exit();
};

const log = msg => {
	process.stdout.write(
		typeof msg !== "string" ? JSON.stringify(msg, null, 4) : msg
	);
};

if (!argv.cases) {
	criticalError("No cases passed in with --cases argument");
}

const cacheDir = "../.cache";

const casesToProcess = JSON.parse(decodeURIComponent(argv.cases));

const creds = new AWS.SharedIniFileCredentials({
	profile: process.env.AWS_PROFILE
});

if (!creds.accessKeyId) {
	criticalError("Invalid AWS credentials");
}

AWS.config.credentials = creds;

const s3 = new AWS.S3({
	params: { Bucket: process.env.AWS_S3_BUCKET }
});

fs.existsSync(cacheDir) || fs.mkdirSync(cacheDir);

const processPDFAndInsertIntoDatabase = (caseData, cb) => {
	let caseItem = {};
	let caseCitation = {};

	async.series(
		[
			/**
			 * Download PDF from MOJ
			 */
			cb => {
				const url = lib.getMOJURL(caseData.id);
				const bucket_key = lib.slashToDash(caseData.id);
				caseItem.bucket_key = bucket_key;

				if (fs.existsSync(`${cacheDir}/${bucket_key}`)) {
					cb();
					return;
				}

				download(url)
					.then(data => {
						fs.writeFileSync(`${cacheDir}/${bucket_key}`, data);
						cb();
					})
					.catch(err => {
						cb(err);
					});
			},

			/**
			 * Convert PDF to text
			 */
			cb => {
				const pathtopdf = path.resolve("../xpdf/bin64/pdftotext");
				const pathtocache = path.resolve(cacheDir);

				const child = execSync(
					pathtopdf + " " + pathtocache + "/" + caseItem.bucket_key
				);

				//process.stdout.write(child.toString())
				const noExtension = caseItem.bucket_key.replace(/\.pdf/g, "");
				const case_text = fs.readFileSync(
					`${cacheDir}/${noExtension}.txt`,
					"utf8"
				);
				caseItem.case_text = case_text;
				cb();
			},

			/**
			 * Upload to S3
			 */
			cb => {
				s3.upload(
					{
						Key: caseItem.bucket_key,
						Body: fs.readFileSync(
							`${cacheDir}/${caseItem.bucket_key}`
						)
					},
					cb
				);
			},

			/**
			 * Delete cached item
			 */
			cb => {
				fs.unlinkSync(`${cacheDir}/${caseItem.bucket_key}`);
				cb();
			},

			/**
			 * Tidy object
			 */
			cb => {
				// process.stdout.write("tidying object\n");
				caseItem.pdf_fetch_date = new Date();
				caseItem.case_name = caseData.CaseName
					? lib.formatName(caseData.CaseName)
					: "Unknown case";
				// maybe rename table (and this) to be case_initial_citation ie the first citation found (if any)
				caseCitation.citation = caseData.CaseName
					? lib.getCitation(caseData.CaseName)
					: "";
				caseItem.case_date = caseData.JudgmentDate;

				cb();
			},

			/**
			 * Insert case into database
			 */
			cb => {
				connection.query("INSERT INTO cases SET ?", caseItem, function(
					err,
					result
				) {
					if (err) {
						cb(err);
						return;
					}
					caseCitation.case_id = result.insertId;
					caseItem.id = result.insertId;
					cb();
				});
			},

			/**
			 * Insert case citation into database
			 */
			cb => {
				connection.query(
					"INSERT INTO case_citations SET ?",
					caseCitation,
					function(err, result) {
						if (err) {
							cb(err);
							return;
						}
						cb();
					}
				);
			}
		],
		cb
	);
};

async.series(
	[
		/**
		 * Connect to DB
		 */
		cb => {
			connection.connect(err => {
				if (err) {
					cb(err);
					return;
				}
				cb();
			});
		},

		/**
		 * Process PDF's and insert into database
		 */
		cb => {
			async.parallel(
				casesToProcess.map(caseItem => {
					return processPDFAndInsertIntoDatabase.bind(null, caseItem);
				}),
				(err, results) => {
					if (err) {
						cb(err);
						return;
					}

					cb();
				}
			);
		}
	],
	err => {
		connection.end();
		if (err) {
			criticalError(err);
			return;
		}

		log("[PROCESSOR_RESULT]");

		process.exit();
	}
);
