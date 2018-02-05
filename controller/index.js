
// index.js

const {exec} = require('child_process');
const download = require('download');
const fs = require('fs');
const async = require('async');
const path = require('path');

require('dotenv').config();

Array.prototype.diff = function (a) {
  return this.filter(function (i) {
      return a.indexOf(i) === -1;
  });
};

// fix uri encode - need to add !, (, ), ', _, * and . to encodeURIcomponent
function encodeURIfix(str) {
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27').replace(/_/g, '%5F').replace(/\*/g, '%2A').replace(/\./g, '%2E');
};

const casesPerInstance = 10;
const mojDataFile = "../cache/mojData.json"

// is is all docs after 17 dec 2017 for testing
const jsonURL = "https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50&json.nl=map&fq=JudgmentDate%3A[2017-12-17T00%3A00%3A00Z%20TO%20*%20]&sort=JudgmentDate%20desc&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score&wt=json"

// "cases" array = (mojDATA json).response.docs

const cachedJSON = fs.existsSync(mojDataFile) ? JSON.parse(fs.readFileSync(mojDataFile)).response.docs : []

 // called from parallel process
 // it should work
  function spawnCaseProcessors(cases, cb2) {
    console.log('sending ' + cases.length + ' cases')
    const encodedCommand = encodeURIfix(JSON.stringify(cases));
    const cmd = `node index.js --cases=${encodedCommand}`;
    exec(cmd, {cwd: '../processor/'}, (error, stdout, stderr) => {
      
      if (error) {
        console.log('------------- ERROR ------')
        console.log(error)
        cb2(error) // i don't know why it's still printing the logs
      }
      if(!!~(stdout || stderr).indexOf('[PROCESSOR_RESULT')) { // here, you had if(!!~) what is !!~? o
        if (stderr) {
          console.log('>>> stderr', stderr)
          cb2(stderr)
          return;
        }
        console.log('======== WAITING =========')
        setTimeout(() => {
          // ok shall i set 2jsgogo
          cb2(null, stdout)
        }, 10000)

      } else {
        console.log(stdout)
      }
  });
}

download(jsonURL).then(data => {
 data = JSON.parse(data.toString()).response.docs;
  const newCases = data;

  let caseArrays = [];

  while(newCases.length > 0) {
    caseArrays.push(newCases.splice(0, Math.min(newCases.length, casesPerInstance)))
  }

  async.series(caseArrays.map(caseArray => {
    return spawnCaseProcessors.bind(null, caseArray)
  }, (err, results) => {
    console.log('finished')
    if(err) {
      console.log('err1111!!!!', err); return;
    } else {
      console.log('Success', JSON.parse(results))
      fs.writeFileSync(mojDataFile, JSON.stringify(data));
    }
  }))

})
