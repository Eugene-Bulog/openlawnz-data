const request = require("request");

/**
 * Parse Legislation
 * @param MysqlConnection connection
 * @param {function} cb
 */
// populate the legislation table from API crawler
const run = (connection, cb) => {
	console.log("Parse legislation");

	request(
		`https://api.apify.com/v1/${process.env.APIFY_USER_ID}/crawlers/${
			process.env.APIFY_CRAWLER_ID
		}/lastExec/results?token=${process.env.APIFY_TOKEN}`,
		function(err, response, body) {
			if (err) {
				cb(err);
				return;
			}

			body = JSON.parse(body);

			const allLegislation = Array.prototype.concat.apply(
				[],
				body.map(b => b.pageFunctionResult)
			);

			let insertQueries = [];

			allLegislation.forEach(legislation => {
				insertQueries.push(
					`insert into legislation (title, link, year, alerts) values ("${
						legislation.title
					}", "${legislation.link}", "${legislation.year}", "${
						legislation.alerts
					}")`
				);
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
