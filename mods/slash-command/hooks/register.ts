// slash-command: a /plain-recap command that summarizes the session so far in
// plain English, for someone who doesn't write code.
//
// Pattern: ANSWER a command. The command.run hook reads the conversation,
// asks a small model for a summary, and returns the text to print.
// Works everywhere, including claude -p: try `claude -p "/plain-recap"`.

import type { Register } from 'claude-code'

// The instructions for the summarizing model. Edit these to change the tone.
const SYSTEM = [
  'You summarize a coding session for a product manager who does not write code.',
  'Write 3 to 6 short bullet points in plain English. No jargon, no code, no file paths',
  'unless they matter. Cover: what was asked, what Claude did, what is done, what is',
  'still open or risky, and anything the reader needs to decide.',
].join(' ')

export const register: Register = on => {
  // Add /plain-recap to the command list (a name no built-in command uses: /recap is taken) when the session starts.
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'plain-recap', description: 'Summarize this session in plain English' })
    return next(e)
  })

  // You typed /plain-recap. Anything after it (e.args) is passed on as a focus.
  on('command.run', { command: 'plain-recap' }, async ($, e) => {
    const messages = await $.session.messages()
    if (messages.length === 0) return { text: 'Nothing to recap yet.' }

    // Turn the conversation into plain text: who said what, and which tools ran.
    const lines = messages.slice(-60).map(m => {
      const who = m.role === 'user' ? 'User' : 'Claude'
      const tools = m.toolUses.length > 0 ? ` [used: ${m.toolUses.map(t => t.tool).join(', ')}]` : ''
      return `${who}: ${m.text.slice(0, 1500)}${tools}`
    })
    const transcript = lines.join('\n\n').slice(-40_000) // keep the most recent part

    $.ui.toast('Writing your recap...')
    const reply = await $.model.complete({
      model: 'haiku', // a small, fast model; this uses your plan or API key
      system: SYSTEM,
      prompt: `${e.args ? `Focus on: ${e.args}\n\n` : ''}The session so far:\n\n${transcript}`,
      maxTokens: 600,
      timeoutMs: 30_000,
    })

    // A model call never throws for an API problem, so check isAnswered.
    if (!reply.isAnswered) return { text: `Could not write a recap (${reply.reason}). Try again in a moment.` }
    return { text: reply.text.trim() }
  })
}
