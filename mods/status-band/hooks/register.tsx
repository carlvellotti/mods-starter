// status-band: one line above the prompt that says what Claude is doing.
//
// Pattern: WATCH events (turn.start, tool.call, turn.complete) and SHOW the
// result in the band above the prompt (the AbovePrompt render site).
// Works in the terminal and in the Desktop app's Code tab.

import type { Register } from 'claude-code'

// What the band shows. These reset when the mod reloads, which is fine here.
let mode: 'idle' | 'working' | 'waiting' | 'done' = 'idle'
let activity = ''
let startedAt = 0 // when the current turn started, in milliseconds
let lastTurnMs = 0 // how long the last turn took

// Turn a tool call into a short plain-English phrase.
function describe(tool: string, input: Record<string, unknown>): string {
  const file = String(input.file_path ?? input.notebook_path ?? '').split('/').pop()
  if (tool === 'Read') return 'Reading ' + file
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return 'Editing ' + file
  if (tool === 'Bash') return 'Running a command: ' + String(input.command ?? '').slice(0, 40)
  if (tool === 'Grep' || tool === 'Glob') return 'Searching the code'
  if (tool === 'WebFetch' || tool === 'WebSearch') return 'Looking something up online'
  if (tool === 'Task' || tool === 'Agent') return 'Handing work to a helper agent'
  if (tool === 'TodoWrite') return 'Updating its to-do list'
  if (tool === 'AskUserQuestion') return 'Asking you a question'
  if (tool.startsWith('mcp__')) return 'Using ' + tool.split('__')[1]
  return 'Using ' + tool
}

// 65000 ms -> "1m 05s"
function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

export const register: Register = on => {
  // Once per session: redraw every second while Claude works, so the time ticks.
  on('session.start', async ($, e, next) => {
    $.clock.every(1000, () => {
      if (mode === 'working' || mode === 'waiting') $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  // A turn begins: start the stopwatch.
  on('turn.start', async ($, e, next) => {
    startedAt = await $.clock.now()
    mode = 'working'
    activity = 'Reading your request'
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // Claude is about to use a tool. Say which, let it run, then carry on.
  on('tool.call', async ($, e, next) => {
    activity = describe(e.tool, e as Record<string, unknown>)
    mode = e.tool === 'AskUserQuestion' ? 'waiting' : 'working'
    $.ui.invalidate('ui.render')
    const result = await next(e) // the tool runs here (and any permission prompt)
    mode = 'working'
    activity = 'Thinking about what it found'
    $.ui.invalidate('ui.render')
    return result
  })

  // Claude Code is about to show a permission prompt: Claude is waiting on you.
  // (In the terminal the prompt covers the band while it's open.)
  on('classic.PermissionRequest', async ($, e, next) => {
    mode = 'waiting'
    activity = 'Needs your OK: ' + describe(e.tool_name, (e.tool_input ?? {}) as Record<string, unknown>)
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // The turn ended. Subagent turns (agentId set) are ignored.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      mode = 'done'
      lastTurnMs = e.durationMs
      activity = e.isAborted ? 'Stopped' : 'Done'
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  // Draw the band. Returning next(e) means "draw nothing of mine".
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || mode === 'idle') return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const elapsed = mode === 'done' ? lastTurnMs : (await $.clock.now()) - startedAt
    // "waiting" is a permission prompt or a question; "done" means it's your turn to type.
    const label = mode === 'working' ? 'Working' : 'Waiting on you'
    const color = mode === 'waiting' ? 'yellow' : mode === 'done' ? 'green' : 'cyan'

    return (
      <Box flexDirection="row" columnGap={1}>
        <Text bold color={color}>{label}</Text>
        <Text dimColor>{clock(elapsed)}</Text>
        <Text wrap="truncate">{activity}</Text>
      </Box>
    )
  })
}
