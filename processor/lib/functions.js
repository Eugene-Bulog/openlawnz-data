

module.exports.insertSlash = function(citation,insertString){
    var first = citation.substring(0, 4);
    var second = citation.substring(4);
    return first + insertString + second;
    };

module.exports.formatName = function(longName) {
    const regExName = /^(.*?)\ \[/;
    const regExFileNumber = /(.*)(?= HC| COA| SC| FC| DC)/;
    // regexName gets everything up to square bracket
    // if that matches, return that
    if(longName.match(regExName)) {
        return longName.match(regExName)[1];
    }
    // if not, regExLongName matches everything up to the first " HC", coa, sc, fc or dc, those usually signifying the start of case reference
    else {
        if(longName.match(regExFileNumber)) {
            return longName.match(regExFileNumber)[1]
        }
        else { return "Unknown case" };
    }
}

module.exports.slashToDash = function(str) {
    const regExSlash = /\//g;
    return str.replace(regExSlash, '-');
}

module.exports.getCitation = function(str) {
    const regCite = /(\[?\d{4}\]?)(\s*?)NZ(D|F|H|C|S|L)(A|C|R)(\s.*?)(\d+)*/;
    // try for neutral citation
    if(str.match(regCite)) {
        return str.match(regCite)[0];
    }
    else {
        // try for other types of citation
        const otherCite = /((\[\d{4}\])(\s*)NZ(D|F|H|C|S|L)(A|C|R)(\s.*?)(\d+))|((HC|DC|FC) (\w{2,4} (\w{3,4}).*)(?=\s\d{1,2} ))|(COA)(\s.{5,10}\/\d{4})|(SC\s\d{0,5}\/\d{0,4})/;
        if(str.match(otherCite)) {
            return str.match(otherCite)[0];
        }
        else {
        return null}
    }
}
module.exports.getMOJURL = function(id) {
    return "https://forms.justice.govt.nz/search/Documents/pdf/" + id;
}
