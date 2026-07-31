# Mentorship Pillar

## Purpose

The Mentorship pillar is the guided learning ecosystem of the Entrance UG platform.

Unlike the Content pillar, which focuses on self-paced learning, the Mentorship pillar provides structured batches where mentors guide students through scheduled tasks, live sessions, discussions and assessments.

Students purchase mentorship programs, join batches, interact with mentors, complete assignments and monitor their progress throughout the batch.

Whenever implementing this module, read this document together with `exam-engine.md`.

---

# Tables

The Mentorship pillar consists of the following tables.

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

Live Learning

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
- batch_question_analytics
- batch_topic_analytics
- batch_subtopic_analytics

Supporting master tables referenced by this module

- students
- mentors
- subjects
- topics
- subtopics
- difficulty_levels

---

# Module Hierarchy

The mentorship hierarchy is intentionally organised.

Mentorship Program

↓

Batch

↓

Mentor Assignment

↓

Students

↓

Tasks

Live Sessions

Notices

Doubts

Batch Tests

↓

Progress & Analytics

Example

IPMAT Premium Mentorship

↓

Morning Batch

↓

Assigned Mentor

↓

100 Students

↓

Weekly Tasks

Weekly Live Sessions

Weekly Tests

↓

Performance Tracking

---

# Student Flow

Student Dashboard

↓

Mentorship

↓

Select Purchased Program

↓

Enter Assigned Batch

↓

View Dashboard

↓

Complete Tasks

↓

Attend Live Sessions

↓

Read Notices

↓

Ask Doubts

↓

Attempt Batch Tests

↓

View Progress

---

# Access Rules

Students must only access batches that they have purchased.

Access is controlled using

student_batch_access

Backend APIs must always validate access before returning any information.

Students must never access another batch by changing URLs.

Inactive or expired memberships should immediately lose access.

---

# Programs

A Mentorship Program represents the product sold to students.

Examples

- IPMAT Premium
- CUET Elite
- JIPMAT Foundation

Programs contain one or more batches.

Programs do not directly contain students.

---

# Batches

A Batch represents one running classroom.

Each batch belongs to one Mentorship Program.

Students join batches.

Mentors are assigned to batches.

All activities inside mentorship occur within a batch.

Examples include

- Morning Batch
- Evening Batch
- Weekend Batch

---

# Mentor Assignment

Mentors are assigned using

mentor_batch_assignments

A mentor may teach multiple batches.

A batch may have one or more mentors.

Assignments should remain historically traceable.

---

# Student Membership

Students join batches through

student_batch_access

This table controls

- Batch access
- Purchase relationship
- Expiry
- Active membership

Never infer membership from purchases alone.

Always validate this table.

---

# Tasks

Mentors create learning tasks for students.

Tasks are stored in

batch_tasks

Student completion is stored in

completed_tasks

Tasks may contain

- Instructions
- Attachments
- Start Date
- Due Date

Students may complete tasks independently.

---

# Notices

Mentors communicate important announcements using

batch_notices

Examples include

- Schedule changes
- Assignment reminders
- Session announcements
- Holiday notices

Students can only view notices belonging to their own batch.

---

# Doubts

Students may ask doubts within their batch.

Doubts are stored in

doubts

Replies are stored in

doubt_replies

Replies support nested conversations using

parent_reply_id

Mentors and students may participate in discussions according to platform permissions.

Every reply should preserve conversation history.

---

# Live Sessions

Mentors schedule classes using

live_sessions

Sessions include

- Meeting Link
- Start Time
- End Time

Student attendance is stored in

attendance

Attendance should only represent participation in that session.

---

# Batch Tests

Every batch may contain multiple tests.

Batch Tests use the common examination engine described in

exam-engine.md

The Mentorship module should not implement a separate examination workflow.

Only surrounding mentorship features differ.

---

# Attempt Rules

Batch Tests generate

batch_attempts

Each section generates

batch_attempt_sections

Each answered question generates

batch_attempt_answers

Submission makes attempts read-only.

Attempt history must always be preserved.

---

# Analytics Philosophy

The Mentorship pillar contains detailed analytics.

Analytics are intentionally stored separately.

Overall Test Analytics

- batch_test_analytics

Section Analytics

- batch_section_analytics

Question Analytics

- batch_question_analytics

Topic Analytics

- batch_topic_analytics

Subtopic Analytics

- batch_subtopic_analytics

Applications should read stored analytics whenever possible instead of recalculating them.

Raw attempt data should only be used when detailed review is required.

---

# Student Experience

The Mentorship module consists of six major areas.

1. Program Browser

Students view purchased mentorship programs.

↓

Assigned Batch

2. Batch Dashboard

Students see

- Mentor
- Upcoming Sessions
- Pending Tasks
- Notices
- Recent Activity

3. Learning Activities

Students

- Complete Tasks
- Track Progress

4. Communication

Students

- Read Notices
- Ask Doubts
- Reply to Discussions

5. Live Classes

Students

- Join Sessions
- Attendance Tracking

6. Batch Tests

Students attempt scheduled tests.

Attempt behaviour is shared through the common examination engine.

---

# Design Guidelines

The Mentorship module should resemble a modern online classroom.

Important information should always appear first.

Examples

- Upcoming Session
- Pending Task
- Recent Notice
- Unanswered Doubts

Students should immediately understand what requires attention.

Maintain consistency with the overall dashboard.

Use reusable components.

Support responsive layouts.

---

# Important Notes

Do not mix Mentorship tables with Mock Tests, Content or RC modules.

All learning activities occur inside batches.

Programs manage batches.

Batches manage students.

Only Batch Tests use the shared examination engine.

Business rules defined in this document take precedence over assumptions.