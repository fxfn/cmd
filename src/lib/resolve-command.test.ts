import { container } from "@fxfn/inject";
import { ICommand } from "..";
import { resolveCommand } from "./resolve-command";
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod/v4";
import { CommandNotFoundError, NoCommandSpecifiedError } from "../errors";
import { parseOptions } from "./parse-options";

class ChildCommand extends ICommand {
  name = 'child'
  description = 'Child command'
  args = z.null()
  handler = async () => {
    return 0
  }
}

class RootCommand extends ICommand {
  name = 'root'
  description = 'Root command'
  args = z.null()
  children = [
    ChildCommand
  ]
  handler = async () => {
    return 0
  }
}

describe('resolveCommand', () => {
  beforeEach(() => {
    container.reset()
  })
  
  it('should resolve a single command', () => {
    container.register(ICommand, { useClass: RootCommand })
    container.register(ICommand, { useClass: ChildCommand })

    const args = ['root']
    const command = resolveCommand(args)
    expect(command.name).toBe('root')
  })

  it('should resolve a nested command', () => {
    container.register(ICommand, { useClass: RootCommand })
    container.register(ICommand, { useClass: ChildCommand })

    const args = ['root', 'child']
    const command = resolveCommand(args)
    expect(command.name).toBe('child')
  })

  it('should throw an error if the command is not found', () => {
    container.register(ICommand, { useClass: RootCommand })
    container.register(ICommand, { useClass: ChildCommand })

    const args = ['root', 'not-found']
    expect(() => resolveCommand(args)).toThrow(CommandNotFoundError)
  })

  it('should throw an error if no command is specified', () => {
    expect(() => resolveCommand([])).toThrow(NoCommandSpecifiedError)
  })

  it('should resolve a command with the correct options', () => {
    class EmailCommand extends ICommand {
      name = 'email'
      description = 'Send an email'
      opts = z.object({
        to: z.string().or(z.array(z.string())),
        subject: z.string(),
        body: z.string(),
      })
      handler = async () => {
        return 0
      }
    }

    container.register(ICommand, { useClass: EmailCommand })

    const args = ['email']
    const command = resolveCommand(args)

    const opts = parseOptions(['--to=test@test.com', '--to=test2@test.com', '--subject=Test', '--body=Test'], command.opts || z.any())
    expect(opts.data).toEqual({
      to: ['test@test.com', 'test2@test.com'],
      subject: 'Test',
      body: 'Test'
    })
  })
})