import { CommandNotFoundError, NoCommandSpecifiedError } from "../errors";
import { ICommand } from "../interfaces/command";
import { container } from "@fxfn/inject";

export function resolveCommand(args: string[]): ICommand {
  if (args.length === 0) {
    throw new NoCommandSpecifiedError();
  }

  // Get all commands from the container
  const commands = container.resolveAll(ICommand);

  // Find the root command
  const rootCommand = commands.find(c => c.name === args[0]);
  if (!rootCommand) {
    throw new CommandNotFoundError();
  }

  // If only one arg, return the root command
  if (args.length === 1) {
    return rootCommand;
  }

  // Recursively traverse the command hierarchy
  return findNestedCommand(rootCommand, args.slice(1));
}

function findNestedCommand(currentCommand: ICommand, remainingArgs: string[]): ICommand {
  if (remainingArgs.length === 0) {
    return currentCommand;
  }

  const nextArg = remainingArgs[0];
  
  // Find the child command that matches the next argument
  const childCommandConstructor = currentCommand.children.find(child => {
    const childInstance = new child();
    return childInstance.name === nextArg;
  });

  if (!childCommandConstructor) {
    throw new CommandNotFoundError();
  }

  const childCommand = new childCommandConstructor();
  
  // Recursively continue with remaining args
  return findNestedCommand(childCommand, remainingArgs.slice(1));
}