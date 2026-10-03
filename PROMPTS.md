# Prompts for building mods

Paste one of these into a Claude Code session (v2.1.287 or later). Claude uses its built-in `plugin-authoring` skill to write the mod. Type `/plugin-authoring` first if you want to be sure the skill is loaded.

What happens next: you approve each file Claude writes, then answer **Enable for this session** when asked about hot reloading. The mod loads when Claude's turn ends. Tell Claude what to change and it reloads again. Copy the finished mod out of `~/.claude/dev-mods/` to keep it (see the README).

Each prompt follows the formula: **When** [trigger], **[watch / change / block]** [what], **show it in** [place], **using** [data]. Edit the brackets to fit your work. They go from easy to advanced.

## Easy

### 1. Git branch band

```text
Make a mod: whenever the prompt is idle, show the current git branch and
whether there are uncommitted changes in the band above the prompt. Use
$.process.run with git, refresh after each turn, and draw nothing outside
a git repository. It should work in the terminal and the Desktop app.
```

### 2. Slow turn alert

```text
Make a mod: when a turn takes longer than 2 minutes, show a toast that
says how long it took and how many tools Claude used. Use turn.start,
tool.call and turn.complete. Ignore subagent turns.
```

### 3. Plain-English turn recap

```text
Make a mod: when a turn completes, add one line under Claude's answer
that says in plain English, for a product manager, what changed in that
turn (for example "Updated the signup form and added 2 tests"). Use
$.model.complete with haiku on the turn's answer and the tools it used.
Skip turns that used no tools. Keep it under 20 words.
```

### 4. Cost meter

```text
Make a mod: show a cost meter in the band above the prompt with this
session's cost so far and how full the context window is, using
$.session.usage(). Update it after every turn. Turn the text yellow above
70% context and red above 90%. Add a /cost-reset command that remembers
the current cost as a baseline in $.store so I can track spend per task.
```

## Medium

### 5. Ticket rail

```text
Make a mod: when the session starts, read the ticket key from the git
branch name (like ABC-123 in feature/ABC-123-new-login), fetch that
ticket's title, status and assignee from our tracker's REST API with
$.http.fetch (the token is in the TRACKER_TOKEN environment variable),
and show them in the band above the prompt. Add a button that copies
the ticket link with $.ui.copy. If there is no key, show nothing.
```

### 6. Decision log

```text
Make a mod with a /decide command. "/decide we ship dark mode behind a
flag" appends a dated line to docs/decisions.md in this repo and shows a
toast. Also register a tool Claude can call to log a decision itself when
we agree on something, and a /decisions command that opens a pane listing
the last 20 decisions with a Close button.
```

### 7. Number checker

```text
Make a mod: when a turn completes, find every number, percentage and
dollar amount in Claude's answer and check whether it appeared in a file
Claude read or a tool result this session. Show a pane that lists each
number with "found in <source>" or "not found, check this". Only open
the pane when at least one number was not found.
```

### 8. PRD context helper

```text
Make a mod: when my prompt mentions "PRD" or "spec", add the contents of
docs/prd-template.md as extra context that only Claude reads (not shown
in my message). Show a toast saying the template was attached. Do
nothing if the file does not exist.
```

## Advanced

### 9. Stakeholder update

```text
Make a mod with a /update command. It reads this session's conversation,
uses $.model.complete to write a short status update for stakeholders
(what shipped, what is in progress, risks, asks), shows it in a pane with
Copy and Regenerate buttons, and copies it to the clipboard on Copy.
No code or file paths in the update.
```

### 10. Release guard

```text
Make a mod: before Claude runs git push to main or master, check with
git diff whether CHANGELOG.md changed since the last tag. If it did not,
ask me with $.ui.ask whether to push anyway, with options Push and Stop.
Refuse the push if I pick Stop or dismiss the question, and add a .catch
so the guard fails closed. Write tests for it with claude-code/testing.
```

### 11. Metrics dashboard with a sparkline

```text
Make a mod with a /metrics command that opens a pane and polls
<your JSON endpoint> every 5 minutes with $.clock.every and
$.http.fetch. Show the current value of signups, activation rate and
churn, and in the terminal draw a 24-point sparkline of each from the
history kept in $.store using a Raster. In the Desktop app, draw the
numbers as text instead. Stop polling when the pane closes. Make the URL
a userConfig setting.
```

### 12. Focus mode

```text
Make a mod with a /focus command that takes a goal, like
"/focus fix the checkout bug". Show the goal and a running timer in the
band above the prompt. Before each turn, add the goal as context Claude
reads. When Claude edits a file that seems unrelated to the goal (ask
haiku with $.model.complete), show a toast asking whether it is on track.
/focus with no goal turns it off. Keep the goal in $.state so it
survives a reload.
```

## Tips for your own prompts

- Name the place it should draw (band, pane, toast, status line) and say "terminal and Desktop app" if you use both.
- Say what should happen when there is nothing to show, or when something fails.
- Ask for tests: "write tests with claude-code/testing and run claude plugin test".
- Ask Claude to run `claude plugin validate` on the result and explain the `calls:` line, so you know what the mod can reach.
