// guard: pauses risky shell commands and asks you Proceed or Cancel first.
//
// Pattern: BLOCK. A tool.call hook holds the command, asks you with
// $.ui.ask, and either lets it through (next) or refuses it ({ deny }).
// Works in the terminal and in the Desktop app's Code tab.
//
// This is a seatbelt, not a lock. It matches the text of a command, so a
// different spelling can slip past. Keep real protections (backups, branch
// protection, database permissions) in place too.

import type { Register } from 'claude-code'

// Each risky pattern, with a plain-English reason shown in the question.
// To add your own, copy a line and change the pattern and the reason.
const RISKY = [
  { pattern: /\brm\s+(-\w*[rR]|--recursive)/, why: 'deletes files and folders for good' },
  { pattern: /\bgit\s+push\b.*(--force|\s-f\b)/, why: 'overwrites history on the remote' },
  { pattern: /\bdrop\s+(table|database)\b/i, why: 'deletes a database table' },
]

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const hit = RISKY.find(risk => risk.pattern.test(e.command))
    if (!hit) return next(e) // not risky: run it as usual

    // Start from the safe answer, so a question nobody answers refuses the command.
    let answer = 'Cancel'
    try {
      // The command waits here until you pick. This wait doesn't count
      // against the hook's 10-second time limit.
      answer = await $.ui.ask(`This command ${hit.why}:\n\n  ${e.command}\n\nRun it?`, ['Proceed', 'Cancel'])
    } catch {
      // You dismissed the question, or nobody is there to ask (claude -p).
    }

    if (answer !== 'Proceed') {
      // Not calling next() means the command never runs. Claude reads this text.
      return { deny: 'The user cancelled this command. Ask them before trying another way.' }
    }
    return next(e) // you said Proceed: the normal permission check still runs
  })
    // Fail closed: if the hook above crashes or times out, refuse the command
    // instead of letting it run. Without this, Claude Code would skip the hook.
    .catch(async ($, e, next) => ({
      deny: `The guard mod failed (${next.error.kind}), so this command was not run.`,
    }))
}
