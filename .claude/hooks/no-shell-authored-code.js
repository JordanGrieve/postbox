#!/usr/bin/env node
/**
 * PreToolUse gate: refuse to let code be written through a shell.
 *
 * ── WHY THIS EXISTS ──
 * Every other check in this repo runs AFTER the file has been written.
 * Typecheck, lint, 1,696 tests, the CSS parse, the token guards, the browser
 * probes. All of them are post-hoc. This is the only thing that refuses a bad
 * edit at the moment it happens.
 *
 * It encodes the two incidents from AGENTS.md that no later check could catch.
 *
 * ── RULE 1: no backslash through an interpreter, a heredoc or sed ──
 * Content piped through `bash -c`, `node -e` or a heredoc passes two or three
 * levels of unescaping before it lands. On 30 August 2026 this happened three
 * times in one session. Twice the result was a parse error, which tsc caught.
 * The third time it did not:
 *
 *   /rgba?\(\s*([\d.]+)/   was written
 *   /rgba?(s*([d.]+)/      arrived
 *
 * Still a valid regex. It simply never matched, inside a test whose failure
 * branch was `if (!ground) return`, so the check reported green while
 * measuring nothing and passed happily on the values it existed to reject. It
 * was found only by reverting the fix to see whether the test noticed.
 *
 * A test that cannot fail is worse than no test, and this is the shape that
 * produces one.
 *
 * ── RULE 2: no line-range deletion in a stylesheet ──
 * On 9 September 2026 `sed -i 'N,Md'` with N one line early left a stray brace
 * in app/settings.css. Typecheck, lint and every test were green, so it was
 * pushed; the production build failed in CI on `CssSyntaxError: Unexpected }`
 * and the fix that was meant to ship sat undeployed. Nothing before the build
 * reads a stylesheet as CSS, and text with an extra brace still matches a
 * regex.
 *
 * ── WHAT IT DOES NOT DO ──
 * It does not try to judge whether the code is good. It refuses one authoring
 * METHOD and names the tool to use instead. Exit 2 blocks the call and hands
 * stderr back, so the agent reads the reason and can act on it.
 */

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // Unreadable payload is not grounds to block.
  }

  if (input.tool_name !== "Bash") process.exit(0);

  const command = String(input?.tool_input?.command ?? "");
  if (!command) process.exit(0);

  /* Inline interpreter code: node -e, python -c, perl -e, ruby -e. */
  const inlineInterpreter =
    /(?:^|[;&|]\s*)(?:node|python3?|perl|ruby)\s+(?:-\w+\s+)*-(?:e|p|c)\b/;

  /* A heredoc of any flavour: <<EOF, <<-'EOF', <<"SQL". */
  const heredoc = /<<-?\s*["']?[A-Za-z_][A-Za-z0-9_]*/;

  /* In-place sed, whatever order the flags come in. */
  const sedInPlace = /\bsed\b(?:\s+-\w+)*\s+-\w*i\w*\b|\bsed\s+--in-place\b/;

  const authorsThroughShell =
    inlineInterpreter.test(command) ||
    heredoc.test(command) ||
    sedInPlace.test(command);

  if (authorsThroughShell && command.includes("\\")) {
    process.stderr.write(
      [
        "Blocked: this writes file content containing a backslash through a shell.",
        "",
        "Backslashes do not survive being typed through bash -c, node -e, a",
        "heredoc or sed. They are unescaped two or three times before landing,",
        "and the dangerous outcome is not a parse error: it is a regex that",
        "still parses and silently matches nothing. See AGENTS.md, 30 August",
        "2026.",
        "",
        "Use the Write or Edit tool instead. That is every regex, every \\n and",
        "every escaped quote.",
      ].join("\n") + "\n",
    );
    process.exit(2);
  }

  /* Line-range deletion against a stylesheet. */
  const lineRangeDelete = /\b\d+\s*,\s*\d+\s*d\b/;
  if (
    sedInPlace.test(command) &&
    lineRangeDelete.test(command) &&
    /\.css\b/.test(command)
  ) {
    process.stderr.write(
      [
        "Blocked: line-range deletion against a stylesheet.",
        "",
        "A range off by one line leaves a stray brace. Nothing before the",
        "production build reads a stylesheet as CSS, so typecheck, lint and the",
        "whole test suite stay green and the build fails in CI. See AGENTS.md,",
        "9 September 2026.",
        "",
        "Print both ends of the range and look at them, then use Edit to remove",
        "the block by its text. Run the CSS parse afterwards, not only",
        "typecheck.",
      ].join("\n") + "\n",
    );
    process.exit(2);
  }

  process.exit(0);
});
