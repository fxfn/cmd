import { parseArgs } from "../../src/lib/parse-args"
import { describe, it, expect } from "vitest"

describe('parseArgs', () => {
  it('should parse basic arguments', () => {
    const input = ['list']
    const args = parseArgs(input)
    expect(args).toEqual(['list'])
  })

  it('should parse arguments with options', () => {
    const input = ['list', '--tenant=2']
    const args = parseArgs(input)
    expect(args).toEqual(['list'])
  })

  it('should ignore arguments after an option', () => {
    const input = ['list', '--tenant=2', 'help']
    const args = parseArgs(input)
    expect(args).toEqual(['list'])
  })
})