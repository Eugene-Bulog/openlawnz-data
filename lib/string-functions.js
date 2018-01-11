

module.exports.insertSlash = function(citation,insertString)
    {
        var first = citation.substring(0, 4);
        var second = citation.substring(4);
        return first + insertString + second;
    };

