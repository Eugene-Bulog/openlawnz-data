var assert = require('assert');
var fs = require('fs');

var firstTest = fs.readFileSync('./test_data/case1.txt', 'utf8');
var secondTest = fs.readFileSync('./test_data/case2.txt', 'utf8');
var thirdTest = fs.readFileSync('./test_data/case3.txt', 'utf8');
var fourthTest = fs.readFileSync('./test_data/case4.txt', 'utf8');

/* ******************************* */
/* REGEX */

const sectionsSearch = new RegExp(/(\b((section(s)*)|s{1,2})\b) \b\d{1,4}\w{0,3}\b( (and|to) \b\d*\w{1,3}\b)*/, "gi");
const explicitDefinitionRegex = "(\\((?:[\"\'](.*)[\"\']\\)|(.*)\\)))";
const regNeutralCite = /((?:\[\d{4}\]\s*)(?:(NZDC|NZFC|NZHC|NZCA|NZSC|NZEnvC|NZEmpC|NZACA|NZBSA|NZCC|NZCOP|NZCAA|NZDRT|NZHRRT|NZIACDT|NZIPT|NZIEAA|NZLVT|NZLCDT|NZLAT|NZSHD|NZLLA|NZMVDT|NZPSPLA|NZREADT|NZSSAA|NZSAAA|NZTRA))(?:\s*(\w{1,6})))/g;

/* ***************************** */
/* FUNCTIONS */

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

function acr(s) {
    var words, acronym, nextWord, index;
    words = s.replace(/\(|\)/g, '').split(' ');
    acronym = "";
    index = 0
    // only do it for number of words less one to exclude date
    while (index < (words.length - 1)) {
        nextWord = words[index];
        acronym = acronym.toUpperCase() + nextWord.charAt(0);
        index = index + 1;
    }
    return acronym
}

/* ************************************ */

describe('Regex', function () {
    it('Testing section regex', function () {

        const foundSections = firstTest.matchAll(sectionsSearch);
        // test the 10 section matches
        assert.equal(foundSections[0][0], "Sections 10 and 12");
        assert.equal(foundSections[1][0], "ss 5 and 56");
        assert.equal(foundSections[2][0], "Section 381A");
        assert.equal(foundSections[3][0], "section 3");
        assert.equal(foundSections[4][0], "s 3");
        assert.equal(foundSections[5][0], "Ss 2 to 45B");
        assert.equal(foundSections[6][0], "Section 4");
        assert.equal(foundSections[7][0], "Section 49");
        assert.equal(foundSections[8][0], "section 50");
        assert.equal(foundSections[9][0], "Section 2");
        assert.equal(foundSections[10][0], "section 3");
        // should only be 10 secction matches
        assert.ifError(foundSections[11]);
    });

    it('Testing explicit definition #1 - RMA in case1', function () {
        const firstTestLegislation = "Resource Management Act 1991 ";
        var leg = firstTestLegislation.concat(explicitDefinitionRegex);
        const explicitDefinition = firstTest.match(leg);
        assert.equal(explicitDefinition[1], "('the RMA')");
        // console.log(explicitDefinition);
    });

    it('Testing explicit definition #2 - Companies in case2', function () {
        const secondTestLegislation = "Companies Act 1993 ";
        var leg = secondTestLegislation.concat(explicitDefinitionRegex);
        const explicitDefinition = secondTest.match(leg);
        assert.equal(explicitDefinition[1], '("the Act")');
    });

    it('Testing neutral citation regex', function () {
        var neutralCitations = fourthTest.match(regNeutralCite);
        // remove errant line breaks
        neutralCitations = neutralCitations.map(function (x) { return x.replace(/\n/g, ' '); })
        var neutralArray = [];
        neutralArray.push('[2016] NZHC 2669',
            '[2016] NZHC 2669',
            '[2012] NZHC 2422',
            '[2014] NZHC 1777',
            '[2014] NZDC 987',
            '[2015] NZHC 2935',
            '[2014] NZHC 1777',
            '[2010] NZSC 5',
            '[2013] NZCA 469',
            '[2014] NZSC 147',
            '[2014] NZDC 987');
        assert.deepEqual(neutralCitations, neutralArray);
    });

    it('Testing tribunal citation regex', function () {
        var tribunalCitations = thirdTest.match(regNeutralCite);
        // remove errant line breaks
        tribunalCitations = tribunalCitations.map(function (x) { return x.replace(/\n/g, ' '); })
        var tribunalArray = [];
        tribunalArray.push('[2016] NZHC 1650',
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
            '[2012] NZTRA 13');
        assert.deepEqual(tribunalCitations, tribunalArray);
    });
});

describe('Logic test', function () {
    it('TBC', function () {
       
    });
});
