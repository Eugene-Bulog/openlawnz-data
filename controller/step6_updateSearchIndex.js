const AWS = require("aws-sdk");
const async = require("async");

/**
 * Update Search Index
 * @param MysqlConnection connection
 * @param {function} cb
 */
// generate a search index for aws cloudsearch
// pull case citations table
// generate instructions for cloudsearch - delete all records, add from db
// todo - could generate index for casetext and other data at same time

// https://search-citation-domain-1-b24hkvngoviziex6hkbzitcejq.ap-southeast-2.cloudsearch.amazonaws.com/2013-01-01/search?q=[2017]%20NZHC%203297
const process = (connection, cb) => {
	console.log("Update search index");
	require("dotenv").config({ path: __dirname + "/../.env" });

	var creds = new AWS.SharedIniFileCredentials({
		profile: process.env.AWS_PROFILE
	});

	if (!creds.accessKeyId) {
		cb("Invalid AWS credentials");
		return;
	}

	AWS.config.credentials = creds;

	var cloudsearchdomain = new AWS.CloudSearchDomain({
		region: "ap-southeast-2",
		endpoint:
			"search-citation-domain-1-b24hkvngoviziex6hkbzitcejq.ap-southeast-2.cloudsearch.amazonaws.com"
	});

	function chunk(arr, chunkSize) {
		var R = [];
		for (var i = 0, len = arr.length; i < len; i += chunkSize)
			R.push(arr.slice(i, i + chunkSize));
		return R;
	}

	function uploadBatches(data, cb) {
		const batches = chunk(data, 1000);
		console.log(
			"Process batches",
			batches.map(batch => batch.length).join(",")
		);
		//console.log(batches[0])
		async.series(
			batches.map(batchObject => {
				return function(cb) {
					cloudsearchdomain.uploadDocuments(
						{
							contentType: "application/json",
							documents: JSON.stringify(batchObject)
						},
						function(err, data) {
							if (err) {
								cb(err);
							} else {
								cb();
							}
						}
					);
				};
			}),
			function(err) {
				if (err) {
					cb(err);
					return;
				}
				cb();
			}
		);
	}

	async.series(
		[
			function(cb) {
				console.log("Deleting...");
				// REMINDER: When we are uploading more than 10000, we need to paginate this
				cloudsearchdomain.search(
					{
						query: "(matchall)",
						queryParser: "structured",
						size: 10000
					},
					function(err, data) {
						var result = [];
						if (err) {
							console.log("Failed");
							console.log(err);
						} else {
							for (var i = 0; i < data.hits.hit.length; i++) {
								result.push({
									type: "delete",
									id: data.hits.hit[i].id
								});
							}
							console.log("Found results", data.hits.hit.length);
							if (result.length > 0) {
								uploadBatches(result, cb);
							} else {
								cb();
							}
						}
					}
				);
			},

			function(cb) {
				console.log("Uploading...");
				var obj = [];
				connection.query(
					"select * from case_citations where citation IS NOT NULL",
					function(error, results, fields) {
						if (error) {
							console.log("mysql error", error);
						}
						for (var i = 0; i < results.length; i++) {
							var itemData = JSON.parse(
								JSON.stringify(results[i])
							);

							var item = {
								type: "add",
								id:
									"citation-" +
									itemData.case_id +
									"-" +
									Math.floor(Math.random() * 999999),
								fields: {
									case_id: itemData.case_id,
									citation: itemData.citation
								}
							};

							obj.push(item);
						}
						uploadBatches(obj, cb);

						// here, could do stuff with case text
					}
				);
			}
		],
		err => {
			if (err) {
				cb(err);
				return;
			}
			cb();
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
