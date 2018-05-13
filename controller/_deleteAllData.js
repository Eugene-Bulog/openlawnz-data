const connection = require("../lib/db.js");

console.log("Truncating all tables");
connection.connect(err => {
	if (err) {
		console.log(err);
		process.exit();
	}

	connection.query(
		"SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE legislation_to_cases; TRUNCATE TABLE legislation; TRUNCATE TABLE case_to_case; TRUNCATE TABLE case_citations; TRUNCATE TABLE cases; SET FOREIGN_KEY_CHECKS = 1;",
		function(err, results, fields) {
			if (err) {
				console.log(err);
			} else {
				console.log("Done");
			}
			process.exit();
		}
	);
});
