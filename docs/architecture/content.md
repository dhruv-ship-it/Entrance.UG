# Content Pillar

## Purpose

The Content pillar is the learning module of the Entrance UG platform.

Students study structured learning material organised by Subjects, Topics and Subtopics.

Every piece of content belongs to a Subtopic.

Students can watch, read or study the content, make personal notes, track completion, and attempt topic-wise content tests.

Unlike the Mock Test pillar, the primary objective of this module is learning rather than examination.

Whenever implementing this module, read this document together with `exam-engine.md`.

---

# Tables

The Content pillar consists of the following tables.

Learning Content

- contents

Student Learning

- student_content_access
- student_content_completion
- content_notes

Content Tests

- content_tests
- content_sections
- content_comprehensions
- content_questions

Student Attempts

- content_attempts
- content_attempt_sections
- content_attempt_answers

Supporting master tables referenced by this module

- students
- subjects
- topics
- subtopics
- difficulty_levels

---

# Module Hierarchy

The learning hierarchy is intentionally structured.

Subject

↓

Topic

↓

Subtopic

↓

Learning Content

↓

Topic Test

↓

Sections

↓

Questions

Example

Quantitative Aptitude

↓

Arithmetic

↓

Percentage

↓

Video Lecture

↓

Notes PDF

↓

Practice Sheet

↓

Topic Test

↓

Questions

Every Content item belongs to one Subtopic.

Every Topic Test belongs to one Topic.

Every Section belongs to one Topic Test.

Every Question belongs to one Section.

Questions may optionally reference a comprehension/passage.

---

# Student Flow

Student Dashboard

↓

Content

↓

Select Subject

↓

Select Topic

↓

Select Subtopic

↓

View Learning Content

↓

Mark Content as Completed

↓

Create Personal Notes

↓

Attempt Topic Test

↓

View Result

---

# Content Types

The Content table supports multiple learning resources.

Examples include

- YouTube Videos
- PDF Notes
- Documents
- External Websites

The frontend should render each type appropriately.

The content type determines how the resource should be opened or displayed.

---

# Student Access

Students must only view content included in their purchased plans.

Access is controlled using

student_content_access

Backend APIs must always validate access before returning content.

Students must never access locked content through direct URLs.

---

# Learning Progress

Learning progress is tracked independently from assessments.

Completed content is stored in

student_content_completion

Students may complete multiple content items under the same Topic or Subtopic.

Progress indicators throughout the application should use completion data rather than test scores.

---

# Personal Notes

Students may create personal notes for every learning content item.

Notes are stored in

content_notes

Notes belong only to the student who created them.

Students cannot access notes created by other students.

---

# Topic Tests

Every Topic may contain a practice test.

Topic Tests follow the shared examination engine described in

exam-engine.md

The Content module should never implement a different examination workflow.

Only the surrounding learning experience differs.

---

# Attempt Rules

A Topic Test creates

content_attempts

Each section creates

content_attempt_sections

Each answered question creates

content_attempt_answers

Submission makes the attempt read-only.

Attempt history should always be preserved.

---

# Analytics Philosophy

Unlike the Mock Test pillar, Content Tests do not maintain dedicated analytics tables.

Performance should primarily be calculated from

- content_attempts
- content_attempt_sections
- content_attempt_answers

Learning progress should combine

- completed content
- practice test performance

to present overall student progress.

---

# Student Experience

The Content module consists of four major areas.

1. Learning Browser

Students browse

Subjects

↓

Topics

↓

Subtopics

↓

Learning Resources

2. Learning Resources

Students

- Watch videos
- Read PDFs
- Open documents
- Visit learning links
- Mark content complete
- Write notes

3. Topic Tests

Students attempt practice tests related to the current topic.

Attempt behaviour is shared with the common examination engine.

4. Learning Progress

Students view

- Completed Content
- Remaining Content
- Topic Progress
- Subject Progress
- Practice Test History

---

# Design Guidelines

The Content module should feel like a modern learning platform.

Learning resources should always receive higher visual priority than practice tests.

Clearly distinguish

Completed

In Progress

Locked

Available

Content.

Use reusable cards.

Maintain consistency with the overall dashboard.

Support responsive layouts.

---

# Important Notes

Do not mix Content tables with Mock Test, Mentorship or RC tables.

The Content module is centred around structured learning.

Assessments exist only to reinforce learning.

All examination behaviour should reuse the shared examination engine defined in `exam-engine.md`.