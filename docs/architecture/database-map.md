# Database Map

This document provides a high-level map of the Entrance UG database.

Its purpose is to quickly identify which tables belong to which business pillar.

For business rules, workflows and relationships, refer to the corresponding architecture document.

The Prisma schema remains the source of truth for database structure.

---

# Users & Authentication

Core Users

- admins
- mentors
- students
- parents
- parent_student

Authentication

- email_verifications

Related Document

→ users.md

---

# Academic Masters

Shared master tables referenced throughout the platform.

- subjects
- topics
- subtopics
- difficulty_levels

These tables should not be considered part of any individual pillar.

---

# Mock Tests

Master Tables

- exam_types
- mock_exam_types
- mock_section_types

Mock Definitions

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

Related Document

→ mock-tests.md

---

# Learning Content

Learning Resources

- contents

Access

- student_content_access

Learning Progress

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

Related Document

→ content.md

---

# Mentorship

Programs

- mentorship_programs

Batch Management

- mentorship_batches
- mentor_batch_assignments
- student_batch_access

Learning Activities

- batch_tasks
- completed_tasks

Communication

- batch_notices
- doubts
- doubt_replies

Live Sessions

- live_sessions
- attendance

Batch Tests

- batch_tests
- batch_sections
- batch_comprehensions
- batch_questions

Student Attempts

- batch_attempts
- batch_attempt_sections
- batch_attempt_answers

Analytics

- batch_test_analytics
- batch_section_analytics

Related Document

→ mentorship.md

---

# Reading Comprehension

Tests

- rc_tests
- rc_questions

Student Attempts

- rc_attempts
- rc_attempt_answers

Analytics

- rc_test_analytics
- rc_leaderboard

Related Document

→ rc.md

---

# Plans & Payments

Plans

- plans

Plan Mappings

- plan_mock_exams
- plan_mentorship_programs

Payments

- payments

Purchases

- purchases

Related Document

→ payments.md

---

# System

Dashboard

- dashboard_notices

Feedback

- feedback

Website Configuration

- website_settings

Related Document

→ system.md

---

# Shared Examination Engine

The following modules share the same examination engine.

- Mock Tests
- Content Tests
- Mentorship Batch Tests
- Reading Comprehension Tests

All common examination behaviour is documented in

→ exam-engine.md

Each module stores its own

- Questions
- Attempts
- Analytics

Only the examination behaviour is shared.

---

# Architecture Documents

README.md

High-level project overview.

database-map.md

Quick table lookup.

exam-engine.md

Shared examination behaviour.

users.md

Authentication and user management.

mock-tests.md

Mock Test business rules.

content.md

Learning Content business rules.

mentorship.md

Mentorship business rules.

rc.md

Reading Comprehension business rules.

payments.md

Plans, purchases and payment flow.

system.md

Dashboard notices, feedback and website settings.
