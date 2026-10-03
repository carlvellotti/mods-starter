// Run with: claude plugin test mods/slash-command
import type { SessionMessage } from 'claude-code'
import { expect, test } from 'claude-code/testing'

// How /plain-recap arrives when you type it. Claude Code fills these in a real session.
const RECAP = {
  command: 'plain-recap',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

const usage = { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('/plain-recap prints the model summary of the conversation', async ($, on) => {
  let sentPrompt = ''
  const history: SessionMessage[] = [
    { role: 'user', text: 'Fix the signup button', toolUses: [] },
    { role: 'assistant', text: 'Fixed it.', toolUses: [{ tool: 'Edit', tool_use_id: 'toolu_1', input: {} }] },
  ]
  on('session.messages', () => ({ value: history }))
  on('ui.toast', () => ({ value: undefined }))
  on('model.complete', ($, e) => {
    sentPrompt = e.prompt
    return { value: { isAnswered: true, text: '- The signup button works again.\n', usage } }
  })

  const answer = await $.command.run(RECAP)
  expect(answer.text).toBe('- The signup button works again.')
  expect(sentPrompt).toContain('User: Fix the signup button')
  expect(sentPrompt).toContain('[used: Edit]')
})

test('/plain-recap says so when the model does not answer', async ($, on) => {
  const history: SessionMessage[] = [{ role: 'user', text: 'hi', toolUses: [] }]
  on('session.messages', () => ({ value: history }))
  on('ui.toast', () => ({ value: undefined }))
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'empty-reply', usage } }))

  const answer = await $.command.run(RECAP)
  expect(answer.text).toContain('Could not write a recap')
})

test('/plain-recap on an empty session does not call the model', async ($, on) => {
  const history: SessionMessage[] = []
  on('session.messages', () => ({ value: history }))

  const answer = await $.command.run(RECAP)
  expect(answer.text).toBe('Nothing to recap yet.')
})
