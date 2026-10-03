// Run with: claude plugin test mods/status-band
import { expect, mock, test } from 'claude-code/testing'

// What Claude Code passes to an AbovePrompt hook, apart from the surface.
const BAND = {
  plugin: 'status-band',
  component: 'AbovePrompt',
  viewport: { columns: 100, rows: 30 },
  props: {
    hasSurvey: false,
    isWorking: true,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('shows what Claude is doing and the elapsed time', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: 'ok' }))

  await $.turn.start({ turnId: 't1', text: 'read the notes' })
  await clock.advance(65_000)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'Working' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1m 05s' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Reading your request' })).toBeDefined()
    await ui.unmount()
  }

  // After a tool call, the band says Claude is thinking about the result.
  await $.tool.call({ tool: 'Read', file_path: '/work/notes.md' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'Thinking about what it found' })).toBeDefined()
})

test('says "Waiting on you" when a permission prompt is about to show', async ($, on) => {
  mock.clock(on)
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('classic.PermissionRequest', () => ({}))

  await $.turn.start({ turnId: 't1', text: 'clean up' })
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: 'Waiting on you' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Needs your OK: Running a command: rm -rf build/ })).toBeDefined()
})

test('says "Waiting on you" with the turn length when Claude finishes', async ($, on) => {
  mock.clock(on)
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.start({ turnId: 't1', text: 'hi' })
  await $.turn.complete({ turnId: 't1', answer: 'Hello', durationMs: 12_000, isAborted: false, reason: 'answer' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'Waiting on you' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '12s' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Done' })).toBeDefined()
})

test('draws nothing of its own before the first turn', async ($, on) => {
  // Stands for what Claude Code would draw when the mod passes with next(e)
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['drawn by Claude Code'] }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'drawn by Claude Code' })).toBeDefined()
})
