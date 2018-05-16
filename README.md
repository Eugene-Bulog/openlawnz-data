# openlawnz-data

## Requirements

*   AWS s3 creds needed at ~/.aws
*   Rename .env.sample to .env and fill in with mySQL and AWS details
*   xpdf required in /xpdf at root directory, install tools from https://www.xpdfreader.com/download.html
*   We recommend yarn

## Structure

*   pdfToDBProcessor runs in an isolated process spawned from controller
*   Controller is where you run the program

## Installing

```
yarn install
```

## Running

```
yarn start
```

## Tests

```
cd tests
npx jasmine
```

## TODO

*   Write installer
