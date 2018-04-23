"use strict";

const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const lib = require('./lib/functions.js');
const _ = require('underscore'); 

// get caseText - replace with db query
var caseText = fs.readFileSync('./test_data/case1.txt', 'utf8');

String.prototype.matchAll = function (regexp) {
    var matches = [];
    this.replace(regexp, function () {
        var arr = ([]).slice.call(arguments, 0);
        var extras = arr.splice(-2);
        arr.index = extras[0];
        arr.input = extras[1];
        matches.push(arr);
    });
    return matches.length ? matches : null;
};

function wordCount(str) { 
    return str.split(" ").length;
  }

function acr(s){
    var words, acronym, nextWord, index;
    words = s.replace(/\(|\)/g, '').split(' ');
    acronym= "";
    index = 0
    // only do it for number of words less one to exclude date
    while (index < (words.length - 1)) {
            nextWord = words[index];
            acronym = acronym.toUpperCase() + nextWord.charAt(0);
            index = index + 1 ;
    }
    return acronym
}

require('dotenv').config();

let legislations = [];

// get array of legislation
var allLegislation = fs.readFileSync('legislation-titles.csv', 'utf8');

// from DB
var arrayOfLegislation = allLegislation.split("\n").map((l, i) => {
    return {
        id: i,
        name: l.split('\r')[0]
    }
});

var acronymReferences = arrayOfLegislation.filter(l => { 

    return wordCount(l.name) >= 4
    
}).map(l => {

    return {
        legislationId: l.id,
        name: acr(l.name),
        indexesInCase: [],
        sections: []
    }

})

// Make our new legislation array

var legislationReferences = arrayOfLegislation.map(l => {
    return {
        ...l,
        indexesInCase: [],
        sections: [],
    }
});

RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

legislationReferences.forEach(legislation => {

    // Find all references and add
    var r = new RegExp(RegExp.escape(legislation.name, "gi"));
    const found = caseText.matchAll(r);
    if (found) {
        // console.log('found matches for ' + legislation.name)
        found.forEach(f => {
            legislation.indexesInCase.push(f.index)
        });
    }

    // check to see if there's a legislation name, followed by a space then round brackets eg Care of Children Act 2004 (the Act) or (CCA)
    var theActCheckRegex = legislation.name + " (\\((?:[\"\'](.*)[\"\']\\)|(.*)\\)))";
    const found2 = caseText.match(theActCheckRegex);
    console.log(theActCheckRegex)
    if (found2) {
        console.log("found the act defined as a thing");

        // up to here - tbc, need to add the found thing as an acronym with same legislation id
        found2.forEach(f => {
            console.log(f);
            let theActObject = {
                legislationId: legislation.id,
                name: 'the Act',
                indexesInCase: f.index,
                sections: []
            };
            console.log(theActObject);
            //  HERE - ADD TO ACRONYMS ARRAY? 
        });
    }
    return;

})

acronymReferences.forEach(acronym => {

    var r = new RegExp(RegExp.escape(acronym.name), "g")
    const found = caseText.matchAll(r);
    if (found) {
        //console.log('found acronyms ' + acronym.name)
        found.forEach(f => {
            acronym.indexesInCase.push(f.index)
        });
    }

})

// Flatten all the indexes

var allIndexes = [];
var allAcronymIndexes = [];

legislationReferences.forEach(l => {
    allIndexes = allIndexes.concat(l.indexesInCase);
})

acronymReferences.forEach(a => {
    allAcronymIndexes = allAcronymIndexes.concat(a.indexesInCase);
})

// sort by number not alphabetical
allIndexes.sort((a, b) => a - b);
allAcronymIndexes.sort((a, b) => a - b);

function maxAcronymLength(arr) {
    var max = -1;
    arr.forEach(r => {
        max = Math.max(max, r.name.length);
    })
    return max;
}

// make array of case substringing on each index
var arrayOfCase = [];
allIndexes.forEach((actIndex, i) => {
    // var currentLegisation = legislationReferences.find(l => l.indexesInCase(actIndex) !== -1);
    // Find acronyms where their index is within allIndexes[i] and allIndexes[i + 1] (bounds)
    // substring here

    const actText = caseText.substring(allIndexes[i], allIndexes[i + 1])


    // Current Reference is of type IReference (which has an indexesInCase array and sections array guaranteed)
    let currentReference = legislationReferences.find(l => l.indexesInCase.indexOf(actIndex) !== -1);
    console.log('currentReference', currentReference)

    // Rename to relevantAcronymIndices
    let relevantAcronyms = allAcronymIndexes.filter(a => {
       
        return a > allIndexes[i] && a < allIndexes[i + 1]

    })
    
    const relevantAcronyms2 = relevantAcronyms.map(aIndex => {
        return acronymReferences.find(l => l.indexesInCase.indexOf(aIndex) !== -1);
    })

    // old regex:
    // var sectionsSearch = new RegExp(/((\bsection(s)*\b|\bs{1,2}\b)( *(\d{1,4}\w*))(\band\b\d{1,4}\w*)*| (and|to) (\d{1,4}\w*))/, "gi")
    // new regex
    var sectionsSearch = new RegExp(/(\b((section(s)*)|s{1,2})\b) \b\d{1,4}\w{0,3}\b( (and|to) \b\d*\w{1,3}\b)*/, "gi")
    const foundSections = actText.matchAll(sectionsSearch);

    var acronymMax = maxAcronymLength(relevantAcronyms2) + 2;
    

    if (foundSections) {
        // console.log(actText)
        // console.group('found: ' + foundSections.length)
        foundSections.forEach((f, fI) => {

            // console.log("Start of full legislation bound" + allIndexes[i]);
            // console.log("Acronyms: " + relevantAcronyms);
            var forwardTest = actText.substring(f.index + f[0].length, f.index + f[0].length + 10).toLowerCase()
            var backwardsTest = actText.substring(f.index - acronymMax, f.index).toLowerCase()
           
            var prevSectionStart = foundSections[fI - 1];
            var previousSectionToCurrentSection;
            var betweenSectionsTest;
            
            if(prevSectionStart) {
                
                previousSectionToCurrentSection = actText.substring(prevSectionStart.index + prevSectionStart[0].length, f.index)
               
                betweenSectionsTest = relevantAcronyms2.find(a => {
                    return previousSectionToCurrentSection.indexOf(" " + a.name + " ") !== -1
                })
            }

            // if the forwrad test does include and the backwards test doesn't include
            // ie if between section bounds s 5 ..... s 7 there shouldn't be the words "under the" or "of the" 
            // after the last s 7 since that indicates the following characters will be an acronym or legislation name
            // also there should not be a preceding acronym, eg s 5 .... RMA s7, the RMA should override whatever classified the s5.
            
            
            /*
            if((forwardTest.indexOf('under the') !== -1 || forwardTest.indexOf('of the') !== -1) && !relevantAcronyms2.find(a => {
                return backwardsTest.indexOf(" " + a.name.toLowerCase()) !== -1
            })) {
            */
            
            if(forwardTest.indexOf('under the') !== -1 || forwardTest.indexOf('of the') !== -1) {
               
                console.log("Forward test found")
                // f contains the match
                // We need to know the acronym of the next thing
                // Grab the bounds between this section and the next, and look through all the acronyms to find it
                if(foundSections[fI + 1]) {
                    var sectionTestBounds = actText.substring(f.index + f[0].length, foundSections[fI + 1].index);
                }
                else {
                    var sectionTestBounds = actText.substring(f.index + f[0].length);
                } 

                // Found the acronym at index,
                // Find the acronym object
                var testCurrentReference = relevantAcronyms2.find(a => {
                    return sectionTestBounds.indexOf(" " + a.name + " ") !== -1
                })
                if(testCurrentReference) {
                    currentReference = testCurrentReference
                }

                //console.log('set currentReference', currentReference)
                console.log('set current reference to ', currentReference.name)
                //console.log(currentReference)

            // if we DO have, then ......
  
            } else if(betweenSectionsTest) {
               console.log('set current reference betweenSectionsTest', betweenSectionsTest)
               currentReference = betweenSectionsTest;
               
            }

            currentReference.sections.push(f[0])

            //console.log('at index ' + f.index);
            //console.log(currentReference);
        });
        //console.groupEnd()
    }

            

            // const found = caseText.matchAll(r);

                //console.log("relevant acronyms", relevantAcronyms)

                // Find section references in actText
                //

                //var r = new RegExp(legislation.name, "g")
            // const found = caseText.matchAll(r);

            //  


            // arrayOfCase.push();
            
                // Find sections within the bounds using regex
                // Categorise if index < acronym, related to legislation name otherwise related to the acronym

                // We find the legislation that is associated with the index and grab its ID
                // substring allIndexes[i], allIndexes[i + 1]
                // current legisation = legislationReferences.find(l => l.indexesInCase(actIndex) !== -1)
                // create acronym if legislation name >= 3 words
                // str.match(regex for sections)
                // any match that is < index of 


})

console.log(legislationReferences.filter(l => l.sections.length > 0))
console.log(acronymReferences.filter(l => l.sections.length > 0))


//console.log(legislationReferences.filter(l => l.indexesInCase.length > 0))