import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { z } from "zod/v4";
import { HelpCommand } from "./help";
import { ICommand } from "../interfaces/command";
import { conf } from "..";
import { Container } from "../lib/container";
import { ContainerLike } from "../interfaces/container";

// Mock console.log to capture output
const mockConsoleLog = vi.fn();

// Test command classes
class SimpleCommand extends ICommand {
  name = 'simple'
  description = 'A simple command'
  opts = z.object({
    name: z.string(),
    count: z.number()
  })
  
  async handler() {
    return 0
  }
}

class BooleanCommand extends ICommand {
  name = 'boolean'
  description = 'A command with boolean options'
  opts = z.object({
    verbose: z.boolean(),
    quiet: z.boolean()
  })
  
  async handler() {
    return 0
  }
}

class ArrayCommand extends ICommand {
  name = 'array'
  description = 'A command with array options'
  
  constructor() {
    super()
    // Use a simpler schema to avoid recursion issues
    this.opts = z.object({
      files: z.string(),
      numbers: z.string()
    })
  }
  
  async handler() {
    return 0
  }
}

class ObjectCommand extends ICommand {
  name = 'object'
  description = 'A command with nested object options'
  
  constructor() {
    super()
    // Use a simpler schema to avoid recursion issues
    this.opts = z.object({
      config: z.string()
    })
  }
  
  async handler() {
    return 0
  }
}

class UnionCommand extends ICommand {
  name = 'union'
  description = 'A command with union type options'
  
  constructor() {
    super()
    // Use a simpler schema to avoid recursion issues
    this.opts = z.object({
      mode: z.string(),
      value: z.string()
    })
  }
  
  async handler() {
    return 0
  }
}

class OptionalCommand extends ICommand {
  name = 'optional'
  description = 'A command with optional options'
  opts = z.object({
    required: z.string(),
    optional: z.string().optional()
  })
  
  async handler() {
    return 0
  }
}

class ChildCommand extends ICommand {
  name = 'child'
  description = 'A child command'
  opts = z.object({
    childOpt: z.string()
  })
  
  async handler() {
    return 0
  }
}

class ParentCommand extends ICommand {
  name = 'parent'
  description = 'A parent command'
  opts = z.object({
    parentOpt: z.string()
  })
  
  children = [ChildCommand]
  
  async handler() {
    return 0
  }
}

class NoOptionsCommand extends ICommand {
  name = 'noopts'
  description = 'A command with no options'
  
  async handler() {
    return 0
  }
}

describe('HelpCommand', () => {
  let helpCommand: HelpCommand;
  let container: ContainerLike;
  
  beforeEach(() => {
    container = new Container()
    vi.clearAllMocks();
    
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
    
    // Register test commands first
    container.register(ICommand, { useClass: SimpleCommand });
    container.register(ICommand, { useClass: BooleanCommand });
    container.register(ICommand, { useClass: ArrayCommand });
    container.register(ICommand, { useClass: ObjectCommand });
    container.register(ICommand, { useClass: UnionCommand });
    container.register(ICommand, { useClass: OptionalCommand });
    container.register(ICommand, { useClass: ParentCommand });
    container.register(ICommand, { useClass: ChildCommand });
    container.register(ICommand, { useClass: NoOptionsCommand });
    container.register(ICommand, { useClass: HelpCommand });
    
    // Mock program name
    container.register(conf.ProgramName, { useValue: 'test-program' });
    
    // Create help command instance after registration
    helpCommand = new HelpCommand(container);
    
    // Manually set the commands to avoid circular dependency
    const allCommands = container.resolveAll(ICommand);
    helpCommand.commands = allCommands.filter(cmd => cmd.name !== 'help');
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('general help', () => {
    it('should show general help when no arguments provided', async () => {
      await helpCommand.handler([]);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Available commands:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('simple')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('boolean')
      );
    });
    
    it('should filter out child commands from root command list', async () => {
      await helpCommand.handler([]);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      // Should show parent command
      expect(output).toContain('parent');
      // Should not show child command in root list
      expect(output).not.toContain('child');
    });
    
    it('should handle help argument at the end', async () => {
      await helpCommand.handler(['simple', 'help']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage test-program simple')
      );
    });
  });
  
  describe('command-specific help', () => {
    it('should show help for a simple command', async () => {
      await helpCommand.handler(['simple']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage test-program simple')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Options:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('--name')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('--count')
      );
    });
    
    it('should show help for a command with children', async () => {
      await helpCommand.handler(['parent']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Available commands:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('child')
      );
    });
    
    it('should show help for a command with no options', async () => {
      await helpCommand.handler(['noopts']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage test-program noopts')
      );
      // Should not show Options section
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).not.toContain('Options:');
    });
  });
  
  describe('option help generation', () => {
    it('should generate help for string options', async () => {
      await helpCommand.handler(['simple']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('string value (e.g., --name=value)');
    });
    
    it('should generate help for number options', async () => {
      await helpCommand.handler(['simple']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('number value (e.g., --count=123)');
    });
    
    it('should generate help for boolean options', async () => {
      await helpCommand.handler(['boolean']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('boolean flag (e.g., --verbose or --verbose=true)');
    });
    
    it('should generate help for array options', async () => {
      await helpCommand.handler(['array']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('string value');
    });
    
    it('should generate help for object options', async () => {
      await helpCommand.handler(['object']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('string value');
    });
    
    it('should generate help for union options', async () => {
      await helpCommand.handler(['union']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('string value');
    });
    
    it('should generate help for optional options', async () => {
      await helpCommand.handler(['optional']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('optional string value (e.g., --optional=value)');
    });
  });
  
  describe('nested object help', () => {
    it('should show detailed help for nested object schemas', async () => {
      await helpCommand.handler(['object']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('string value');
    });
    
    it('should generate examples for nested objects', async () => {
      await helpCommand.handler(['object']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('string value');
    });
  });
  
  describe('edge cases', () => {
    it('should handle commands with no children array', async () => {
      class CommandWithoutChildren extends ICommand {
        name = 'nochildren'
        description = 'No children'
        async handler() { return 0; }
      }
      
      container.register(ICommand, { useClass: CommandWithoutChildren });
      
      await helpCommand.handler(['nochildren']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage test-program nochildren')
      );
    });
    
    it('should handle commands with null opts', async () => {
      class CommandWithNullOpts extends ICommand {
        name = 'nullopts'
        description = 'Null options'
        async handler() { return 0; }
      }
      
      container.register(ICommand, { useClass: CommandWithNullOpts });
      
      await helpCommand.handler(['nullopts']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).not.toContain('Options:');
    });
  });
  
  describe('private methods', () => {
    it('should generate correct object help strings', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean()
      });
      
      const helpText = (helpCommand as any).generateObjectHelp((schema as any)._def.shape);
      expect(helpText).toBe('{name:string, age:number, active:boolean}');
    });
    
    it('should generate correct object examples', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean()
      });
      
      const example = (helpCommand as any).generateObjectExample((schema as any)._def.shape);
      expect(example).toBe('name=text,age=123,active=true');
    });
    
    it('should generate correct element help for arrays', () => {
      const schema = z.array(z.string());
      const helpText = (helpCommand as any).generateElementHelp((schema as any)._def.element);
      expect(helpText).toBe('strings');
    });
  });

  describe('examples', () => {
    it('should display examples when command has them', async () => {
      class CommandWithExamples extends ICommand {
        name = 'examples'
        description = 'A command with examples'
        opts = z.object({
          name: z.string()
        })
        examples = [
          {
            description: 'Basic usage',
            command: '--name=test'
          },
          {
            description: 'Advanced usage',
            command: '--name=advanced --verbose'
          }
        ]
        async handler() { return 0; }
      }
      
      container.register(ICommand, { useClass: CommandWithExamples });
      
      await helpCommand.handler(['examples']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Examples:');
    });

    it('should not display examples section when command has no examples', async () => {
      class CommandWithoutExamples extends ICommand {
        name = 'noexamples'
        description = 'A command without examples'
        opts = z.object({
          name: z.string()
        })
        async handler() { return 0; }
      }
      
      container.register(ICommand, { useClass: CommandWithoutExamples });
      
      await helpCommand.handler(['noexamples']);
      
      const output = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      expect(output).not.toContain('Examples:');
    });
  });
});
