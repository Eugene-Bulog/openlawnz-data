/**
 * Fill empty citations
 * @param MysqlConnection connection
 * @param {function} cb
 */
// search for rows in the case_citations table where citation is blank
// get the full case data including case text
// trim the case text to first 200 characters and look for a neutral citation there
// if found, add that citation to case_citations table
const process = (connection, cb) => {
	console.log("Parse empty citations");
	connection.query(
		"select * from cases INNER JOIN case_citations ON case_citations.case_id = cases.id WHERE case_citations.citation = ''",
		function(err, results, fields) {
			if (err) {
				cb(err);
				return;
			}
			// array of mysql update statements
			let updateCitations = [];

			results.forEach(function(row) {
				if (!row.case_text) {
					//return console.log("No text to parse for missing citation")
					cb();
					return;
				}

				const case_text = JSON.stringify(row.case_text).substr(0, 300);
				// regex for neutral citation
				const regNeutralCite = /((?:\[\d{4}\]\s*)(?:(NZDC|NZFC|NZHC|NZCA|NZSC|NZEnvC|NZEmpC|NZACA|NZBSA|NZCC|NZCOP|NZCAA|NZDRT|NZHRRT|NZIACDT|NZIPT|NZIEAA|NZLVT|NZLCDT|NZLAT|NZSHD|NZLLA|NZMVDT|NZPSPLA|NZREADT|NZSSAA|NZSAAA|NZTRA))(?:\s*(\w{1,6})))/g;
				let citation = case_text.match(regNeutralCite);
				// for now, limit to the first citation found (in case double citation appears in header - deal with double citations in header later)
				citation = citation[0];
				// add to array of update statements
				updateCitations.push(
					"update case_citations set citation = '" +
						citation +
						"' where case_id = '" +
						row.id +
						"'"
				);
			});
			console.log("Update", updateCitations.length);
			if (updateCitations.length > 0) {
				connection.query(updateCitations.join(";"), function(
					err,
					results,
					fields
				) {
					if (err) {
						cb(err);
						return;
					}
					cb();
				});
				// console.log(updateCitations);
			} else {
				cb();
			}
		}
	);
};

if (require.main === module) {
	const connection = require("../lib/db");
	connection.connect(err => {
		if (err) {
			console.log("Error connecting");
			return;
		}
		process(connection, err => {
			connection.end();
			if (err) {
				console.log(err);
				return;
			}
			console.log("Done");
		});
	});
} else {
	module.exports = process;
}
