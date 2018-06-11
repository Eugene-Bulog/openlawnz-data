const assert = require("assert");
const fs = require("fs");
const regNeutralCite = require("../controller/step2_parseEmptyCitations")
	.regNeutralCite;

var citationData = fs.readFileSync(
	__dirname + "/data/case-citations.txt",
	"utf8"
);

return;

/* ******************************* */
/* REGEX */

const sectionsSearch = new RegExp(
	/(\b((section(s)*)|s{1,2})\b) \b\d{1,4}\w{0,3}\b( (and|to) \b\d*\w{1,3}\b)*/,
	"gi"
);
const explicitDefinitionRegex = "(\\((?:[\"'](.*)[\"']\\)|(.*)\\)))";



/* ***************************** */
/* FUNCTIONS */

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

function wordCount(str) {
	return str.split(" ").length;
}

function acr(s) {
	var words, acronym, nextWord, index;
	words = s.replace(/\(|\)/g, "").split(" ");
	acronym = "";
	index = 0;
	// only do it for number of words less one to exclude date
	while (index < words.length - 1) {
		nextWord = words[index];
		acronym = acronym.toUpperCase() + nextWord.charAt(0);
		index = index + 1;
	}
	return acronym;
}

/* ************************************ */

describe("Regex", function() {
	
	it("Testing neutral citation regex", function() {
		var neutralCitations = citationData.match(regNeutralCite);
		// remove errant line breaks
		neutralCitations = neutralCitations.map(function(x) {
			return x.replace(/\n/g, " ");
		});
		// make sure each type of neutral citation will return (non-pinpoint at this stage)
		var neutralArray = [];
		neutralArray.push(
			'[2012] NZHC 507',
			'[2012] NZDC 12',
			'[2012] NZCA 12',
			'[2012] NZSC 12',
			'[2012] NZEnvC 13',
			'[2012] NZEmpC 13',
			'[2012] NZACA 13',
			'[2012] NZBSA 13',
			'[2012] NZCC 13',
			'[2012] NZCOP 13',
			'[2012] NZCAA',
			'[2012] NZDRT 13',
			'[2012] NZHRRT 13',
			'[2012] NZIACDT 13',
			'[2012] NZIEAA 13',
			'[2012] NZLVT 13',
			'[2012] NZLCDT 13',
			'[2012] NZLAT 13',
			'[2012] NZSHD 13',
			'[2012] NZLLA 13',
			'[2012] NZMVDT 13',
			'[2012] NZPSPLA 13',
			'[2012] NZREADT 13',
			'[2012] NZSSAA 13',
			'[2012] NZTRA 13' 
		 );
		if(expect(neutralCitations).toEqual(neutralArray)) {console.log('ok')};
		// TODO: pinpoint citations i.e., paragraphs and page references capture
	});

});