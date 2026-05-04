# AI Agent Workspace

This directory is the **persistable workflow journal** for the AI agent working on the Resource Allocator project.

## Purpose

Track sprint-driven tasks so work stays focused, contextually retrievable, and properly sequenced.
Each sprint captures discussions, decisions, and implementation status for a discrete set of tasks.

---

## Directory Structure

```
ai-agent-workspace/
├── README.md                  ← this file
└── sprint_{seq}/
    ├── sprint_index.md        ← sprint overview, task status, brief description
    └── {priority}_{priority_seq}_{task_seq}_{brief}.md
```

### Sprint naming
`sprint_01`, `sprint_02`, … — sequence starts at `01`.  
Start the next sprint when the current one is fully done or explicitly closed.

### Task file naming
`{priority}_{priority_seq}_{task_seq}_{three_to_five_words_brief}.md`

| Part | Values | Meaning |
|---|---|---|
| `priority` | `crit`, `high`, `low` | Urgency / importance |
| `priority_seq` | `01`, `02`, … | Order within same priority |
| `task_seq` | `01`, `02`, … | Overall sprint task number |
| `brief` | 3–5 words, underscore-separated | At-a-glance title |

**Example:** `high_01_01_participant_details_api.md`

### Task file — bare-minimum structure

Every task file must contain at minimum:

```markdown
# {PRIORITY}-{PRIORITY_SEQ}-{TASK_SEQ} — {Human readable title}

**Priority:** CRIT | HIGH | LOW
**Sprint:** NN
**Status:** TODO | IN PROGRESS | DONE | BLOCKED

---

## Goal

One paragraph explaining what this task achieves and why.

## Context

Multiple paragraphs, lists, tables etc., as necessary -- describing the context of this task, linking to related tasks, and any relevant background information.

---

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

Additional sections are optional but encouraged for non-trivial tasks:

| Section | When to add |
|---|---|
| `## Problem` / `## Root cause analysis` | Bug fixes, investigations, root cause analysis revelations |
| `## Implementation plan` | Features with multiple steps birds-eye-view of overall approach |
| `## Affected files` | Any code changes which this plan affects |
| `## Notes / Decisions` | Design choices, trade-offs |
| `## Discussion` | Ongoing discussion for in-progress tasks and mid-sprint updates or pivots for the task(s) |

### Sprint index
Each sprint has a `sprint_index.md` that lists:
- Sprint goal / theme
- All tasks with status: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`
- Notes / blockers

---

## Conventions

- All discussion for a task lives **in that task's file only** — keeps context tight.
- When picking up from a previous session, read `sprint_XX/sprint_index.md` to orient.
- Mark tasks `DONE` in the index file once implementation + build-verified.
- Never delete task files — they serve as a historical record.
