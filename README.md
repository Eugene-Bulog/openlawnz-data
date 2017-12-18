# freelaw
NZ Case Law and Legislation management 

Current scripts:

1. add-db.js takes specified json file (from judicial decisions online), extracts case name, citation and PDF url, adds all to a mysql database. 

2. functions.js looks up PDF url, downloads file locally, adds to s3 bucket, deletes local file

AWS s3 creds needed at ~/.aws
mySQL creds needed at .env

