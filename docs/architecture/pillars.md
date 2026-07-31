Entrance UG Platform Architecture

This document explains the logical separation of the database into functional pillars.

Whenever implementing a feature, only inspect the tables belonging to that pillar, unless another pillar is explicitly required.

Most features are intentionally isolated so that development remains modular and AI agents do not need to reason about the complete schema every time.

Several pillars reuse a common examination engine.

The business rules below describe how the database is intended to be used rather than replacing the Prisma schema.

Shared Examination Engine

The Entrance UG platform contains multiple assessment modules.

Although they serve different purposes, they all share the same examination philosophy.

Examples include:

Mock Tests
Content Tests
Mentorship Batch Tests
Reading Comprehension Tests

Each module has different business rules, but all should expose nearly identical attempting behaviour.

The examination engine should therefore be implemented as reusable infrastructure whenever practical.

Core capabilities supported by every engine include:

MCQ
Multiple Correct
Integer Questions
True/False (if applicable)
Negative Marking
Positive Marks
Question Images
Explanations
Passage-based Questions
Timers
Section Timers
Section Navigation
Question Palette
Review Mode
Auto Save
Auto Submit
Bookmarks
Mark for Review
Previous / Next Navigation
Question Status Tracking
Attempt History
Section Analytics
Final Submission
Attempt Persistence

Each pillar stores its own attempts and analytics using separate tables, but the overall attempting behaviour should remain consistent across the application.

Mock Test Pillar
Purpose

The Mock Test pillar represents the complete entrance examination ecosystem.

Students purchase access to exam types (such as IPMAT or JIPMAT), browse available mock categories, attempt tests, and review detailed analytics.

This pillar should be treated as an independent module.

Tables
exam_types
mock_exam_types
mock_section_types

mock_exams
mock_sections
mock_comprehensions
mock_questions

mock_attempts
mock_attempt_sections
mock_attempt_answers

mock_attempt_analytics
mock_section_analytics

student_mock_access

These tables together represent the complete Mock Test ecosystem.

Supporting Tables

The Mock module also references shared master tables.

These should never be considered part of the Mock module itself.

They provide reusable metadata across the entire platform.

students

subjects
topics
subtopics

difficulty_levels

Logical Hierarchy

The hierarchy intentionally separates examinations into multiple levels.

Exam Type
    ↓
Mock Category
    ↓
Mock Exam
    ↓
Sections
    ↓
Questions

Example

Exam Type
    IPMAT

        ↓

Mock Category
    Full Length

        ↓

Mock Exam
    FLM-01

        ↓

Sections

    Quantitative Aptitude

    Logical Reasoning

    Verbal Ability

        ↓

Questions

Notice that:

Exam Types are completely independent.
Mock Categories are also independent.
A Mock Exam links both together.
Sections belong only to one Mock Exam.
Questions belong only to one Section.
Questions may optionally reference a comprehension/passage.
Student Access

Students should never automatically see every mock.

Visibility is controlled through

student_mock_access

This determines which exam ecosystems a student has purchased and can browse.

All backend APIs must validate access before returning data.

Frontend filtering alone is insufficient.

Attempt Lifecycle

Every mock exam follows this lifecycle.

Browse Exam Types

↓

Browse Categories

↓

Browse Tests

↓

Attempt Test

↓

Submission

↓

Attempt Stored

↓

Analytics Updated

↓

Review Attempt

A student should normally have only one completed attempt for a given mock exam unless future business rules explicitly allow multiple attempts.

Analytics Responsibility

Analytics are intentionally stored separately.

The application should prefer reading analytics tables instead of recalculating expensive aggregate statistics whenever possible.

mock_attempt_analytics

stores overall exam-level analytics.

mock_section_analytics

stores section-level analytics.

Individual attempt information always comes from

mock_attempts

mock_attempt_sections

mock_attempt_answers

Analytics tables should never replace raw attempt data—they complement it.