# Open Law NZ
Analysis of NZ Case Law and Legislation 

---

This will be a free legal data website, providing open access to New Zealand case law and legislation data with analysis and new insights powered by machine learning. The project is about facilitating access to legal data, by using technology to make it free, open and accessible. 
 
 
There are two primary goals. One is to develop software that can intelligently parse case law data, and discern structure. The second is to make that new data available as a platform, via an open API, so that the data itself can be accessed and queried directly by researchers, policy makers, app developers and anybody else. The open API will allow other people to build their own applications and discover insights using that data. For example, an independently developed chatbot could query the database for cases relevant to a user’s question, and parse the data (to check accuracy), or provide the user with direct links to cases for further investigation.
 
 
The API will power openlaw.nz, which will be a legal research website to work together with a browser plugin which will add related case law data to legislation.govt.nz. The site will allow user generated commentary, with moderation and review by other users.  
 
 
There is a basic website accessible at openlaw.nz functioning off a test database (approximately 5,000 cases). The software can already parse case law pdfs, extract data (such as case name, date, citation), and discern relationships between cases. Current job is legislation relationships.


---

***Plan of attack:***

**Obtaining case law database**


Get as many pdfs as possible - firstly from judicial decisions online, then district court website, and any other publicly accessible sources of pdf case law. 


**Processing case law information**


We need software to extract text from each PDF to process.


The goal is fast and detailed search functionality. Ideally as many particular elements of a case should be searchable as possible (whether through an advanced search field, or a single search field with appropriate search modifiers). 


Jobs here are:


1. Use pattern matching to get easy data - date, judge, court, citations etc
2. Machine learning for harder tasks - categorisation, ratio, sentiment analysis


**Linking data**

There are two primary sources of law in New Zealand - cases and legislation. They are complementary and any research tool must link the two and show links between the two (legislation refers to other legislation; cases refer to legislation; cases refer to other cases). 


Cases link to each other. Cases mention other cases either to approve, distinguish, over-rule, or in passing. That data is useful to determine whether a case is good law or bad law, and how authoritative it is. Users should be able to access that information when looking at a case and ideally what type of reference it is (positive, negative, neutral - using NLP?). The number of times a case has been mentioned by other cases may be an indicator of authoritativeness. 


Cases refer to legislation. It is useful when looking at a legislative provision to easily find cases that discuss it. 


Each case should have a table of cited cases and cited legislative provisions. That data can then be analysed, searched and displayed. 

---

**Current status:**

1. openlawnz-data - contains processor and controller. Controller set up to pull cases from judicial decisions online. Processor converts to plaintext, extracts information and citation references. Adds all to database on aws (relational database service)

2. openlawnz-api - software by which rds is queried, will be public facing api that also powers website openlaw.nz

3. openlawnz-web - front end

---

AWS s3 creds needed at ~/.aws


mySQL creds needed at .env
