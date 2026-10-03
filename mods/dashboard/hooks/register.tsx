// dashboard: a /dashboard pane that fetches a JSON URL every minute and
// shows a few numbers from it.
//
// Pattern: FETCH outside data on a timer ($.clock.every + $.http.fetch) and
// SHOW it in a pane. The URL and fields come from settings (userConfig in
// plugin.json), which you can change in /config.
// Works in the terminal and in the Desktop app's Code tab.

import type { EngineInterface, Register, Timer } from 'claude-code'

const PANE = 'dashboard'
const EVERY_MS = 60_000 // once a minute. GitHub allows 60 unsigned requests an hour.

// What the pane shows. These reset when the mod reloads.
let rows: { label: string; value: string }[] = []
let note = 'Loading...'
let timer: Timer | undefined

// Stop the once-a-minute timer, if one is running.
function stopPolling() {
  timer?.cancel()
  timer = undefined
}

// Fetch the URL once and pick out the fields. Declared at the top level so it
// can take $ (the validator allows that for top-level functions).
async function refresh($: EngineInterface, url: string, fields: string[]) {
  try {
    const res = await $.http.fetch(url, { headers: { accept: 'application/json', 'user-agent': 'mods-starter' } })
    if (!res.ok) throw new Error('the server answered ' + res.status)
    const data = JSON.parse(res.text)
    rows = fields.map(field => {
      // "owner.id" reads data.owner.id
      const value = field.split('.').reduce((obj: any, key) => obj?.[key], data)
      const label = field.replace(/[._]/g, ' ')
      return { label, value: typeof value === 'number' ? value.toLocaleString('en-US') : String(value ?? '-') }
    })
    note = 'Updated ' + new Date(await $.clock.now()).toTimeString().slice(0, 5)
  } catch (error) {
    note = 'Could not load: ' + (error instanceof Error ? error.message : String(error))
  }
  $.ui.invalidate('ui.render')
}

export const register: Register = (on, options) => {
  // Settings from plugin.json's userConfig, with the defaults filled in.
  const url = String(options.url)
  const fields = String(options.fields).split(',').map(f => f.trim()).filter(Boolean)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'dashboard', description: 'Open the dashboard pane', immediate: true })
    return next(e)
  })

  // /dashboard opens the pane and starts polling (once; a second /dashboard just reopens it).
  on('command.run', { command: 'dashboard' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Dashboard', focus: true, closeOnEscape: true })
    if (timer === undefined) {
      timer = $.clock.every(EVERY_MS, () => refresh($, url, fields))
      await refresh($, url, fields)
    }
    return {}
  })

  // You closed the pane with Esc or its close mark: stop polling.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    stopPolling()
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-middle">{url}</Text>
        {rows.map(row => (
          <Box flexDirection="row" columnGap={1}>
            <Text bold>{row.value}</Text>
            <Text>{row.label}</Text>
          </Box>
        ))}
        <Text dimColor>{note}</Text>
        <Box flexDirection="row" columnGap={2}>
          <Button key="refresh" label="Refresh" hotkey="r" plain onPress={() => refresh($, url, fields)} />
          <Button
            key="close"
            label="Close"
            hotkey="x"
            plain
            role="dismiss"
            onPress={() => {
              stopPolling() // our own $.ui.close skips our own ui.close hook, so stop here too
              return $.ui.close({ id: PANE })
            }}
          />
        </Box>
      </Box>
    )
  })
}
