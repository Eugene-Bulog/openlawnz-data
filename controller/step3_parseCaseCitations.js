/**
 * Case Citations
 * @param MysqlConnection connection
 * @param {function} cb
 */
// search through all cases and all citations
// find all double citations in the full text of each case eg R v Smith [2012] NZHC 1234, [2012] 2 NZLR 123.
// check to see if first part of match already has id in database
// if so, add second part of match to case_citation database with same id
const run = (connection, cb) => {
	console.log("Parse case citations");

	const regDoubleCites = /(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)(;|,)\s(\[|\()\d{4}(\]|\))[\s\S](\d{0,3}[\s\S])\w{1,5}[\s\S]\d{1,5}(([\s\S]\(\w*\))?)/g;
	const commaOrSemi = /,|;/g; // for splitting double citations - delimted by comma or semicolon

	// this wont scale but rewrite in sql later cos we cant be fucked right now
	connection.query(
		"select * from cases ; select * from case_citations",
		function(err, results, fields) {
			if (err) {
				cb(err);
				return;
			}

			var allCases = results[0];
			var allCitations = results[1];

			var insertQueries = [];

			function findCaseByCitation(citation) {
				return allCitations.find(function(row) {
					return row.citation === citation;
				});
			}

			allCases.forEach(function(row) {
				// if no text, quit
				if (!row.case_text) {
					return;
				}
				// regex match for all double citations inside case text
				var citationsMatch = row.case_text.match(regDoubleCites);
				// if match:
				if (citationsMatch) {
					// split into first and second citation
					var separatedCitations = citationsMatch[0].split(
						commaOrSemi
					);
					// separatedCitations[0] has first of double citation
					// separatedCitations[1] has second of double citation
					// we want to search for first citation to see if it is in the db already
					var citation = separatedCitations[0];
					var foundCase = findCaseByCitation(citation);
					if (foundCase) {
						// if there's a match - ie if the first citation is in the db, then we know we can add another citation that refers to the same case
						insertQueries.push(
							"insert into case_citations (case_id, citation) values ('" +
								foundCase.case_id +
								"', '" +
								separatedCitations[1].trim() +
								"')"
						);
					}
				}
			});
			console.log("Insert", insertQueries.length);
			if (insertQueries.length > 0) {
				connection.query(insertQueries.join(";"), function(
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
		run(connection, err => {
			connection.end();
			if (err) {
				console.log(err);
				return;
			}
			console.log("Done");
		});
	});
} else {
	module.exports = run;
}
