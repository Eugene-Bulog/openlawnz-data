const readFileSync = require("fs").readFileSync;

const chai = require("chai");
chai.should();
chai.use(require('chai-things'));
const expect = chai.expect;

const processCases = require("../controller/step6_parseLegislationToCases")
	.processCases;
const request = require("request");

let dataCache = {};

const getLegislation = () => {
	return new Promise((resolve, reject) => {
		if (dataCache["legislation"]) {
			resolve(dataCache["legislation"]);
		} else {
			request(
				"https://s3-ap-southeast-2.amazonaws.com/openlawnz-legislation/legislation.json",
				(err, response, body) => {
					if (err) {
						reject(err);
					} else {
						dataCache["legislation"] = JSON.parse(body).map((legislation, i) => { return {...legislation, id: i}});
						resolve(dataCache["legislation"]);
					}
				}
			);
		}
	});
};

const getTestResult = async (fileName, cb) => {
	getLegislation().then((legislation, err) => {
		if (err) {
			cb(err);
			return;
		}
		if (!dataCache[fileName]) {
			dataCache = {
				...dataCache,
				[fileName]: [
					{
						id: 1,
						case_text: readFileSync(
							`${__dirname}/data/legislation/${fileName}`,
							"utf8"
						)
					}
				]
			};
		}

		cb(null, processCases(dataCache[fileName], legislation)["1"]);
	});
};

/*
====================================================
TESTS
====================================================

getTestResult returns an array of legislation title match objects found in the case text

*/


/*
---------------------------------------------------
Plain References
---------------------------------------------------
Description:
Testing "of the" and "under the" with full legislation names

File Name: data/legislation/easy.txt
--------------------------------------------------- 
*/

describe('"under the", "of the" with following full legislation title', function() {
	it("Should contain 2 Acts", done => {
		getTestResult("complete-subsequent.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.length).equal(2);
				
			} catch(ex) {
				done(ex);
				return;
			}
			done();
		})
	})

	/*
	As per grammar section 1 a) "Subsequent ................"
	Current observed behaviour - not working if period prior ". Section"
	Doesn't change the current legislation
	*/
	it("Should contain 3 sections", done => {
		getTestResult("complete-subsequent.txt", (err, results) => {
			console.log(results)
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.find(l => l.title === "Fair Trading Act 1986").sections.length).equal(1);
				expect(results.find(l => l.title === "Evidence Act 2006").sections.length).equal(2);
			} catch(ex) {
				done(ex);
				return;
			}
			done();
		})
	})

	it("Should contain Fair Trading Act 1986 and Evidence Act 2006", done => {
		getTestResult("complete-subsequent.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			
			try {
				
				results.should.contain.a.thing.with.property('title', "Evidence Act 2006");
				results.should.contain.a.thing.with.property('title', "Fair Trading Act 1986");
				
			} catch(ex) {
				done(ex);
				return;
			}
			
			done();
		});
	});
});


return;

// mixed-section-references.txt
describe('This contains "s X", "section X", "sections X and Y", "ss X and Y" with multiple switches between acts; footnotes (converted to plaintext) inline with period; and amendment act confusion', function() {
	it("Should contain", done => {
		getTestResult("mixed-section-references.txt", (err, results) => {
			if (err) {
				console.log(err);
				done();
				return;
			}
			console.log(JSON.stringify(results, null, 4));
			//console.log();
			done();
		});
	});
});

/*
---------------------------------------------------
Inline Quotes
---------------------------------------------------
Description:
Should exclude 20 and 22 from any match due to them appearing in an excerpt from another section.

File Name: data/legislation/inline-quotes.txt
---------------------------------------------------
*/
describe('Inline Quotes', function() {
	it("Should contain", done => {
		getTestResult("mixed-section-references.txt", (err, results) => {
			if (err) {
				console.log(err);
				done();
				return;
			}
			







			done();
		});
	});
});


//
describe("This contains a reference to an act, footnoted, and then a reference to a different act. The difficulty is that footnotes appear at the bottom of a page - not at the location of the footnote. Therefore if there is a different act mentioned before the end of the page, we need to ignore it. At the end of this part, the final reference to 17 is a non-style-guide complying (ie bad writing) reference to the insolvency act, not unit titles act. Recognising from context that it relates to insolvency may be very difficult.", function() {
	it("Should contain", done => {
		getTestResult("footnotes.txt", (err, results) => {
			if (err) {
				console.log(err);
				done();
				return;
			}
			console.log(JSON.stringify(results, null, 4));
			//console.log();
			done();
		});
	});
});

//footnotes-2.txt

// describe('In the case of a section and legislation match that is the same section number as a previous section match, and there is no "under the" / "of the" following the section match, then the legislation link should be the original matched - in priority to the "current legislation". If no previous duplicate section number, currentLegislation.', function() {
// 	it("There should be 2 section 7 references to the Insolvency Act", done => {
// 		getTestResult((err, results) => {
// 			if (err) {
// 				console.log(err);
// 				done();
// 				return;
// 			}

// 			const insolvencyActReference = results["1"].find(
// 				"Insolvency Act 2016"
// 			);
// 			return (
// 				insolvencyActReference.sections.includes("s 17") &&
// 				insolvencyActReference.sections.includes("Section 17")
// 			);

// 			console.log(JSON.stringify(results, null, 4));
// 			//console.log();
// 			done();
// 		});
// 	});
// });

//
describe("Explicitly defined act, subsequent different act, reference back to explicitly defined act.", function() {
	it("Should contain", done => {
		getTestResult("explicit-references.txt", (err, results) => {
			if (err) {
				console.log(err);
				done();
				return;
			}
			console.log(JSON.stringify(results, null, 4));
			//console.log();
			done();
		});
	});
});
