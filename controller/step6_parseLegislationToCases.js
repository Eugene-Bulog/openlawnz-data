/**
 * Legislation to Cases
 * @param MysqlConnection connection
 * @param {function} cb
 */
const path = require("path");
const async = require("async");
const fs = require("fs");
require("dotenv").config({
	path: path.resolve(__dirname + "/../") + "/.env"
});

/*------------------------------
 Helpers
------------------------------*/
// If legisation name has special characters in it
RegExp.escape = function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};

String.prototype.matchAll = function(regexp) {
	var matches = [];
	this.replace(regexp, function() {
		var arr = [].slice.call(arguments, 0);
		var extras = arr.splice(-2);
		arr.index = extras[0];
		arr.input = extras[1];
		matches.push(arr);
	});
	return matches.length ? matches : null;
};

/**
 * Find all legislation title indices in case text
 * @param {string} legislationTitle
 * @param {string} caseText
 */
const findLegislationTitleIndicesInCaseText = (legislationTitle, caseText) => {
	const search = new RegExp(RegExp.escape(legislationTitle), "gi");
	return caseText.matchAll(search);
};

/**
 * Check to see if there's a legislation name, followed by a space then round brackets
 * e.g. Care of Children Act 2004 (the Act) or (CCA)
 * @param {string} legislationTitle
 * @param {string} caseText
 */
const findLegislationAcronymnsInCaseText = (legislationTitle, caseText) => {
	const search = new RegExp(
		// `${RegExp.escape(legislationTitle)} \\((the\\s)?(.*?)\\)`,
		`${RegExp.escape(legislationTitle)} \\((?:“|'|')?((the\\s)?(.*?))(?:”|'|')?\\)`,
		"gi"
	);
	return caseText.matchAll(search);
};

/**
 * Find all acronym indices in case text
 * @param {string} acronym
 * @param {string} caseText
 */
const findAcronymIndicesInCaseText = (acronym, caseText) => {
	const search = new RegExp(RegExp.escape(acronym), "gi");
	return caseText.matchAll(search);
};

/**
 * Find legislation at index
 * @param {number} index
 * @param {Array} legisationReferences
 */
const findLegislationAtIndex = (index, legisationReferences) => {
	return legisationReferences.find(legislationReference =>
		legislationReference.indexesInCase.find(
			indexInCase => indexInCase === index
		)
	);
};

/**
 * Find legislation by id
 * @param {number} id
 * @param {Array} legisationReferences
 */
const findLegislationById = (id, legisationReferences) => {
	return legisationReferences.find(
		legislationReference => legislationReference.id === id
	);
};

/**
 * Find acronym at index
 * @param {number} index
 * @param {Array} acronyms
 */
const findAcronymAtIndex = (index, acronyms) => {
	return acronyms.find(acronym =>
		acronym.indexesInCase.find(indexInCase => indexInCase === index)
	);
};

/**
 * Find acronym by name
 * @param {string} name
 * @param {Array} acronyms
 */
const findAcronymByName = (name, acronyms) => {
	return acronyms.find(acronym => acronym.name === name);
};

/**
 * Whether a legislation title's words has a word at an index
 * @param {number} index
 * @param {string} word
 * @param {Array} legislationTitleWords
 */
const legislationTitleHasWordAtWordIndex = (
	index,
	word,
	legislationTitleWords
) => {
	if (!legislationTitleWords[index]) {
		return false;
	}
	return word.includes(legislationTitleWords[index].toLowerCase());
};

const processCases = (cases, legislation) => {
	let MAX_LEGISLATION_TITLE_WORDS_LENGTH = -1;

	let caseLegislationReferences = {};

	// Iterate through each case text
	cases.forEach(caseItem => {
		console.log("Process case ", caseItem.id);
		// change curly brackets to straight
		caseItem.case_text = caseItem.case_text.replace(/“|”/g, '"');

		let legislationReferences = legislation.map((legislation, i) => {
			return {
				indexesInCase: [],
				sections: [],
				legislationTitleWords: legislation.title.split(/\s/),
				...legislation
			};
		});

		let acronymReferences = [];

		// Find legislation title indices and populate acronyms mentioned
		legislationReferences.forEach(legislation => {
			// Set max legislation title length. This will be used when doing a forward search later in the code
			MAX_LEGISLATION_TITLE_WORDS_LENGTH = Math.max(
				MAX_LEGISLATION_TITLE_WORDS_LENGTH,
				legislation.legislationTitleWords.length
			);

			const foundTitleIndices = findLegislationTitleIndicesInCaseText(
				legislation.title,
				caseItem.case_text
			);
			if (foundTitleIndices) {
				foundTitleIndices.forEach(found => {
					legislation.indexesInCase.push(found.index);
				});
			}

			const foundAcronyms = findLegislationAcronymnsInCaseText(
				legislation.title,
				caseItem.case_text
			);

			if (foundAcronyms) {
				foundAcronyms.forEach(found => {
					acronymReferences.push({
						legislationId: legislation.id,
						name: found[1].trim().replace(/'|"/g, ""),
						indexesInCase: [],
						sections: []
					});
				});
			}
		});

		// Find acronym indices
		acronymReferences.forEach(acronym => {
			const foundAcronymIndices = findAcronymIndicesInCaseText(
				acronym.name,
				caseItem.case_text
			);
			if (foundAcronymIndices) {
				foundAcronymIndices.forEach(found => {
					acronym.indexesInCase.push(found.index);
				});
			}
		});

		// Convert case text to word array
		//const caseWords = caseItem.case_text.match(/[a-z'\-]+/gi);
		const caseWords = caseItem.case_text.split(/\s/);

		// Save starting char index of each word (to allow easy conversion from word index to char index)
		let wordIndices = [];
		let currentIndex = 0;
		for (let i = 0; i < caseWords.length; i++) {
			wordIndices[i] = currentIndex;
			currentIndex += caseWords[i].length + 1;
		}

		let currentLegislation;
		currentIndex = 0;

		for (let i = 0; i < caseWords.length; i++) {
			const word = caseWords[i].toLowerCase();
			const nextWord = caseWords[i + 1];

			// Find the right legislation at aggregate word index
			const currentLegislationCheck = findLegislationAtIndex(
				currentIndex,
				legislationReferences
			);

			if (currentLegislationCheck) {
				currentLegislation = currentLegislationCheck;
			} else {
				const currentAcronymCheck = findAcronymAtIndex(
					currentIndex,
					legislationReferences
				);
				if (currentAcronymCheck) {
					currentLegislation = findLegislationById(
						currentAcronymCheck.legislationId,
						legislationReferences
					);
				}
			}

			/*
            Match:
            - s 57
            - section 57
            */
			if (
				((word === "s" || word === "section") &&
				nextWord.match(/[0-9]+/)) 
				// catch cases with no space between s and number e.g s47 instead of s 47
				|| (nextWord && nextWord.match(/s[0-9]+/)) 
			) {
				/*
                Check if it's got "under the" or "of the" following it, then it's not related
                to the current legislation. Instead put it in the following act name / legislation
                - s 57 of the
                - section 57 under the <Legislation Title>
                */
				if (
					(caseWords[i + 2] === "under" ||
						caseWords[i + 2] === "of" ||
						caseWords[i + 2] === "in" ) &&
					caseWords[i + 3] === "the"
				) {
					// Add to the current aggregate word index
					currentIndex += (caseWords[i + 2] === "under" ? 6 : 3) + 4;

					// First test for acronym --- changed to search by index to account for multi-word terms
					var foundAcronym = findAcronymAtIndex(
						wordIndices[i + 4],
						acronymReferences
					);

					// Handles edge case where acronym is "the <acronym>" eg "the act", so first word includes "the"
					if (!foundAcronym) {
						foundAcronym = findAcronymAtIndex(
							wordIndices[i + 3],
							acronymReferences
						);
					}

					if (foundAcronym) {
						const associatedLegislation = findLegislationById(
							foundAcronym.legislationId,
							legislationReferences
						);
						associatedLegislation.sections.push(nextWord);
						currentIndex += foundAcronym.length + 1;
						i += 1;
					} else {
						// Find the following legislation
						let subsequentLegislationReference;
						let startWordIndex = i + 4;
						let currentTestWordIndex = 0;
						let maxLegislationTitleLengthFinish = MAX_LEGISLATION_TITLE_WORDS_LENGTH;
						let allLegislationTitlesAndId = [
							...legislationReferences
						].map(legislation => {
							return {
								id: legislation.id,
								legislationTitleWords:
									legislation.legislationTitleWords
							};
						});
						while (
							!subsequentLegislationReference &&
							currentTestWordIndex !==
								maxLegislationTitleLengthFinish &&
							startWordIndex !== caseWords.length
						) {
							// Progressively filter all legislation titles that have the aggregate of words in its title
							let testWord;

							try {
								testWord = caseWords[
									startWordIndex
								].toLowerCase();
							} catch (ex) {
								console.log(ex);
								process.exit();
							}
							allLegislationTitlesAndId = allLegislationTitlesAndId.filter(
								legislation =>
									legislationTitleHasWordAtWordIndex(
										currentTestWordIndex,
										testWord,
										legislation.legislationTitleWords
									)
							);
							currentIndex += testWord.length + 1;

							if (allLegislationTitlesAndId.length === 1) {
								subsequentLegislationReference = findLegislationById(
									allLegislationTitlesAndId[0].id,
									legislationReferences
								);
							}
							startWordIndex++;
							currentTestWordIndex++;
						}
						// Set i to be the current wordlookahead
						i = startWordIndex;

						if (subsequentLegislationReference) {
							subsequentLegislationReference.sections.push(
								nextWord
							);
							// Update current legislation
							currentLegislation = subsequentLegislationReference;
						}
					}
				} else {
					if (currentLegislation) {
						currentLegislation.sections.push(nextWord);
					}
				}
			}

			currentIndex += word.length + 1; // +1 for space
		}

		// https://www.jstips.co/en/javascript/deduplicate-an-array/
		legislationReferences.map(legislationReference => {
			legislationReference.sections = legislationReference.sections
				.map(section => {
					var str = section;
					if (str[0].toLowerCase() === 's') {
						str = str.substring(1);
					}
					if (str.match(/\.|\(|\)/)) {
						str = str.substring(0,str.indexOf(str.match(/\.|\(|\)/)));
					}
					return str.replace(
						/(~|`|!|@|#|$|%|^|&|\*|{|}|\[|\]|;|:|\"|'|<|,|\.|>|\?|\/|\\|\||-|_|\+|=)/g,
						""
					);
				})
				.filter((el, i, arr) => {
					return arr.indexOf(el) === i;
				});
		});

		const totalSections = [...legislationReferences].reduce(
			(accumulator, legislationReference) =>
				accumulator + legislationReference.sections.length,
			0
		);
		console.log(`> Found ${totalSections} unique legislation sections`);

		if (totalSections > 0) {
			caseLegislationReferences[
				caseItem.id
			] = legislationReferences.filter(
				legislationReference => legislationReference.sections.length > 0
			);
		}
	});

	return caseLegislationReferences;
};

const run = (connection, cb) => {
	console.log("Parse legislation to cases");

	async.parallel(
		{
			cases: cb => {
				// for testing, just get one case
				connection.query("select * from cases where id = 186", function(
					err,
					results,
					fields
				) {
					if (err) {
						cb(err);
						return;
					}

					cb(null, results);
				});
			},
			legislation: cb => {
				connection.query("select * from legislation", function(
					err,
					results,
					fields
				) {
					if (err) {
						cb(err);
						return;
					}

					cb(null, results);
				});
			}
		},
		(err, results) => {
			if (err) {
				cb(err);
				return;
			}

			let caseLegislationReferences = processCases(
				results.cases,
				results.legislation
			);

			const insertQueries = [];

			// for testing, stopping here to stop inserting into db
			cb(null, caseLegislationReferences);
			return;

			Object.keys(caseLegislationReferences).forEach(case_id => {
				caseLegislationReferences[case_id].forEach(legislation => {
					legislation.sections.forEach(section => {
						insertQueries.push(
							`insert into legislation_to_cases (legislation_id, section, case_id) values ("${
								legislation.id
							}", "${section}", "${case_id}")`
						);
					});
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
		run(connection, (err, result) => {
			connection.end();
			if (err) {
				console.log(err);
				return;
			}
			const cachePath = __dirname + "/../.cache/";
			!fs.existsSync(cachePath) && fs.mkdirSync(cachePath);
			
			const path = cachePath + "step5_parseLegislationToCases_result.json";
			fs.writeFileSync(path, JSON.stringify(result, null, 4));
			console.log(`Done. Written result to ${path}`);
		});
	});
} else {
	module.exports = run;
	module.exports.processCases = processCases;
}
