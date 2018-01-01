# freelaw
NZ Case Law and Legislation 

---

This will be a free legal research website, providing fast access to and searching of New Zealand case law and legislation, with user-generated commentary and publicly accessible APIs. 

---

***Plan of attack:***

**Obtaining case law database **
Case law in NZ is mostly available in PDF form via judicial decisions online (JDO - https://forms.justice.govt.nz/jdo/Search.jsp) and the District Court website (http://www.districtcourts.govt.nz/). JDO's search can be used to generate a JSON file of all cases, and urls to each pdf can be generated from that information. Therefore a script can iterate through the JSON file and download each PDF (ease of doing the same with District Court website - unsure at this point, needs to be investigated)


End goal in this are is an application that will take a JSON file generated from either JDO or the District Court website, enter basic case law info into a database, download its PDF, and send it on for data processsing. There should also be a script that checks for and obtains any new cases from either source regularly (say once per day).


**Processing case law information **
We need software to extract text from each PDF, for two purposes: (1) fast search and (2) displaying the cases in HTML. Modern (last ~15 years) cases are properly formatted PDFs with searchable text, but older cases are not. Therefore the software needs to be able to handle OCR, so that older cases can be uploaded and entered into the database. 


The goal is fast and detailed search functionality. Ideally as many particular elements of a case should be searchable as possible (whether through an advanced search field, or a single search field with appropriate search modifiers). 


The application therefore should process cases and extract as much data from each as possible. Guesses or uncertain information can be flagged as such for user-review or confirmation at a later stage, perhaps with a threshold, or a voting system. 


All cases have common elements which may be useful for structured (or unstructured?) search: case name, citation, date, judge(s), court level, court location, parties involved, type of decision (final, interim, interlocutory), lawyers, main text, footnotes. Some cases have diagrams or schedules. Two particularly important pieces of data in each case is "other cases mentioned or cited" (in the main text or footnotes), and "legislation cited". See below under "linking data".


Cases also should be categorised by topic and subtopic. The more granular the categorisation the better. However the better the search application is at discerning context, the less important categorisation is. For example, if a search for "relationship property agreement" is intelligent enough to include results for "section 21 agreement", that category is not necessary. 


There are a few ways to do the data extraction. One is basic pattern matching at time of PDF -> html/text conversion. Case name and citation will be available from the initial import except where there are errors in the initial JSON file. Some additional elements might be easiest to to implement at that early stage (date and court level perhaps). Another is searching for specific phrases ("in the [...] at [...]" on the first page will give Court level and location), or formatting peculariaties (headings and subheadings may reveal useful data like categories or results/orders made).


Natural language processing may be useful, particularly for tasks like categorisation, ratios of cases, obiter comments, and determining whether a reference to another case is positive or negative.


Any desired data elements that cannot be extracted with certainty could be "best guess" and flagged or left blank. Users of the website, as they come across cases, can suggest the missing data.


For display purposes, data extraction (at least of the main text) should preserve as much original formatting as possible and flag problematic pages for user review. At the very least, paragraphs and paragraph numbering should be preserved. If more can be preserved, that would be best (cases may include bold, italics, subscript or superscript, diagrams, and pictures (very rarely). It may require two different PDF conversion tools (extract for data, and extract for display).


**Linking data **

There are two primary sources of law in New Zealand - cases and legislation. They are complementary and any research tool must link the two and show links between the two (legislation refers to other legislation; cases refer to legislation; cases refer to other cases). 


When looking at a section of an act, it is useful to be able to find cases that refer to that section. That provides authoritative commentary on how the section is applied in practice. 


Therefore where a case mentions a section of an Act, that is a piece of data that needs to be extracted and stored. Some cases will mention a section in passing and some will mention it alongside a detailed analysis. Perhaps in the long term user-voting can be used to identify the most useful cases talking about a particular section. 


The website should be able to display current NZ legislation and search. All legislation is already available as XML here: http://www.legislation.govt.nz/subscribe/ (with most useful being public acts here http://www.legislation.govt.nz/subscribe/act/public) ordered by date. That xml feed mirrors the official source so includes any updates, corrections and is always the latest version. 


Long term, variations to acts need to be tracked. An amendment may come into force but will not have retrospective effect, therefore  data on freelaw about the revoked / un-amended version will still be useful and should be accessible (on request, not by default). This may be too difficult to implement early on.


Similarly, cases link to each other. Cases mention other cases either to approve, distinguish, over-rule, or in passing. That data is useful to determine whether a case is good law or bad law, and how authoritative it is. Users should be able to access that information when looking at a case and ideally what type of reference it is (positive, negative, neutral - using NLP?). The number of times a case has been mentioned by other cases will also be an indicator of authoritativeness. 


**Display**

The site must be clean, minimalist and responsive. It may be used in a hurry, or in Court on a mobile device.


PDFs need to be kept, and easily accessible. Use of a case in Court requires the original PDF so it may be needed for download and printing.


However the primary method of viewing cases will be HTML so that display of case law can be customised, readable, responsive, and user comments/annotations can be added.


**Search**

TBC - considerations:

1. What tools? 
2. Structured or unstructured? Database structure?
3. Speed


---

Current status:

1. add-db.js takes specified json file (from judicial decisions online), extracts case name, citation and PDF url, adds all to a mysql database. 

2. index.js looks up PDF urls from database, downloads file locally, adds to s3 bucket, deletes local file

---

AWS s3 creds needed at ~/.aws

mySQL creds needed at .env

Description of JSON files in project:
1. Data.json - JDO output of all files up to 19 dec
2. data-limited.json - sample very small set
3. data-errors.json with formatting errors for testing
4. data-test-set.json - medium 2,500 set
5. data-test-set-2.json - macrons and curly apostrophes for utf8 checking
