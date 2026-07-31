# Mock Test Pillar

## Purpose

The Mock Test pillar is the primary examination module of the Entrance UG platform.

Students purchase access to one or more entrance exam ecosystems (such as IPMAT, JIPMAT, CUET, etc.) and attempt mock tests to analyse their preparation.

This module is completely independent from the Content Tests, Mentorship Tests and RC Tests, although all of them share the same examination engine.

Whenever implementing anything related to Mock Tests, read this document together with `exam-engine.md`.

---

# Tables

The Mock Test pillar consists of the following tables.

Master Tables

- exam_types
- mock_exam_types
- mock_section_types

Mock Definition

- mock_exams
- mock_sections
- mock_comprehensions
- mock_questions

Student Attempts

- mock_attempts
- mock_attempt_sections
- mock_attempt_answers

Analytics

- mock_attempt_analytics
- mock_section_analytics

Access Control

- student_mock_access

Supporting master tables referenced by this module

- students
- subjects
- topics
- subtopics
- difficulty_levels

---

# Module Hierarchy

The hierarchy is intentionally divided into multiple levels.

Exam Type

↓

Mock Category

↓

Mock Test

↓

Sections

↓

Questions

Example

IPMAT

↓

Full Length Mock

↓

Mock 01

↓

Quantitative Aptitude

Logical Reasoning

Verbal Ability

↓

Questions

Exam Types and Mock Categories are independent entities.

A Mock Test references exactly one Exam Type and one Mock Category.

A Section belongs to one Mock Test.

A Question belongs to one Section.

Questions may optionally reference a comprehension/passage.

---

# Student Flow

Student Dashboard

↓

Mock Tests

↓

Select Exam Type

↓

Select Mock Category

↓

View Available Tests

↓

Read Instructions

↓

Attempt Test

↓

Submit

↓

View Analysis

↓

Overall Performance

---

# Access Rules

Students must never automatically receive access to every Mock Test.

Visibility is controlled using

student_mock_access

Every backend endpoint must validate access before returning any data.

Frontend filtering alone is never sufficient.

Students must not access unavailable mocks by modifying URLs.

---

# Attempt Rules

A student may normally attempt a mock only once.

The backend must always validate duplicate attempts.

Once submitted,

attempt data becomes read-only.

Students cannot edit answers after submission.

Analysis pages always read from stored attempt data.

---

# Analytics Philosophy

Analytics are intentionally stored separately instead of being calculated repeatedly.

mock_attempt_analytics

stores overall analytics for one completed mock attempt.

mock_section_analytics

stores analytics for every section inside an attempt.

Raw answers always come from

mock_attempt_answers

Never regenerate expensive analytics if stored values already exist.

Read analytics tables whenever possible.

---

# Student Experience

The Mock Test module consists of four independent parts.

1. Mock Browser

Students browse

Exam Types

↓

Mock Categories

↓

Available Tests

↓

Instructions

↓

Attempt Button

2. Mock Test Engine

Responsible only for attempting tests.

Handles navigation, timers, answering questions, review, submission and persistence.

Business rules are described in

exam-engine.md

3. Individual Test Analysis

Displays detailed analysis of one completed attempt.

Includes score, rank, percentile, accuracy, question review, section analysis and charts.

4. Overall Mock Analytics

Displays long-term performance across multiple mock attempts.

Examples include

- Performance trend
- Rank trend
- Percentile trend
- Subject performance
- Topic performance
- Section performance
- Consistency
- Progress over time

---

# Design Guidelines

The Mock module should feel like the primary feature of the platform.

Use premium dashboard design.

Maintain consistency with the existing design system.

Do not copy reference UI literally.

Prefer reusable components.

Keep navigation simple.

Support responsive desktop and tablet layouts.

---

# Important Notes

Do not mix Mock Test tables with Content Tests, Mentorship Tests or RC Tests.

Each pillar owns its own attempts and analytics.

Only the examination engine is shared between pillars.

Business rules in this file take precedence over assumptions.