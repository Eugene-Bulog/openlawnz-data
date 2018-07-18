const readFileSync = require("fs").readFileSync;

const chai = require("chai");
chai.should();
chai.use(require("chai-things"));
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
						dataCache["legislation"] = JSON.parse(body).map(
							(legislation, i) => {
								return { ...legislation, id: i };
							}
						);
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
Basic References
---------------------------------------------------
Description:
Testing explicit, full references - that is, section and number followed by full definition of act with "of the", "in the" or "under the" between the two.

Sections can have numbers and letters, for example section 47A (which is a separate section from section 47). Brackets deliniate subsections, so regex should match on any numbers or letters up to the first white space or punctuation (period, bracket, comma etc)

Sections have subsections - section 58(2) is a part of section 58. For now, subsections can be ignored and effectively attached to the main section - so in that case, treat 58(2) as a reference to section 58.

Sections might be referred to as "section X" or "s X" or "sX"
(A later test covers multiple sections and ranges)

Expected results: 
1. Section 5, Protection of Personal and Property Rights Act 1988;
2. Section 57, Evidence Act 2006 (ignore the .1 as it is a footnote)
3. Section 58, Evidence Act 2006.
4. Section 47A, Care of Children Act 2004

File Name: data/legislation/1-basic-references.txt
--------------------------------------------------- 
*/

describe('Full, basic references: "in the", under the", and "of the" with following full legislation title', function() {
	it("Should return 3 Acts", done => {
		getTestResult("1-basic-references.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.length).equal(3);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});

	it("Should return Protection of Personal and Property Rights Act 1988, Evidence Act 2006, Care of Children Act 2004", done => {
		getTestResult("1-basic-references.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Protection of Personal and Property Rights Act 1988")).equal(true);
				expect(results.some(ref => ref.title === "Evidence Act 2006")).equal(true);
				expect(results.some(ref => ref.title === "Care of Children Act 2004")).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}

			done();
		});
	});

	it("Should return section 5 of the PPPR Act, sections 57 and 58 of the Evidence Act, s47 of the Care of Children Act", done => {
		getTestResult("1-basic-references.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Protection of Personal and Property Rights Act 1988" &&
					ref.sections.some(section => section.id == "5" && section.count === 1))).equal(true);

				expect(results.some(ref => ref.title === "Care of Children Act 2004" &&
				ref.sections.some(section => section.id == "47A" && section.count === 1))).equal(true);

				expect(results.some(ref => ref.title === "Evidence Act 2006" &&
				ref.sections.some(section => section.id == "57" && section.count === 1) &&
				ref.sections.some(section => section.id == "58" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
"The Act"
---------------------------------------------------
Description:
Sometimes an Act is the only or the primary Act being discussed in a case. It is referred to as "the Act". 
For example, the Care of Children Act 2004 (the Act); or Care of Children Act 2004 ("the Act").
Thereafter, "the Act" (without quotes) should trigger the same logic as the full Act title. So, section 15 of the Act is equivalent to section 15 of the Care of Children Act 2004.

Expected results:
Section 5 of the Protection of Personal and Property Rights Act 1988

File Name: data/legislation/2-the-act.txt
--------------------------------------------------- 
*/

describe('Testing "the Act" definition', function() {
	it("Should return section 5 of the Protection of Personal and Property Rights Act 1988", done => {
		getTestResult("2-the-act.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Protection of Personal and Property Rights Act 1988" &&
				ref.sections.some(section => section.id == "5" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Defined terms
---------------------------------------------------
Description:
Sometimes an Act is given a shorthand descriptor other than "the Act".
For example, the Care of Children Act 2004 (COCA); or Care of Children Act 2004 ("COCA").
Thereafter, "COCA" (without quotes) should trigger the same logic as the full Act title. So, section 15 of the COCA is equivalent to section 15 of the Care of Children Act 2004.

Expected results:
Section 5 of the Protection of Personal and Property Rights Act 1988 (explicit definition)
Section 6 of the Protection of Personal and Property Rights Act 1988 (via defined term)
Section 48 of the Care of Children Act 2004

File Name: data/legislation/3-defined-term.txt
--------------------------------------------------- 
*/

describe("Testing defined terms", function() {
	it("Should return sections 5 and 6 of the Protection of Personal and Property Rights Act, and section 48 of Care of Children Act 2004", done => {
		getTestResult("3-defined-term.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Protection of Personal and Property Rights Act 1988" &&
				ref.sections.some(section => section.id == "5" && section.count === 1) &&
				ref.sections.some(section => section.id == "6" && section.count === 1))).equal(true);
				expect(results.some(ref => ref.title === "Care of Children Act 2004" &&
				ref.sections.some(section => section.id == "48" && section.count === 1))).equal(true);
				
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Subsequent references 
---------------------------------------------------
Description:
Sometimes a section is given after the Act name rather than before. For example, [act name], [section].

Expected results:
Section 12, Evidence Act 2006

File Name: data/legislation/4-subsequent-reference.txt
--------------------------------------------------- 
*/

describe("Testing subsequent reference", function() {
	it("Should return section 12 of the Evidence Act 2006", done => {
		getTestResult("4-subsequent-reference.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Evidence Act 2006" &&
				ref.sections.some(section => section.id == "12" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Subsequent references - defined term
---------------------------------------------------
Description:
A combination of test 2 and 4 - [the Act], [section] - rather than [section] of the Act
A combination of test 3 and 4 - [defined term], [section] - rather than [section] of the [defined term]

Expected results:
Protection of Personal and Property Rights Act 1988, section 11. 
Care of Children Act 2004, section 48.

File Name: data/legislation/5-subsequent-reference-defined.txt
--------------------------------------------------- 
*/

describe("Testing subsequent reference with defined terms", function() {
	it("Should return section 11 of the Protection of Personal and Property Rights Act and section 48 of the Care of Children Act", done => {
		getTestResult("5-subsequent-reference-defined.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Care of Children Act 2004" &&
				ref.sections.some(section => section.id == "48" && section.count === 1))).equal(true);
				expect(results.some(ref => ref.title === "Protection of Personal and Property Rights Act 1988" &&
				ref.sections.some(section => section.id == "11" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Delayed references - "backup option"
---------------------------------------------------
Description:
An Act might be mentioned well before a section. It might be mentioned at the start of a page, paragraph or sentence - in fact at any arbitrary number of characters prior to the section reference appearing. There needs to be a default / backup option for associating a section number with the relevant Act if it is not explicitly defined or immediately apparent.

The suggested approach is that if no higher priority tests are triggered, and an Act has been previously mentioned in the text, then that Act. Those higher priority tests would be:
1. Basic full references (test 1)
2. The Act / defined terms in the same logic (ie, section 5 of the [defined term]) (test 2 and 3)
3. Immediately subsequent references with or without defined term (test 4 and 5)

For example:
// A limit on jurisdiction appears in the Protection of Personal and Property Rights Act 1988 although not until the end of part 1, at section 11(2).

This text should be parsed by discovering the Act name, and storing it somewhere until overriden by another Act name (or defined term) or higher priority section reference. When the parser reaches section 11(2), it should lookup the "current legislation name" variable to associate section 11 with the Protection of Personal and Property Rights Act 1988.

Note: the "current legislation name" must be updated where an Act name appears but cannot be only via an exclusively sequential assessment. For example the above text might be followed by a basic reference, e.g:

// A limit on jurisdiction appears in the Protection of Personal and Property Rights Act 1988 although not until the end of part 1, at section 11(2). Section 5 of the Evidence Act 2006 ....

There, section 5 is "of the Evidence Act". That is a basic reference that should *not* trigger this test, but *should* update the "current legislation" variable for later references. For example:

// A limit on jurisdiction appears in the Protection of Personal and Property Rights Act 1988 although not until the end of part 1, at section 11(2). Section 5 of the Evidence Act 2006 is confusing. As is section 6.

Here, both section 11(2) and section 6 will be linked to whatever the "current legislation" variable is when those points are reached. Section 5 is a defined term. 

Expected results:
Protection of Personal and Property Rights Act 1988, section 11. 
Evidence Act 2006, Section 5
Evidence Act 2006, Section 6

File Name: data/legislation/6-delayed-reference.txt
--------------------------------------------------- 
*/

describe("Testing delayed reference", function() {
	it("Should return section 11 of the Protection of Personal and Property Rights Act, and section 5 and 6 of the Evidence Act", done => {
		getTestResult("6-delayed-reference.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Evidence Act 2006" &&
				ref.sections.some(section => section.id == "5" && section.count === 1) &&
				ref.sections.some(section => section.id == "6" && section.count === 1))).equal(true);
				expect(results.some(ref => ref.title === "Protection of Personal and Property Rights Act 1988" &&
				ref.sections.some(section => section.id == "11" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Missing year
---------------------------------------------------
Description:
An Act, if its full name including year is mentioned, might later be referred to without the year number.

Expected results:
Section 57 of the Evidence Act.
Section 4(1) of the Contractual Remedies Act 1979

File Name: data/legislation/7-missing-year.txt
--------------------------------------------------- 
*/

describe("Testing missing years", function() {
	it("Should return Section 57 of the Evidence Act, section 4 of the Contractual Remedies Act", done => {
		getTestResult("7-missing-year.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Evidence Act 2006" &&
				ref.sections.some(section => section.id == "57" && section.count === 1))).equal(true);
				expect(results.some(ref => ref.title === "Contractual Remedies Act 1979" &&
				ref.sections.some(section => section.id == "4" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Double section and ranges
---------------------------------------------------
Description:
Multiple sections might be referred to in groups or ranges. For example:
ss is shorthand for "sections"

GROUPS:
sections 5 and 6
ss 5 and 6
ss 5, 6 and 7

RANGES:
sections 20 - 25
ss 20A - 25

At this point ranges do not need to match on all sections between the two numbers, just the two numbers themselves. To match on all between a range, we would need a database of sequential sections for each Act in order to know whether there are any missing or additional sections inside a range eg section 2, 2A, 3. 

Expected results:
Fair Trading Act sections 9, 10, 43, 11, 13, 42 and 45

File Name: data/legislation/8-double-section-and-ranges.txt
--------------------------------------------------- 
*/

describe("Testing multiple sections and ranges", function() {
	it("", done => {
		getTestResult("8-double-section-and-ranges.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Fair Trading Act 1986" &&
				ref.sections.some(section => section.id == "9" && section.count === 1) &&
				ref.sections.some(section => section.id == "10" && section.count === 1) &&
				ref.sections.some(section => section.id == "43" && section.count === 1) &&
				ref.sections.some(section => section.id == "11" && section.count === 1) &&
				ref.sections.some(section => section.id == "13" && section.count === 1) &&
				ref.sections.some(section => section.id == "42" && section.count === 1) &&
				ref.sections.some(section => section.id == "45" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Combination test with subsection complications
---------------------------------------------------
Description:
A combination of previous tests, plus an edge-case of a basic reference being complicated by subsection numbers. An explicit definition is given but broken by two subsection references ("s 308(1) and (4) of the Gambling Act")

Expected results:
Section 15, Gambling Act 2003
Section 308, Gambling Act 2003
Section 7, Credit Contracts and Consumer Finance Act 2003
Section 13, Credit Contracts and Consumer Finance Act 2003
Section 11, Credit Contracts and Consumer Finance Act 2003

File Name: data/legislation/9-combination-test.txt
--------------------------------------------------- 
*/

describe("Combination test, basic reference broken by subsections", function() {
	it("Should return sections 15 and 308 of the Gambling Act, and sections 7, 13 and 11 of the CCCFA", done => {
		getTestResult("9-combination-test.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Credit Contracts and Consumer Finance Act 2003" &&
				ref.sections.some(section => section.id == "7" && section.count === 1) &&
				ref.sections.some(section => section.id == "13" && section.count === 1) &&
				ref.sections.some(section => section.id == "11" && section.count === 1))).equal(true);
				expect(results.some(ref => ref.title === "Gambling Act 2003" &&
				ref.sections.some(section => section.id == "15" && section.count === 1) &&
				ref.sections.some(section => section.id == "308" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Footnotes 
---------------------------------------------------
Description:
As part of the parsing process, we convert PDFs into plaintext. Some issues arise with footnotes.

Footnote numbers appear inline, and footnote content appears at the bottom of a page (effectively, at an arbitrary place in the content). There could be a reference to a different Act between the inline footnote number, and the footnote content. 

Therefore section references that appear in footnotes should either be ignored, or the logic applied at the point of the footnote number instead of the footnote content.

See the test file for an example, where the first footnote is in paragraph 2 ("claim against the creditor.1") and the content of that first footnote appears after paragraph 4. But in paragraph 3, a different Act is mentioned.

One possibility is to split the text into paragraphs deliniated by (1) strictly sequential numbers in square brackets or (2) if no such structure in the present document (not all judgments have paragraph numbers), then on double line breaks, to assist in ordering and identifying footnote location.

Expected results: 
Section 17, Insolvency Act 2006 ( x3 )
Section 310, Gambling Act.

File Name: data/legislation/10-footnotes-interfering.txt
--------------------------------------------------- 
*/

describe("Footnotes", function() {
	it("Should return section 17 of the Insolvency Act (3 times) and section 308 of the Gambling Act", done => {
		getTestResult("10-footnotes-interfering.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				expect(results.some(ref => ref.title === "Insolvency Act 2006" &&
				ref.sections.some(section => section.id == "17" && section.count === 3))).equal(true);
				expect(results.some(ref => ref.title === "Gambling Act 2003" &&
				ref.sections.some(section => section.id == "310" && section.count === 1))).equal(true);
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

/*
---------------------------------------------------
Inline quotes
---------------------------------------------------
Description:
Sometimes judgments quote from sections (i.e., they copy and paste the content of a section)
Sections mentioned inside those quotes should be ignored because their appearance is incidental and not useful information for research - i.e., the Court is not discussing those sections, only the primary section.  

Expected results: 
Sections 17, 18 and 19, 31 and 32 of the Evidence Act 2006.
Should NOT include section 20 and 22 of the Evidence Act 2006.

File Name: data/legislation/11-inline-quotes.txt
--------------------------------------------------- 
*/

describe("Inline quotes", function() {
	it("Should return sections 17, 18, 19, 31 and 32 of the Evidence Act and not sections 20 and 22", done => {
		getTestResult("11-inline-quotes.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				// test not implemented
				console.error("test not implemented yet");
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});


/*
---------------------------------------------------
Block quote containing contradictory defined term
---------------------------------------------------
Description:
It is possible that a quoted excerpt from a different case would include a defined term eg "the Act" but use it to refer, in the context of that quote, to a different Act.
Block quotes should be self contained, so defined terms within the block quotes should apply but only within that block quote. 

Expected results: 
Sections 17 and 16 of the Insolvency Act
Section 11 of the Credit Contracts and Consumer Finance Act 2003

File Name: data/legislation/12-block-quote-that-defines-term.txt
--------------------------------------------------- 
*/

describe("Block quotes with contradictory defined term", function() {
	it("Should return sections 17 and 16 of the Insolvency Act and section 11 of the Credit Contracts and Consumer Finance Act 2003", done => {
		getTestResult("12-block-quote-that-defines-term.txt", (err, results) => {
			if (err) {
				done(err);
				return;
			}
			try {
				// test not implemented
				console.error("test not implemented yet");
			} catch (ex) {
				done(ex);
				return;
			}
			done();
		});
	});
});

