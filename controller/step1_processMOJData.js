const { exec } = require("child_process");
const download = require("download");
const fs = require("fs");
const async = require("async");
const path = require("path");

// TODO: Fix uri encode - need to add !, (, ), ', _, * and . to encodeURIcomponent
const encodeURIfix = str => {
	return encodeURIComponent(str)
		.replace(/!/g, "%21")
		.replace(/\(/g, "%28")
		.replace(/\)/g, "%29")
		.replace(/'/g, "%27")
		.replace(/_/g, "%5F")
		.replace(/\*/g, "%2A")
		.replace(/\./g, "%2E");
};

const casesPerInstance = 10;
const maxRows = 10;
const fromDate = "2016-2-27";
const jsonURL = [
	"https://forms.justice.govt.nz/solr/jdo/select",
	"?q=*",
	"&facet=true",
	"&facet.field=Location",
	"&facet.field=Jurisdiction",
	"&facet.limit=-1",
	"&facet.mincount=1",
	"&rows=" + maxRows,
	"&json.nl=map",
	`&fq=JudgmentDate%3A%5B${fromDate}T00%3A00%3A00Z%20TO%20*%20%5D`,
	"&sort=JudgmentDate%20desc",
	"&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score",
	"&wt=json"
].join("");

/**
 * Spawns a child process to process cases array. Delays by 10 seconds before returning to ease pressure on services.
 * @param {Array} cases
 * @param {function} cb
 */
const spawnCaseProcessor = (cases, cb) => {
	console.log("Processing " + cases.length + " cases");

	const encodedCommand = encodeURIfix(JSON.stringify(cases));

	const cmd = `node index.js --cases=${encodedCommand}`;

	const e = exec(
		cmd,
		{ cwd: "../pdfToDBProcessor/" },
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err || stderr);
				return;
			}
		}
	);

	e.stdout.on("data", data => {
		if (data === "[PROCESSOR_RESULT]") {
			console.log("Delay 10 seconds before next batch");
			setTimeout(() => {
				cb();
			}, 10000);
		} else {
			console.log(data);
		}
	});
};

const run = cb => {
	console.log("Process MOJ Data");
	download(jsonURL).then(data => {
		data = JSON.parse(data.toString()).response.docs;
		const newCases = data;

		let caseArrays = [];
		while (newCases.length > 0) {
			caseArrays.push(
				newCases.splice(0, Math.min(newCases.length, casesPerInstance))
			);
		}

		async.series(
			caseArrays.map(caseArray => {
				return spawnCaseProcessor.bind(null, caseArray);
			}),
			(err, results) => {
				if (err) {
					cb(err);
					return;
				}
				cb();
			}
		);
	});
};

if (require.main === module) {
	run(err => {
		connection.end();
		if (err) {
			console.log(err);
			return;
		}
		console.log("Done");
	});
} else {
	module.exports = run;
}
