---
module: orchestration
problem_type: config_error
tags: ["spawn_agent","timeout","timeoutMs","long-running"]
---
### [2026-04-03] Agent timeoutMs must accommodate multi-unit refactors
When dispatching backend engineers doing multi-unit refactors (5+ code change units), `timeoutMs: 600000` (10 min) is too short. The agent continues running in its Zellij pane after the TDM connection times out.

**Recommendation:** Use `timeoutMs: 1800000` (30 min default) for engineers doing substantial implementation work, or don't override it at all. Only use shorter timeouts for quick verification agents.

The agent is NOT crashed — it's still working. The TDM just loses the ability to receive the completion signal. Check `git log` and `git status` to monitor progress of timed-out agents.
