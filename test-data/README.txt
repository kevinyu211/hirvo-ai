TEST DATA FOR ADMIN PAGE
========================

This folder contains resume + job description pairs for testing the self-improving database system.

HOW TO USE:
-----------
1. Go to /admin in your browser
2. Copy-paste the job description from a job-*.txt file
3. Copy-paste the matching resume from a resume-*.txt file
4. Select the appropriate outcome
5. Click "Submit & Auto-Label"
6. Review labels and save

TEST CASES:
-----------

POSITIVE OUTCOMES (Got Interview/Offer):
----------------------------------------
1. Marketing Manager
   - Resume: resume-1-marketing-positive.txt
   - Job: job-1-marketing-manager.txt
   - Outcome: Positive > Got Interview
   - Industry: Marketing/SaaS

2. Data Scientist
   - Resume: resume-2-data-scientist-positive.txt
   - Job: job-2-data-scientist.txt
   - Outcome: Positive > Got Offer
   - Industry: Finance/Tech

3. Product Manager
   - Resume: resume-4-product-manager-positive.txt
   - Job: job-4-product-manager.txt
   - Outcome: Positive > Got Interview
   - Industry: Technology/SaaS

4. ICU Nurse
   - Resume: resume-5-nurse-positive.txt
   - Job: job-5-icu-nurse.txt
   - Outcome: Positive > Got Offer
   - Industry: Healthcare

NEGATIVE OUTCOME (Rejected):
----------------------------
5. Junior Dev applying for Senior Role
   - Resume: resume-3-junior-dev-negative.txt
   - Job: job-3-senior-developer.txt
   - Outcome: Negative > Rejected by ATS
   - Industry: Technology
   - Notes: Tests underqualified candidate scenario

WHAT THIS TESTS:
----------------
- Auto-labeling API (extracts job title, industry, skills, etc.)
- Embedding generation (OpenAI text-embedding-3-small)
- Pattern extraction (formatting and content patterns)
- Database insertion into resume_examples table
- Success rate tracking for format recommendations

AFTER ADDING EXAMPLES:
----------------------
Test the user flow at /dashboard with similar job descriptions.
The format recommendations should show success rates based on your examples.
