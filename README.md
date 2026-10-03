# Claude Code mods starter

Five small, commented mods you can run, read, and change, plus prompts for asking Claude to build your own.

Built and checked against Claude Code **v2.1.287**, the release where mods launched (October 1, 2026). The mods API is marked early access, so names can change between releases. Run `claude --version` to see yours.

## What a mod is

A mod is a small TypeScript or JavaScript file that Claude Code runs inside itself while you work. It can watch what Claude does, change or block it, and draw things on screen, such as a line above the prompt or a side panel. It ships as a normal Claude Code plugin, so you install, update, and turn it off with `/plugin`.

## The formula

Almost every mod idea fits one sentence:

> **When** [trigger], **[watch / change / block]** [what], **show it in** [place], **using** [data].

Examples from this repo:

| Mod | When | Move | Show it in | Using |
| :- | :- | :- | :- | :- |
| `status-band` | a turn starts, a tool runs, a turn ends | watch | the band above the prompt | the tool name and a clock |
| `panel-with-buttons` | Claude edits a file | watch | a pane, opened by `/edits` | the file path |
| `guard` | Claude runs a risky shell command | block (ask first) | the question dialog | the command text |
| `slash-command` | you type `/plain-recap` | answer | the transcript | the conversation and a small model |
| `dashboard` | every 60 seconds | watch | a pane, opened by `/dashboard` | a JSON URL |

Write your idea in that shape before you start. It tells you which event to hook, which move to make, and which surface to draw on.

## Cheat sheet

### Six places a mod can show something

| Place | How | Notes |
| :- | :- | :- |
| Band above the prompt | `ui.render` hook on `{ component: 'AbovePrompt' }` | Always there, shared by every mod. Terminal and Desktop. |
| Pane | `$.ui.open({ id })`, then a `ui.render` hook on `{ component: 'Pane' }` | A sidebar in a wide fullscreen terminal, otherwise a box above the prompt. |
| Status line | `$.ui.status('text')` | One line under the prompt, shown as `⚠ your-mod: text`. |
| Toast | `$.ui.toast('text')` | Pops up at the top right for 4 seconds. |
| Transcript line | `$.ui.log('text')` | A dim line in the conversation. Claude does not read it. |
| Built-in parts | `ui.render` hook on `Spinner`, `ToolUse`, `AssistantMessage`, and others | Restyle or replace what Claude Code already draws. The permission prompt is off limits. |

### Eight events worth knowing

| Event | Fires when |
| :- | :- |
| `session.start` | The session starts, and again each time the mod reloads. Register commands and start timers here. |
| `prompt.submit` | You send a prompt. Rewrite it, add hidden context, or drop it. |
| `turn.start` | Claude starts working on your prompt. |
| `tool.call` | Claude is about to use a tool (read, edit, run a command). Watch, change, or refuse it. |
| `turn.complete` | Claude finished (or you interrupted). Has the answer, the duration, and token usage. |
| `command.run` | Someone runs a slash command. Answer your own commands here. |
| `ui.render` | Claude Code is about to draw a place on screen. Return what to draw. |
| `classic.<Name>` | Any settings-hook event, such as `classic.Stop` or `classic.PermissionRequest`. |

### Three moves

Every hook gets `($, e, next)`: `$` is what the mod can call, `e` is the event, and `next` passes the event along.

| Move | Code | Example |
| :- | :- | :- |
| Observe | `return next(e)` | Count tool calls and let them run. |
| Rewrite | `return next({ ...e, text: 'new text' })` | Trim a prompt before it is sent. |
| Answer | `return { deny: 'reason' }` (no `next`) | Refuse a command. Claude reads the reason. |

## Try the templates

Clone this repo, then pick a mod.

**In the terminal**, load one or more mods for a single session:

```bash
claude --plugin-dir ./mods/status-band
claude --plugin-dir ./mods/guard --plugin-dir ./mods/slash-command
```

**In the Desktop app** (Code tab), where you can't pass flags, add the folders to the `env` block of `~/.claude/settings.json`. Use absolute paths, separated by `:` (or `;` on Windows), then start a new session:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/Users/you/claude-mods-starter/mods/status-band:/Users/you/claude-mods-starter/mods/dashboard"
  }
}
```

**As an install**, once this repo is on GitHub:

```text
/plugin marketplace add carlvellotti/mods-starter
/plugin install status-band@mods-starter
```

To check that a mod loaded, run `/plugin` and open the **Installed** tab. A line such as `1 mod active · status-band` should name it.

What each template does once loaded:

| Mod | Try this |
| :- | :- |
| `status-band` | Ask Claude anything that uses tools. The band reads `Working 12s Reading README.md`, then `Waiting on you 41s Done` when Claude finishes. In the terminal, a permission prompt covers the band while it is open. |
| `panel-with-buttons` | Ask Claude to edit a file, then type `/edits`. Press `c` to clear, `x` or Esc to close. |
| `guard` | Ask Claude to run `rm -rf some-folder`. You get a Proceed / Cancel question first. |
| `slash-command` | After a few turns, type `/plain-recap`, or `/plain-recap focus on open risks`. |
| `dashboard` | Type `/dashboard`. Change the URL and fields in `/config` (or under `pluginConfigs` in settings). |

## Ask Claude to build one

You don't have to write code. Claude Code has a built-in `plugin-authoring` skill for this.

1. **Describe it.** In a session, say what you want using the formula, for example `make a mod that shows the current git branch above the prompt`. Typing `/plugin-authoring` first loads the skill explicitly. [PROMPTS.md](PROMPTS.md) has 12 prompts to copy.
2. **Approve.** Claude writes the mod to `~/.claude/dev-mods/<session-id>/<mod-name>/`. You approve each file (that folder is protected), and on the first file Claude Code asks **Enable hot reloading for this session?** Pick **Enable for this session**. The mod loads when Claude's turn ends.
3. **Iterate.** Try it, then tell Claude what to change. It reloads at the end of each turn that edits it.
4. **Keep it.** That folder is deleted after `cleanupPeriodDays`. Copy the mod somewhere of your own, such as `~/mods/git-branch`, and load it with `claude --plugin-dir ~/mods/git-branch`.

To change a template instead, copy its folder, rename `name` in its `.claude-plugin/plugin.json`, start `claude --plugin-dir ./mods/<your-copy>`, and ask Claude for the change. Names must not start with `claude-` or look like Anthropic's own, or validation fails.

## Check and test

```bash
claude plugin validate mods/guard        # what the mod hooks and calls, and any errors
claude plugin validate --strict mods/guard
claude plugin test mods/guard            # runs mods/guard/tests/*.test.ts, no session needed
```

Read the `hooks:` and `calls:` lines that `validate` prints. They are the mod's ingredient list: every event it listens to and every capability it uses (`$.http.fetch`, `$.process.run`, `$.fs.write`, and so on).

If a mod does nothing:

- Run `claude plugin validate` on its folder and fix what it reports.
- Start with `claude --debug` and search the log for the mod's name.
- A message containing `the rollout switch served off` means mods are turned off for your account from Anthropic's side. No local setting changes that.

## Safety

- **Mods are not sandboxed.** A mod runs with your permissions. It can read and write your files, run programs, make network requests, read secrets in your environment, see every prompt and tool call, submit prompts as you, approve tool calls, and spend your usage. Turning on Claude Code's sandbox does not contain a mod.
- **Read the code before you install a mod**, including these. Each template here is under about 100 lines on purpose. Run `claude plugin validate` and read the `calls:` line.
- **Install only from people and marketplaces you trust.** A marketplace can update a mod after you install it.
- **The guard is a seatbelt, not a lock.** It matches command text, so other spellings get through. Keep real protections (backups, branch protection, database permissions).
- **To turn mods off**, disable them in `/plugin`, or start with `claude --safe-mode`.

## Layout

```text
.claude-plugin/marketplace.json   lists the five mods so /plugin can install them
mods/<name>/
  .claude-plugin/plugin.json      the plugin's name, version, description, settings
  hooks/hooks.json                points at the code file
  hooks/register.ts(x)            the mod itself
  tests/*.test.ts                 tests for `claude plugin test`
PROMPTS.md                        prompts to paste into Claude Code
```

## Further reading

- Official docs: https://code.claude.com/docs/en/plugins/mods/overview
- Every event and method for your version: `mods/<name>/.claude-plugin/types/claude-code/index.d.ts`, written by Claude Code the first time it loads the mod with `--plugin-dir`.
