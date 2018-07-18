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
const findLegislationDefinedTermsInCaseText = (legislationTitle, caseText) => {
	const search = new RegExp(
		// `${RegExp.escape(legislationTitle)} \\((the\\s)?(.*?)\\)`,
		`${RegExp.escape(legislationTitle)} \\((?:“|'|')?((the\\s)?(.*?))(?:”|'|')?\\)`,
		"gi"
	);
	return caseText.matchAll(search);
};

/**
 * Find all defined term indices in case text
 * @param {string} definedTerm
 * @param {string} caseText
 */
const findDefinedTermIndicesInCaseText = (definedTerm, caseText) => {
	const search = new RegExp(RegExp.escape(definedTerm), "gi");
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
 * Find legislation at index with missing year
 * @param {number} index
 * @param {Array} legisationReferences
 */
const findLegislationMissingYearAtIndex = (index, legisationReferences) => {
	return legisationReferences.find(legislationReference =>
		legislationReference.indexesMissingYear.find(
			indexesMissingYear => indexesMissingYear === index
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
 * Find definedTerm at index
 * @param {number} index
 * @param {Array} definedTerms
 */
const findDefinedTermAtIndex = (index, definedTerms) => {
	return definedTerms.find(definedTerm =>
		definedTerm.indexesInCase.find(indexInCase => indexInCase === index)
	);
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

/**
 * Iterates through the next few words until the "under" "of" or
 * "in" part of a section reference (or equivalent for non standard refs)
 * is encountered. 
 * @param {number} offset 
 * @param {number} oldi 
 * @param {Array} legislation 
 * @param {Array} caseWords
 */
const iterateThroughMultipleSections = (
	offset,
	oldi,
	legislation,
	caseWords
) => {
	let j = 2;
	while (j < offset) {
		if (
			caseWords[oldi + j].match(/^[0-9]+/)
		){
			legislation.sections.push(
				caseWords[oldi + j]
			);
		}
		j++;
	}
}

/**
 * Checks if the given index falls within a footnote,
 * i.e is the work at this index part of a footnote.
 * If so, returns the footnote
 * @param {number} index 
 * @param {Array} footnotes 
 */
const findFootnoteAtIndex = (
	index,
	footnotes
) => {
	let returnVal = null;
	footnotes.forEach(footnote => {

		if (index <= footnote.end &&
			index >= footnote.start) {
				returnVal = footnote;
		}
	});
	
	return returnVal;
}

const processCases = (cases, legislation) => {
	let MAX_LEGISLATION_TITLE_WORDS_LENGTH = -1;

	let caseLegislationReferences = {};
	let failures = [];

	// Iterate through each case text
	cases.forEach(caseItem => {
		console.log("Process case ", caseItem.id);

		try {
			
			// change curly brackets to straight
			caseItem.case_text = caseItem.case_text.replace(/“|”/g, '"');

			let legislationReferences = legislation.map((legislation, i) => {
				return {
					indexesInCase: [],
					indexesMissingYear: [],
					sections: [],
					legislationTitleWords: legislation.title.split(/\s/),
					...legislation
				};
			});

			let definedTermReferences = [];

			// Find legislation title indices and populate definedTerms mentioned
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

					// If this legislation is referenced, treat all following references
					// for a legislation with this title but no year as referring to this
					const foundMissingYear =  findLegislationTitleIndicesInCaseText(
						legislation.title.substring(0,legislation.title.indexOf(legislation.title.match(/\s[0-9]+/))),
						caseItem.case_text
					);

					if (foundMissingYear) {
						foundMissingYear.forEach(missing => {
							if (!legislation.indexesInCase.includes(missing.index)) {
								legislation.indexesMissingYear.push(missing.index);
							}
						});
					}
				}

				const foundDefinedTerms = findLegislationDefinedTermsInCaseText(
					legislation.title,
					caseItem.case_text
				);
				
				if (foundDefinedTerms) {
					foundDefinedTerms.forEach(found => {
						definedTermReferences.push({
							legislationId: legislation.id,
							name: found[1].trim().replace(/'|"/g, ""),
							indexesInCase: [],
							sections: []
						});
					});
				}
			});

			// Find definedTerms indices
			definedTermReferences.forEach(term => {
				const foundDefinedTermIndices = findDefinedTermIndicesInCaseText(
					term.name,
					caseItem.case_text
				);
				if (foundDefinedTermIndices) {
					foundDefinedTermIndices.forEach(found => {
						term.indexesInCase.push(found.index);
					});
				}
			});

			// Find and remember locations of footnotes (content)
			let footnotes = [];
			let footnoteMatches = caseItem.case_text.matchAll(/\n[0-9]+\s.*/gi);
			let currentN = 0;

			if (footnoteMatches) {
				footnoteMatches.forEach(match => {
					// record start and end indices for each found footnote
					let submatches = match[0].split(/\.\s(?=[0-9]+)/);
					submatches.forEach(subMatch => {
						let thisN = subMatch.replace(/\n/,"").substring(0,subMatch.indexOf(subMatch.match(/\s/)));

						// Check this potential footnote is in order based on seen footnotes (if yes, likely a footnote)
						if (thisN = currentN + 1) {
							let startInd = caseItem.case_text.indexOf(subMatch);
							footnotes.push({start: startInd, end: startInd + subMatch.length + 1, n: thisN, legAtIndex: null});
							currentN++;
						}
					});
				});
			}

			// Convert case text to word array
			//const caseWords = caseItem.case_text.match(/[a-z'\-]+/gi);
			const caseWords = caseItem.case_text.split(/\s/);

			// Save starting char index of each word (to allow easy conversion from word index to char index)
			// using a running count of currentIndex inside the foreach word loop proved unreliable due to how it was updated,
			// use this array instead (e.g wordIndices[i])
			let wordIndices = [];
			let currentIndex = 0;
			for (let i = 0; i < caseWords.length; i++) {
				wordIndices[i] = currentIndex;
				currentIndex += caseWords[i].length + 1;
			}

			// currentLegislation is used for non-block text (outside footnotes, quotes etc)
			let currentLegislation;
			// currentLegislationBlock is a version of currentLegislation used exclusively for the current block
			// so that the parser returns to the old value of currentLegislation after exiting the block
			// - blocks being footnotes or block quotes, where defined terms and current legislation should be isolated from
			// the rest of the case text
			let currentLegislationBlock;
			let currentFootnoteN = 1;

			for (let i = 0; i < caseWords.length; i++) {
				const word = caseWords[i].toLowerCase();
				const nextWord = caseWords[i + 1];
				
				// Check if parser is currently inside footnote content
				const footnoteCheck = findFootnoteAtIndex(
					wordIndices[i],
					footnotes
				);

				if (footnoteCheck) {
					// only set currentLegislationBlock at the start of block - allows changing within block
					if (findFootnoteAtIndex(wordIndices[i - 1],footnotes) != footnoteCheck) {
						currentLegislationBlock = footnoteCheck.legAtIndex;
					}
				}
				//reset currentLegislationBlock when not inside a block to ensure no carry-over between blocks
				else {
					currentLegislationBlock = null;
				}

				// Find the right legislation at aggregate word index
				const currentLegislationCheck = findLegislationAtIndex(
					wordIndices[i],
					legislationReferences
				);
				
				if (currentLegislationCheck) {
					if (footnoteCheck) {
						currentLegislationBlock = currentLegislationCheck;
					}
					else {
						currentLegislation = currentLegislationCheck;
					}
				} else {
					const currentDefinedTermCheck = findDefinedTermAtIndex(
						wordIndices[i],
						legislationReferences
					);
					if (currentDefinedTermCheck) {
						if (footnoteCheck) {
							currentLegislationBlock = findLegislationById(
								currentDefinedTermCheck.legislationId,
								legislationReferences
							);
						}
						else {
							currentLegislation = findLegislationById(
								currentDefinedTermCheck.legislationId,
								legislationReferences
							);
						}
					}
				}

				let singleSection = false;
				let multiSection = false;
				// i needs to be retained for multiple section checking
				let oldi = i;
				let offset = 2;

				if (
					((word === "s" || 
						word === "section" || 
						word === "ss" || 
						word === "sections") &&
					(nextWord && nextWord.match(/[0-9]+/))) 
					// catch cases with no space between s and number e.g s47 instead of s 47
					|| (nextWord && nextWord.match(/^s[0-9]+/)) 
				) {
					singleSection = true
					
					// Check if there are multiple sections being referenced, and
					// find the point where the list ends
					while(
						i + offset < caseWords.length &&
						(caseWords[i + offset].match(/[0-9]+/) ||
						caseWords[i + offset] === "and" ||
						caseWords[i + offset] === "to" ||
						caseWords[i + offset] === "-") &&
						!caseWords[i + offset - 1].match(/\.$/) // terminate if word ends on full stop (won't terminate on subsection period)
					) {
						multiSection = true;
						singleSection = false;
						offset ++;
					}
				}


				/*
				Match:
				- s 57
				- section 57
				*/
				if ( singleSection || multiSection) {
					/*
					Check if it's got "under the" or "of the" following it, then it's not related
					to the current legislation. Instead put it in the following act name / legislation
					- s 57 of the
					- section 57 under the <Legislation Title>
					*/
					if (
						(caseWords[i + offset] === "under" ||
							caseWords[i + offset] === "of" ||
							caseWords[i + offset] === "in" ) &&
							caseWords[i + offset + 1] === "the"
					) {

						// Check if the index matches that of a missing year index
						const checkForMissingYear = findLegislationMissingYearAtIndex(
							wordIndices[i + offset + 2],
							legislationReferences
						);

						// First test for definedTerms --- changed to search by index to account for multi-word terms
						var foundDefinedTerm = findDefinedTermAtIndex(
							wordIndices[i + offset + 2],
							definedTermReferences
						);

						// Handles edge case where definedTerm is "the <definedTerm>" eg "the act", so first word includes "the"
						if (!foundDefinedTerm) {
							foundDefinedTerm = findDefinedTermAtIndex(
								wordIndices[i + offset + 1],
								definedTermReferences
							);
						}

						if (foundDefinedTerm) {
							const associatedLegislation = findLegislationById(
								foundDefinedTerm.legislationId,
								legislationReferences
							);
							associatedLegislation.sections.push(nextWord);
							// If multiple sections, iterate through each one
							if (multiSection) {
								iterateThroughMultipleSections(
									offset, 
									oldi, 
									associatedLegislation,
									caseWords
								);
							}
							i += 1;

							if (footnoteCheck) {
								currentLegislationBlock = associatedLegislation;
							}
							else {
								currentLegislation = associatedLegislation;
							}

						// Missing year legislation check
						} else if (checkForMissingYear){
							checkForMissingYear.sections.push(nextWord);
							// If multiple sections, iterate through each one
							if (multiSection) {
								iterateThroughMultipleSections(
									offset, 
									oldi, 
									checkForMissingYear,
									caseWords
								);
							}
							if (footnoteCheck) {
								currentLegislationBlock = checkForMissingYear;
							}
							else {
								currentLegislation = checkForMissingYear;
							}
						} else {
							// Find the following legislation
							let subsequentLegislationReference;
							let startWordIndex = i + offset + 2;
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
									break;
								}
								allLegislationTitlesAndId = allLegislationTitlesAndId.filter(
									legislation =>
										legislationTitleHasWordAtWordIndex(
											currentTestWordIndex,
											testWord,
											legislation.legislationTitleWords
										)
								);
								
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

								// If multiple sections, iterate through each one
								if (multiSection) {
									iterateThroughMultipleSections(
										offset, 
										oldi, 
										subsequentLegislationReference,
										caseWords
									);
								}
								// Update current legislation (or block current legislation)
								if (footnoteCheck) {
									currentLegislationBlock = subsequentLegislationReference;
								}
								else {
									currentLegislation = subsequentLegislationReference;
								}
							}
						}
					} else {
						if (currentLegislation && !footnoteCheck) {
							currentLegislation.sections.push(nextWord);
							// If multiple sections, iterate through each one
							if (multiSection) {
								iterateThroughMultipleSections(
									offset, 
									oldi, 
									currentLegislation,
									caseWords
								);
							}
						}
						else if (footnoteCheck && currentLegislationBlock) {
							currentLegislationBlock.sections.push(nextWord);
							// If multiple sections, iterate through each one
							if (multiSection) {
								iterateThroughMultipleSections(
									offset, 
									oldi, 
									currentLegislationBlock,
									caseWords
								);
								
							}
						}
					}
				}

				if (word.match(new RegExp("\\." + currentFootnoteN + "$"))) {
					let referencedFootnote = footnotes.find(footnote => footnote.n === currentFootnoteN);
					referencedFootnote.legAtIndex = currentLegislation;
					currentFootnoteN++;
				}

			}
			
			// https://www.jstips.co/en/javascript/deduplicate-an-array/
			// Instead of dedupe, using section count field, increment for every dupe encountered
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
						str = str.replace(
							/(~|`|!|@|#|$|%|^|&|\*|{|}|\[|\]|;|:|\"|'|<|,|\.|>|\?|\/|\\|\||-|_|\+|=)/g,
							""
						);
						return {id: str, count: 1};
					})
					.filter((el, i, arr) => {
						var firstIndex = arr.findIndex(element => {
							return element.id === el.id;
						});

						var isNotDupe = (firstIndex === i);

						if (!isNotDupe) {
							arr[firstIndex].count++;
						}

						return isNotDupe;
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

		}
		catch (ex) {
			console.log("> Error encountered: " + ex);
			failures.push({
				failedCase: caseItem.id,
				errorMessage: ex
			});
		}
	});

	if (failures.length > 0) {
		console.log(failures.length + " failures were encountered as follows. Parser results may be incomplete.");
		console.log(failures);
	}
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
