// Run with: claude plugin test mods/panel-with-buttons
import { expect, test } from 'claude-code/testing'

// What Claude Code passes to a Pane hook, apart from the surface.
const PANE = {
  plugin: 'panel-with-buttons',
  component: 'Pane',
  requestId: 'edits',
  viewport: { columns: 100, rows: 30 },
  props: {
    title: 'Edited files',
    isFocused: true,
    bodyColumns: 60,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('lists edited files, and Clear empties the list', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))

  await $.tool.call({ tool: 'Edit', file_path: '/work/README.md', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Edit', file_path: '/work/README.md', old_string: 'b', new_string: 'c' })
  await $.tool.call({ tool: 'Write', file_path: '/work/notes.md', content: 'hi' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: '/work/README.md' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '2 edits' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '/work/notes.md' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'clear' })
  expect(await ui.find({ type: 'Text', text: 'No edits yet.' })).toBeDefined()
})

test('a failed edit is not listed', async ($, on) => {
  on('tool.call', () => ({ result: 'String not found', isError: true }))
  await $.tool.call({ tool: 'Edit', file_path: '/work/a.md', old_string: 'x', new_string: 'y' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'No edits yet.' })).toBeDefined()
})

test('Close closes the pane', async ($, on) => {
  const closed: string[] = []
  on('ui.close', ($, e) => {
    closed.push(e.id)
    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'close' })
  expect(closed).toEqual(['edits'])
})
