// panel-with-buttons: a /edits command that opens a pane listing the files
// Claude changed this session, with Clear and Close buttons.
//
// Pattern: WATCH tool calls, SHOW a list in a pane, and REACT to button presses.
// Works in the terminal and in the Desktop app's Code tab.

import type { Register } from 'claude-code'

// The pane's id. You open the pane with it and check for it when drawing.
const PANE = 'edits'

// File path -> how many times Claude changed it. Resets when the mod reloads.
const edits = new Map<string, number>()

export const register: Register = on => {
  // Add the /edits command when the session starts.
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'edits',
      description: 'Show the files Claude changed this session',
      immediate: true, // lets you open the pane while Claude is still working
    })
    return next(e)
  })

  // You typed /edits: open the pane, give it the keyboard, let Esc close it.
  on('command.run', { command: 'edits' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Edited files', focus: true, closeOnEscape: true })
    return {} // print nothing in the transcript
  })

  // Watch the file-changing tools. Record the file only if the change worked.
  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit'] }, async ($, e, next) => {
    const result = await next(e) // let the tool run first
    if (!result.deny && !result.isError) {
      const path = 'file_path' in e ? e.file_path : e.notebook_path
      edits.set(path, (edits.get(path) ?? 0) + 1)
      $.ui.invalidate('ui.render') // redraw the pane with the new list
    }
    return result
  })

  // Draw the pane: a title line, one row per file, then two buttons.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const files = [...edits.entries()]

    return (
      <Box flexDirection="column">
        <Text bold>Files Claude changed: {String(files.length)}</Text>
        {files.length === 0 && <Text dimColor>No edits yet.</Text>}
        {files.map(([path, count]) => (
          <Box flexDirection="row" columnGap={1}>
            <Text dimColor>{count === 1 ? '1 edit ' : `${count} edits`}</Text>
            {/* truncate-start keeps the end of a long path, which is the useful part */}
            <Text wrap="truncate-start">{path}</Text>
          </Box>
        ))}
        <Text> </Text>
        <Box flexDirection="row" columnGap={2}>
          <Button
            key="clear"
            label="Clear"
            hotkey="c"
            plain
            onPress={() => {
              edits.clear()
              $.ui.invalidate('ui.render')
            }}
          />
          <Button
            key="close"
            label="Close"
            hotkey="x"
            plain
            role="dismiss"
            onPress={() => $.ui.close({ id: PANE })}
          />
        </Box>
      </Box>
    )
  })
}
