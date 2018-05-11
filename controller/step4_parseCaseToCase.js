/**
 * Case to Case
 * @param MysqlConnection connection
 * @param {function} cb
 */
// populate the case_to_case table
// that table has two fields - case_id_1 and case_id_2 both integers and foreign keys referencing ids in the cases table
// case_id_1 is the referencing case
// case_id_2 is the case being referenced
const process = (connection, cb) => {
	console.log("Parse case to case");
	connection.query(
		"select * from cases; select * from case_citations",
		function(err, results, fields) {
			if (err) {
				cb(err);
				return;
			}

			var allCases = results[0];
			var allCitations = results[1];

			var insertQueries = [];

			allCases.forEach(function(caseRow) {
				// go through each case, check for blank text
				if (!caseRow.case_text) {
					return;
				}
				// assuming no blank text, inside each case look at all citation records in the db
				// see if any citations in the db are present in the case text
				allCitations.forEach(function(citationRow) {
					// match against caseRow.case_text, and only match if the ids are not identical (dont need to add a case's reference to itself)
					if (citationRow.citation) {
						// so indexOf returns if partial match of citation
						// searching through full text for presence of a shorter citation eg [2017] NZHC 5, will return for 50, 51 etc and 500 and so on
						// so add a period, space, comma and semicolon to the end of each citation and search for those instead
						// very efficient, much fast
						var x = citationRow.citation.concat(".");
						var y = citationRow.citation.concat(" ");
						var z = citationRow.citation.concat(",");
						var w = citationRow.citation.concat(";");
					}
					if (
						(caseRow.case_text.indexOf(x) !== -1 ||
							caseRow.case_text.indexOf(y) !== -1 ||
							caseRow.case_text.indexOf(z) !== -1 ||
							caseRow.case_text.indexOf(w) !== -1) &&
						citationRow.case_id != caseRow.id
					) {
						//
						// here, we need to check for duplicates already in the case_to_case table?
						// the script will likely be run regularly across the whole db (to account for new citations being added)
						// this will result in duplicate entries
						//
						insertQueries.push(
							"insert into case_to_case (case_id_1, case_id_2) values ('" +
								caseRow.id +
								"', '" +
								citationRow.case_id +
								"')"
						);
					}
				});
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
