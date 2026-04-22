# PROJECT_RULES.md

> **Single Source of Truth** for the Get Shit Done methodology.
> Model-agnostic. All adapters and extensions reference this file.

---

## Core Protocol
**SPEC → PLAN → EXECUTE → VERIFY → COMMIT**

1. **SPEC**: Define requirements in `.gsd/SPEC.md` until status is `FINALIZED`
2. **PLAN**: Decompose into phases in `.gsd/ROADMAP.md`, then detailed plans
3. **EXECUTE**: Implement with atomic commits per task
4. **VERIFY**: Prove completion with empirical evidence
5. **COMMIT**: One task = one commit, message format: `type(scope): description`

**Planning Lock**: No implementation code until SPEC.md contains "Status: FINALIZED".

---

## Proof Requirements
Every change requires verification evidence:

| Change Type | Required Proof |
|-------------|----------------|
| API endpoint | curl/HTTP response |
| UI change | Screenshot/Recording |
| Build/compile | Command output |
| Test | Test runner output |
| Config | Verification command |

**Never accept**: "It looks correct", "This should work", "I've done similar before".
**Always require**: Captured output, screenshot, or test result.

---

## Search-First Discipline
**Before reading any file completely:**
1. **Search first** — Use grep, ripgrep, or IDE search to find relevant snippets
2. **Evaluate snippets** — Determine if full file read is justified
3. **Targeted reads** — Only read specific line ranges when needed

---

## Wave Execution
Plans are grouped into **waves** based on dependencies. Wait for Wave completion before starting the next.

---

## Commit Conventions
**Format:** `type(scope): description`
Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

---

## Context Management
- Keep plans under 50% context usage.
- STATE.md = memory across sessions.
- Search-first to minimize token usage.

---

```
Before coding    → SPEC.md must be FINALIZED
Before file read → Search first, then targeted read
After each task  → Commit + update STATE.md
After each wave  → State snapshot
Before "Done"    → Empirical proof captured
```
