# @fxfn/cmd - Command Line Framework

A powerful and flexible command-line framework for building CLI applications with TypeScript. This package provides a robust foundation for creating command-line tools with support for subcommands, options validation, help generation, and examples.

## Table of Contents

- [Features](#features)
  - [Command Framework](#-command-framework)
  - [Argument Parsing](#-argument-parsing)
  - [Help System](#-help-system)
- [Quick Start](#quick-start)
  - [Basic Command](#basic-command)
  - [Command with Examples](#command-with-examples)
  - [Parent-Child Commands](#parent-child-commands)
- [Core Concepts](#core-concepts)
  - [ICommand Interface](#icommand-interface)
  - [CommandExample Interface](#commandexample-interface)
  - [Options Schema](#options-schema)
- [Advanced Usage](#advanced-usage)
  - [Complex Object Options](#complex-object-options)
  - [Array Options](#array-options)
  - [Union Types](#union-types)
- [Help System](#help-system)
  - [Command Help](#command-help)
  - [Global Help](#global-help)
- [Argument Parsing](#argument-parsing)
  - [Basic Arguments](#basic-arguments)
  - [Object Arguments](#object-arguments)
  - [Array Arguments](#array-arguments)
- [Integration](#integration)
  - [Dependency Injection](#dependency-injection)
  - [Program Configuration](#program-configuration)
- [Testing](#testing)
  - [Command Testing](#command-testing)
- [Best Practices](#best-practices)
- [Examples](#examples)
  - [Complete CLI Application](#complete-cli-application)
  - [Command with Complex Options](#command-with-complex-options)
- [Contributing](#contributing)

## Features

### 🚀 Command Framework
- **Hierarchical Commands**: Support for parent-child command relationships
- **Type-Safe Options**: Zod schema validation for command options
- **Automatic Help Generation**: Built-in help system with option descriptions
- **Examples Support**: Add usage examples to any command
- **Dependency Injection**: Built-in support for dependency injection

### 🔧 Argument Parsing
- **Advanced Object Transformation**: Comma-separated key-value pairs
- **Nested Object Structures**: Dot notation support (`--db.host=localhost`)
- **Array Support**: Comma-separated arrays with automatic type detection
- **Type Coercion**: Automatic conversion for numbers, booleans, and strings

### 📚 Help System
- **Command-Specific Help**: Detailed help for individual commands
- **Option Descriptions**: Rich option documentation with types and examples
- **Nested Object Help**: Detailed help for complex option schemas
- **Examples Display**: Show usage examples at the bottom of help

## Quick Start

### Basic Command

```typescript
import { ICommand } from "@fxfn/cmd"
import { z } from "zod/v4"

export class HelloCommand extends ICommand {
  name = "hello"
  description = "Say hello to someone"
  
  opts = z.object({
    name: z.string().describe("The name to greet"),
    count: z.number().optional().describe("Number of times to greet")
  })

  async handler(opts) {
    const { name, count = 1 } = opts
    for (let i = 0; i < count; i++) {
      console.log(`Hello, ${name}!`)
    }
    return 0
  }
}
```

### Command with Examples

```typescript
export class EmailCommand extends ICommand {
  name = "email"
  description = "Send an email"
  
  opts = z.object({
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content")
  })

  examples = [
    {
      description: "Send a simple email",
      command: "--to=user@example.com --subject='Hello' --body='How are you?'"
    },
    {
      description: "Send a formal email",
      command: "--to=client@company.com --subject='Meeting Request' --body='I would like to schedule a meeting.'"
    }
  ]

  async handler(opts) {
    // Implementation here
    return 0
  }
}
```

### Parent-Child Commands

```typescript
export class DatabaseCommand extends ICommand {
  name = "db"
  description = "Database operations"
  
  children = [CreateCommand, ListCommand, DeleteCommand]
  
  async handler() {
    // Parent command logic
    return 0
  }
}

export class CreateCommand extends ICommand {
  name = "create"
  description = "Create a new database"
  
  opts = z.object({
    name: z.string().describe("Database name"),
    engine: z.enum(["postgres", "mysql"]).describe("Database engine")
  })

  async handler(opts) {
    // Create database logic
    return 0
  }
}
```

## Core Concepts

### ICommand Interface

The base class for all commands:

```typescript
export abstract class ICommand {
  abstract name: string                    // Command name
  abstract description: string             // Command description
  opts?: z.ZodType                        // Options schema (optional)
  children: (new () => ICommand)[] = []   // Subcommands
  examples?: CommandExample[] = []         // Usage examples
  abstract handler(opts: unknown): Promise<number | void>
}
```

### CommandExample Interface

```typescript
export interface CommandExample {
  description: string    // What the example demonstrates
  command: string        // The actual command to run
}
```

### Options Schema

Commands can define their options using Zod schemas:

```typescript
opts = z.object({
  // Simple types
  name: z.string().describe("User's name"),
  age: z.number().describe("User's age"),
  active: z.boolean().describe("Whether user is active"),
  
  // Arrays
  tags: z.array(z.string()).describe("User tags"),
  
  // Objects
  config: z.object({
    host: z.string().describe("Server host"),
    port: z.number().describe("Server port")
  }).describe("Server configuration"),
  
  // Unions
  mode: z.enum(["dev", "prod"]).describe("Environment mode"),
  
  // Optional fields
  description: z.string().optional().describe("User description")
})
```

## Advanced Usage

### Complex Object Options

```typescript
opts = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    credentials: z.object({
      username: z.string(),
      password: z.string()
    })
  })
})
```

Users can provide these options in multiple ways:

```bash
# Comma-separated key-value pairs
myapp --database=host=localhost,port=5432,credentials.username=admin,credentials.password=secret

# Dot notation
myapp --database.host=localhost --database.port=5432 --database.credentials.username=admin
```

### Array Options

```typescript
opts = z.object({
  files: z.array(z.string()).describe("Files to process"),
  numbers: z.array(z.number()).describe("Numeric values")
})
```

Usage:
```bash
myapp --files=file1.txt --files=file2.txt --files=file3.txt
myapp --numbers=1 --numbers=2 --numbers=3 --numbers=4 --numbers=5
```

### Union Types

```typescript
opts = z.object({
  output: z.union([
    z.string().describe("Output file path"),
    z.enum(["stdout", "stderr"]).describe("Output stream")
  ]).describe("Output destination")
})
```

## Help System

### Command Help

The framework automatically generates comprehensive help for each command:

```bash
myapp help email
# or
myapp email --help
```

Output includes:
- Usage information
- Option descriptions with types
- Nested object structure details
- Usage examples (if provided)

### Global Help

```bash
myapp help
# or
myapp --help
```

Shows all available commands with descriptions.

## Argument Parsing

### Basic Arguments

```bash
# Boolean flags
myapp --verbose --debug

# Key-value pairs
myapp --name=John --age=30 --active=true
```

### Object Arguments

```bash
# Comma-separated
myapp --config=host=localhost,port=5432,database=test

# Nested with dots
myapp --db.host=localhost --db.port=5432
```

### Array Arguments

```bash
# String arrays
myapp --tags=frontend,backend,testing

# Numeric arrays
myapp --numbers=1,2,3,4,5
```

## Integration

### Dependency Injection

The framework integrates with `@fxfn/inject`:

```typescript
import { inject } from "@fxfn/inject"

export class MyCommand extends ICommand {
  @inject(DatabaseService)
  private db!: DatabaseService
  
  // ... rest of command
}
```

### Program Configuration

```typescript
import { conf, execute } from "@fxfn/cmd"

// Configure program metadata
container.register(conf.ProgramName, { useValue: 'myapp' })
container.register(conf.ProgramDescription, { useValue: 'My CLI Application' })
container.register(conf.ProgramVersion, { useValue: '1.0.0' })

// Execute with arguments
const result = await execute(process.argv.slice(2))
```

## Testing

### Command Testing

```typescript
import { describe, it, expect } from 'vitest'
import { container } from '@fxfn/inject'
import { HelpCommand } from './help'

describe('HelpCommand', () => {
  it('should display examples when command has them', async () => {
    class CommandWithExamples extends ICommand {
      name = 'examples'
      description = 'A command with examples'
      examples = [
        {
          description: 'Basic usage',
          command: '--name=test'
        }
      ]
      async handler() { return 0; }
    }

    container.register(ICommand, { useClass: CommandWithExamples })
    
    // Test implementation
  })
})
```

## Best Practices

### 1. Command Naming
- Use clear, descriptive names
- Follow consistent naming conventions
- Use kebab-case for multi-word commands

### 2. Option Descriptions
- Always provide `.describe()` for options
- Be concise but informative
- Include examples in descriptions when helpful

### 3. Examples
- Provide realistic usage examples
- Cover common use cases
- Show different option combinations

### 4. Error Handling
- Return appropriate exit codes
- Provide helpful error messages
- Validate inputs early

### 5. Help Text
- Write clear descriptions
- Use consistent formatting
- Include all relevant information

## Examples

### Complete CLI Application

```typescript
// main.ts
import { container } from "@fxfn/inject"
import { ICommand, conf, execute } from "@fxfn/cmd"
import { HelloCommand, EmailCommand, DatabaseCommand } from "./commands"

async function main() {
  // Configure program
  container.register(conf.ProgramName, { useValue: 'myapp' })
  container.register(conf.ProgramDescription, { useValue: 'My CLI Tool' })
  container.register(conf.ProgramVersion, { useValue: '1.0.0' })

  // Register commands
  container.register(ICommand, { useClass: HelloCommand })
  container.register(ICommand, { useClass: EmailCommand })
  container.register(ICommand, { useClass: DatabaseCommand })

  // Execute
  return await execute(process.argv.slice(2))
}

main().catch(console.error)
```

### Command with Complex Options

```typescript
export class DeployCommand extends ICommand {
  name = "deploy"
  description = "Deploy application to environment"
  
  opts = z.object({
    environment: z.enum(["dev", "staging", "prod"]).describe("Target environment"),
    services: z.array(z.string()).describe("Services to deploy"),
    config: z.object({
      replicas: z.number().describe("Number of replicas"),
      resources: z.object({
        cpu: z.string().describe("CPU allocation"),
        memory: z.string().describe("Memory allocation")
      }).describe("Resource requirements")
    }).describe("Deployment configuration"),
    dryRun: z.boolean().optional().describe("Show what would be deployed")
  })

  examples = [
    {
      description: "Deploy to development with default config",
      command: "--environment=dev --services=api,web"
    },
    {
      description: "Deploy to production with custom resources",
      command: "--environment=prod --services=api,web,worker --config.replicas=3 --config.resources.cpu=500m --config.resources.memory=1Gi"
    },
    {
      description: "Preview deployment without applying",
      command: "--environment=staging --services=api --dryRun"
    }
  ]

  async handler(opts) {
    // Deployment logic
    return 0
  }
}
```

## Contributing

When contributing to this package:

1. **Add Tests**: Include comprehensive tests for new functionality
2. **Update Documentation**: Keep examples and documentation current
3. **Follow Patterns**: Maintain consistency with existing code
4. **Type Safety**: Ensure all code is properly typed
5. **Examples**: Add examples for new features
