function encodeURIfix(str) {
        return encodeURIComponent(str).replace(/!/g, '%21').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27').replace(/_/g, '%5F').replace(/\*/g, '%2A').replace(/\./g, '%2E');
    };


str = ".E.M.A. CHORUS LIMITED v COMMERCE COMMISSION CA229/2014 [2014] NZCA 440 [5 September 2014]* \n GANGNAM PROPERTY INVESTMENTS LTD v AFFIN INTERIORS LTD & Anor [2017] NZHC 3197 _x000b_[15 December 2017] \n SUSAN LYNCH V STAY@DRIFTERSINN LIMITED HC CHCH CIV-2011-409-000910 17 June 2011 \n RAFIQ v YAHOO! NEW ZEALAND LIMITED [2015] NZHC 97 [9 February 2015] \n round brackets ( )";

console.log(encodeURIfix(str));