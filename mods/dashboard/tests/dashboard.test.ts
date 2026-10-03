// Run with: claude plugin test mods/dashboard
import { expect, mock, test } from 'claude-code/testing'

const OPEN = {
  command: 'dashboard',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

const PANE = {
  plugin: 'dashboard',
  component: 'Pane',
  requestId: 'dashboard',
  viewport: { columns: 120, rows: 30 },
  props: {
    title: 'Dashboard',
    isFocused: true,
    bodyColumns: 60,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('fetches on open, shows the numbers, and polls every minute', async ($, on) => {
  const clock = mock.clock(on)
  const fetched: string[] = []
  let stars = 1000
  on('http.fetch', ($, e) => {
    fetched.push(e.url)
    stars += 1
    const body = JSON.stringify({ stargazers_count: stars, forks_count: 42, open_issues_count: 7, subscribers_count: 3 })
    return { value: { status: 200, ok: true, headers: {}, text: body } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.command.run(OPEN)
  expect(fetched).toEqual(['https://api.github.com/repos/anthropics/claude-code'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: '1,001' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'stargazers count' })).toBeDefined()
    await ui.unmount()
  }

  await clock.advance(60_000)
  expect(fetched.length).toBe(2)
})

test(
  'reads the URL and fields from userConfig, and reports errors',
  { options: { url: 'https://example.com/stats.json', fields: 'a.b' } },
  async ($, on) => {
    mock.clock(on)
    on('http.fetch', () => ({ value: { status: 503, ok: false, headers: {}, text: '' } }))
    on('ui.open', () => ({ value: { isPlaced: true } }))

    await $.command.run(OPEN)
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: 'https://example.com/stats.json' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Could not load: the server answered 503' })).toBeDefined()
  },
)

test('Close stops the polling', async ($, on) => {
  const clock = mock.clock(on)
  let fetches = 0
  on('http.fetch', () => {
    fetches += 1
    return { value: { status: 200, ok: true, headers: {}, text: '{"stargazers_count":1}' } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))

  await $.command.run(OPEN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'close' })
  await clock.advance(180_000)
  expect(fetches).toBe(1)
})
