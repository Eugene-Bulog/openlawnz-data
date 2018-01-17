
// index.js

const {exec} = require('child_process');
const download = require('download');
const fs = require('fs');
const async = require('async')

Array.prototype.diff = function (a) {
  return this.filter(function (i) {
      return a.indexOf(i) === -1;
  });
};

const casesPerInstance = 10;
const mojDataFile = "../cache/mojData.json"

// this is all docs after 17 dec 2017 for testing
const jsonURL = "https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50&json.nl=map&fq=JudgmentDate%3A[2017-12-17T00%3A00%3A00Z%20TO%20*%20]&sort=JudgmentDate%20desc&fl=CaseName%2C%20JudgmentDate%2C%20DocumentName%2C%20id%2C%20score&wt=json"
// I cbf reading the logic atm, can do later
// might be our "cases" = (mojDATA.json).response.docs, i will check later

const cachedJSON = fs.existsSync(mojDataFile) ? JSON.parse(fs.readFileSync(mojDataFile)).response.docs : []

 // called from parallel process
 function spawnCaseProcessors(cases, cb) {
   const cmd = `node ../processor/index.js --cases=${encodeURIComponent(JSON.stringify(cases))}`
   
  exec(cmd, (error, stdout, stderr) => {
    console.log(error)
    if (error) {
      cb(error)
    }
    if(!!~(stdout || stderr).indexOf('[PROCESSOR_RESULT')) {
      if (stderr) {
        cb(stderr)
        return;
      }
      cb(null, stdout)
    } else {
      console.log(stdout)
    }
  });
}

download(jsonURL).then(data => {
 data = JSON.parse(data.toString()).response.docs;
 //console.log(JSON.stringify(data, null, 4))
  const newCases = data // temp

  let caseArrays = [];
  
 // out of memory? wtf
 /// sec
  while(newCases.length > 0) {
    console.log(newCases.length)
    caseArrays.push(newCases.splice(0, Math.min(newCases.length, casesPerInstance)))
    
  }

 // console.log(caseArrays[0])
  // it's an array of arrays
 // singular or plural? yuou havent defined the singular
 // don't need to
 // caseArrays is a list of arrays to pass into spawnCaseProcessors ok
  async.parallel(caseArrays.map(caseArray => {
   
    return spawnCaseProcessors.bind(null, caseArray)
  }, (err, results) => {
    if(err) {
      console.log('err', err); return;
    } else {
      console.log('Success', JSON.parse(results))
      fs.writeFileSync(mojDataFile, JSON.stringify(data));
    }
  }))

})
