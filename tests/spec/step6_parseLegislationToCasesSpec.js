const readFileSync = require("fs").readFileSync;
const assert = require("assert");
const processCases = require("../../controller/step6_parseLegislationToCases")
	.processCases;
const request = require("request");

let cache;

const getTestResult = cb => {
	if (cache) {
		cb(null, processCases(cache.cases, cache.legislation)["1"]);
	} else {
		request(
			"https://s3-ap-southeast-2.amazonaws.com/openlawnz-legislation/legislation.json",
			(err, response, body) => {
				if (err) {
					cb(err);
					return;
				}

				cache = {
					cases: [
						{
							id: 1,
							case_text: readFileSync(
								__dirname + "/data/legislation-to-cases.txt",
								"utf8"
							)
						}
					],
					legislation: JSON.parse(body)
				};

				cb(null, processCases(cache.cases, cache.legislation)["1"]);
			}
		);
	}
};

describe("Legislation tests", function() {
	it("Should do x", done => {
		getTestResult((err, results) => {
			if (err) {
				console.log(err);
				done();
				return;
			}
			//console.log(JSON.stringify(results, null, 4));
			expect(results.length).toEqual(4);
			done();
		});
	});
});
