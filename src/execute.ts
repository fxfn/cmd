import { z } from "zod/v4";
import { CommandNotFoundError, NoCommandSpecifiedError } from "./errors";
import { HelpCommand } from "./commands/help";
import { ICommand } from "./interfaces/command";
import { parseArgs } from "./lib/parse-args";
import { parseOptions } from "./lib/parse-options";
import { parseAdvancedArgs, validateAdvancedArgs } from "./lib/parse-advanced-args";
import { resolveCommand } from "./lib/resolve-command";
import { conf } from ".";
import { ContainerLike } from "./interfaces/container";

export async function execute(input: string[], container: ContainerLike): Promise<number> {
  const programName = container.resolve(conf.ProgramName)!

  // 1. parse args
  const args = parseArgs(input)

  // 2. find command
  let command: ICommand
  try {
    command = resolveCommand(args, container)
  } catch (e) {
    if (e instanceof CommandNotFoundError) {
      if (args[args.length - 1].toLowerCase() !== 'help') {
        console.log(`error: unknown command "${args.join(' ')}" for "${programName}"\n`)
      }

      const helpCommand = new HelpCommand(container)
      // Populate the help command with all available commands
      const allCommands = container.resolveAll(ICommand)
      helpCommand.commands = allCommands
      return await helpCommand.handler(args) || 0
    } else if (e instanceof NoCommandSpecifiedError) {
      const helpCommand = new HelpCommand(container)
      // Populate the help command with all available commands
      const allCommands = container.resolveAll(ICommand)
      helpCommand.commands = allCommands
      return await helpCommand.handler(args) || 0
    }

    throw e
  }

  // 3. parse options using advanced parsing for better object transformation support
  let options
  if (command.opts) {
    // Use advanced parsing for complex schemas
    const parsedArgs = parseAdvancedArgs(input)
    options = validateAdvancedArgs(parsedArgs, command.opts)
  } else {
    // Fallback to basic parsing for simple cases
    options = parseOptions(input, z.any())
  }
  
  if (!options.success) {
    console.log(`Invalid options for command "${command.name}":`)
    console.log(options.error.issues.map(i => `  * --${i.path.join('.')}: ${i.message}`).join('\n'))
    console.log()
    return 1
  }

  // 4. execute command
  const exitCode = await command.handler(options.data)
  return exitCode || 0
}