const fs = require('fs');
const argv = require('yargs').argv;
var assert = require('assert');
const legislation = require('../legislation')

const readFile = (fileName) => {
  return fs.readFileSync(__dirname + '/data/legislation/' + fileName, 'utf8')
}

const allLegislationTitles = readFile('legislation-titles.csv');

// Test 1

describe('Legislation tests', function() {
      it('Lookup section numbers and associate with legislation names, explicit definitions or acronyms', function() {
        const caseText = readFile('case2.txt');
        const results = legislation(caseText, allLegislationTitles)
        // Test that the data contains the expected results based on case1.txt
        /*
        local government - 10, 12, 3, 3, 2, 45B, 4
        resource management - 5, 56, 50, 
        property relationships - 2
        crimes - 3
        */
        assert(results.length > 0)
      });
  });

  /*

  --- expected results ---
4 x references to 174 of companies act
1 x reference to 171, 133, 135, 136, 137, 145, 169 companies act
3 x references to 131 companies act
1 x references to 7 of resource management
9 total section results

*/



// Do assertions etc here with results