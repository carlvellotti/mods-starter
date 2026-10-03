// Run with: claude plugin test mods/guard
import { expect, test } from 'claude-code/testing'

// Stands in for Claude Code: answers $.ui.ask (which arrives as an
// AskUserQuestion tool call) with `pick`, and "runs" every other tool.
function engine(pick: string, asked: string[]) {
  return ($: unknown, e: { tool: string; questions?: { question: string }[] }) => {
    if (e.tool === 'AskUserQuestion') {
      const question = e.questions?.[0]?.question ?? ''
      asked.push(question)
      return { result: { answers: { [question]: pick } } }
    }
    return { result: 'ran' }
  }
}

test('a safe command runs without a question', async ($, on) => {
  const asked: string[] = []
  on('tool.call', engine('Proceed', asked))

  const out = await $.tool.call({ tool: 'Bash', command: 'ls -la' })
  expect(out.result).toBe('ran')
  expect(asked).toEqual([])
})

test('rm -rf asks first, and Proceed lets it run', async ($, on) => {
  const asked: string[] = []
  on('tool.call', engine('Proceed', asked))

  const out = await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
  expect(asked.length).toBe(1)
  expect(asked[0]).toContain('rm -rf build')
  expect(out.result).toBe('ran')
})

test('Cancel refuses the command', async ($, on) => {
  const asked: string[] = []
  on('tool.call', engine('Cancel', asked))

  const out = await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })
  expect(asked.length).toBe(1)
  expect(out.result).toBeUndefined()
  expect(out.deny).toContain('cancelled')
})

test('DROP TABLE is caught in any letter case', async ($, on) => {
  const asked: string[] = []
  on('tool.call', engine('Cancel', asked))

  const out = await $.tool.call({ tool: 'Bash', command: 'psql -c "drop table users"' })
  expect(asked.length).toBe(1)
  expect(out.deny).toBeDefined()
})

test('a dismissed question refuses the command (fails closed)', async ($, on) => {
  // Refuse the AskUserQuestion call, which makes $.ui.ask reject, as a dismissal does
  on('tool.call', ($, e) => (e.tool === 'AskUserQuestion' ? { deny: 'dismissed' } : { result: 'ran' }))

  const out = await $.tool.call({ tool: 'Bash', command: 'rm -r old-data' })
  expect(out.result).toBeUndefined()
  expect(out.deny).toBeDefined()
})
