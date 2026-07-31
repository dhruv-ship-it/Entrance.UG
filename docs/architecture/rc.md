# Reading Comprehension (RC) Pillar

## Purpose

The Reading Comprehension (RC) pillar is a dedicated practice module for improving reading speed, comprehension and accuracy.

Unlike Mock Tests and Batch Tests, RC Tests focus entirely on passage-based reading practice.

Students regularly attempt RC Tests to build consistency, improve reading habits and monitor long-term performance.

Whenever implementing this module, read this document together with `exam-engine.md`.

---

# Tables

The RC pillar consists of the following tables.

RC Tests

- rc_tests
- rc_questions

Student Attempts

- rc_attempts
- rc_attempt_answers

Analytics

- rc_test_analytics
- rc_leaderboard

Supporting master tables referenced by this module

- students
- difficulty_levels

---

# Module Hierarchy

The RC hierarchy is intentionally simple.

RC Test

↓

Passage

↓

Questions

↓

Attempt

↓

Analysis

↓

Leaderboard

Example

Daily RC 01

↓

Passage

↓

10 Questions

↓

Student Attempt

↓

Result

↓

Leaderboard Update

---

# Student Flow

Student Dashboard

↓

Reading Comprehension

↓

Browse Available RC Tests

↓

Read Instructions

↓

Attempt Test

↓

Submit

↓

View Analysis

↓

Leaderboard & Streak

---

# Test Structure

Each RC Test contains a single reading passage.

Multiple questions are associated with that passage.

Questions may use different supported question types as defined in `exam-engine.md`.

The examination workflow should remain consistent with the shared examination engine.

---

# Availability

RC Tests may be scheduled using

- Start Date
- End Date

Students should only see tests that are currently available.

Inactive or expired tests must not be attemptable.

---

# Attempt Rules

Each RC Test generates

- rc_attempts

Each answered question generates

- rc_attempt_answers

Submission makes the attempt read-only.

Attempt history should always be preserved.

---

# Analytics Philosophy

RC analytics focus on long-term reading improvement rather than competitive examination performance.

Overall RC Test analytics are stored in

- rc_test_analytics

Student progress across all RC Tests is stored in

- rc_leaderboard

Applications should use stored analytics whenever possible instead of recalculating statistics.

---

# Leaderboard

The leaderboard tracks a student's overall Reading Comprehension performance.

Examples include

- Current Streak
- Highest Streak
- Total RC Tests Attempted
- Average Score
- Last Completed Date

The leaderboard should update automatically after every completed RC Test.

---

# Student Experience

The RC module consists of four major areas.

1. RC Browser

Students browse available Reading Comprehension Tests.

2. RC Test

Students read the passage and answer questions using the shared examination engine.

3. Test Analysis

Students review

- Score
- Accuracy
- Correct Answers
- Incorrect Answers
- Time Taken
- Question Review

4. Leaderboard

Students monitor

- Reading Streak
- Average Performance
- Overall Progress

---

# Design Guidelines

The Reading Comprehension module should be clean and distraction-free.

The reading passage should receive the highest visual priority.

Maintain readability through proper spacing and typography.

Keep navigation simple.

Maintain consistency with the overall dashboard design.

Support responsive layouts.

---

# Important Notes

Do not mix RC tables with Mock Tests, Content Tests or Mentorship Tests.

The RC module is an independent practice system.

Only the examination engine is shared with other testing modules.

Business rules defined in this document take precedence over assumptions.