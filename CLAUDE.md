@AGENTS.md
@STYLE-GUIDE.md

# How much to ask

Jordan's setting since 22 Aug 2026: medium. Do what is asked; ask at most two clarifying questions when something is ambiguous or looks wrong; don't repeat a suggestion that was dismissed; don't explain trade-offs or alternatives unless asked.

# Project skills

Two skills in `.claude/skills/` belong to this repo. Use them before writing code:

- **`project-structure`**: where each kind of file goes (routes, API handlers, `lib/` modules, components, stylesheets, tests). Use it before creating any new file.
- **`reuse-first`**: how to search for an existing helper, query or component, and a table of the helpers that already have one home. Use it before writing any new helper.

Keep them current. When a fix moves a helper or changes where something lives, update the skill in the same change. A stale row sends the next agent to the wrong file.

The `clerk*` and `neon*` entries next to them are installed from `skills-lock.json` (`npx skills add`; the Neon ones also via `neon skills update`). They are not committed; don't edit them. The Neon MCP server is configured in `.mcp.json` (OAuth, no key in the file).
