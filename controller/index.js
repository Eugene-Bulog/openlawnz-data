/**
 * @file Entry point to processing Ministry of Justice (MOJ) case data.
 * This file performs a search on the MOJ website to retrieve links to case pdf's.
 * It will then break the result into batches of (e.g.) 10, and spawn child processors to process them
 */

/**
 * IMPORTANT NOTE: Do not run this multiple times as it may affect the MOJ servers
 */

const async = require("async");

const connection = require("../lib/db.js");

const step1 = require("./step1_processMOJData");
const step2 = require("./step2_parseEmptyCitations");
const step3 = require("./step3_parseCaseCitations");
const step4 = require("./step4_parseCaseToCase");
const step5 = require("./step5_parseLegislationToCases");
const step6 = require("./step6_updateSearchIndex");

async.series(
	[
		step1,
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
		step2.bind(this, connection),
		step3.bind(this, connection),
		step4.bind(this, connection)
		//step6
	],
	err => {
		connection.end();
		if (err) {
			console.log(err);
		} else {
			console.log("Success");
		}
	}
);
