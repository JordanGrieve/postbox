@AGENTS.md
@AWS-RULES.md
@STYLE-GUIDE.md

# Project skills

Two skills in `.claude/skills/` belong to this repo. Use them before writing code:

- **`project-structure`**: where each kind of file goes (routes, API handlers, `lib/` modules, components, stylesheets, tests). Use it before creating any new file.
- **`reuse-first`**: how to search for an existing helper, query or component, and a table of the helpers that already have one home. Use it before writing any new helper.

Keep them current. When a fix moves a helper or changes where something lives, update the skill in the same change. A stale row sends the next agent to the wrong file.

The `clerk*` entries next to them are installed from `skills-lock.json` (`npx skills add`). They are not committed; don't edit them.
