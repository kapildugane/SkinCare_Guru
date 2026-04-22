# GSD-STYLE.md

> Style and conventions for the Get Shit Done methodology.

## Semantic Containers
Use XML tags for semantic meaning in plans and tasks.

```xml
<task type="auto" effort="medium">
  <name>Descriptive Name</name>
  <files>path/to/file</files>
  <action>Instructions</action>
  <verify>command</verify>
  <done>measurable criteria</done>
</task>
```

## Effort Values
- `low`: Simple edits
- `medium`: Standard (default)
- `high`: Complex logic
- `max`: Architecture

## Communication Style
- **Imperative Voice**: "Create the file" instead of "I will create the file".
- **No Filler**: Be direct.
- **No Sycophancy**: "Phase complete" instead of "Great job!".

## Decision Gates
```
⚠️ DECISION REQUIRED

Option A: ...
Option B: ...

Which do you prefer?
```

## Commit Format
`type(scope): description`
Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
One task = one commit.
Verify before commit.
