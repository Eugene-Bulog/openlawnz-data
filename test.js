
const {spawnSync, execSync, execFile} = require('child_process');
const fs = require('fs');
const path = require('path');

console.log(path.basename())

  const doit = execSync("/mnt/c/Users/Andrew/Desktop/openlaw-data/xpdf/bin64/pdftotext /mnt/c/Users/Andrew/Desktop/openlaw-data/cache/ClaytonvClayton.pdf");
/*
doit.on('exit', function(){
    const case_text = fs.readFileSync("./cache/ClaytonvClayton.txt");
    console.log(case_text);
  });
*/
