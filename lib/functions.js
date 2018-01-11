

module.exports.insertSlash = function(citation,insertString){
    var first = citation.substring(0, 4);
    var second = citation.substring(4);
    return first + insertString + second;
    };

module.exports.getName = function(longName) {
    const regExName = /^(.*?)\ \[/;
    // regex gets everything up to square bracket
    return longName.match(regExName)[1];
}

module.exports.slashToDash = function(str) {
    const regExSlash = /\//g;
    return str.replace(regExSlash, '-');
}

module.exports.getCitation = function(str) {
    const regCite = /(\[?\d{4}\]?)(\s*?)NZ(D|F|H|C|S|L)(A|C|R)(\s.*?)(\d+)*/;
    return str.match(regCite)[0];
}

module.exports.getMOJURL = function(id) {
    return "https://forms.justice.govt.nz/search/Documents/pdf/" + id;
}