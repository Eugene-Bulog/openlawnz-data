# freelaw
NZ Case Law and Legislation management 

Current scripts:

1. add-db.js takes specified json file (from judicial decisions online), extracts case name, citation and PDF url, adds all to a mysql database. 

2. index.js looks up PDF urls from database, downloads file locally, adds to s3 bucket, deletes local file

AWS s3 creds needed at ~/.aws
mySQL creds needed at .env

JSON files:
1. Data.json - JDO output of all files up to 19 dec
2. data-limited.json - sample very small set
3. data-errors.json with formatting errors for testing
4. data-test-set.json - medium 2,500 set
5. data-test-set-2.json - macrons and curly apostrophes for utf8 checking
