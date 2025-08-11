import { ICommand } from "../interfaces/command";
import { conf } from "..";
import { inject, injectAll } from "@fxfn/inject"
import { Options } from "../types";
import { z } from "zod/v4";
import { resolveCommand } from "../lib/resolve-command";

export class HelpCommand extends ICommand {
  name = "help"
  description = "Show help for a command"
  opts = z.array(z.string())

  @inject(conf.ProgramName)
  programName!: string

  commands: ICommand[] = []

  constructor() {
    super()
    // We'll set commands after construction to avoid circular dependency
  }

  async handler(input: Options<HelpCommand>) {

    let opts = [...input]
    if (opts[opts.length-1] === "help") {
      opts = [...input].slice(0, -1)
    } else {
      opts = [...input]
    }

    let rootCommands = [...this.commands]
    for (const command of this.commands) {
      for (const child of command.children || []) {
        const childCommand = this.commands.find(c => c instanceof child)
        rootCommands = rootCommands.filter(c => c.name !== childCommand?.name)
      }
    }

    // get the max length of the command names
    const maxLength = Math.max(...rootCommands.map(c => c.name.length))+3

    // if opts.length is 0, show help for all commands without children
    if (opts.length === 0) {
      console.log(`Usage:
  ${this.programName} [command] [options]

Available commands:
  ${rootCommands.map(c => `${c.name.padEnd(maxLength, ' ')}    ${c.description}`).join('\n  ').trimEnd()}

Options:
  -h, --help      show help for ${this.programName}
  -v, --version   show version for ${this.programName}
`)
      return 0
    }

    // if opts.length is > 1, show the help for the command
    let command: ICommand


    // get the help for the command that the user is attempting
    command = resolveCommand(opts)
    let commands = []
    for (const child of command.children || []) {
      const childCommand = this.commands.find(c => c instanceof child)
      commands.push(childCommand)
    }
    console.log(`Usage ${this.programName} ${opts.join(' ')} [options]\n`)

    if (commands.length > 0) {
      console.log(`Available commands:
  ${commands.map(c => `${c?.name.padEnd(maxLength, ' ')}    ${c?.description}`).join('\n  ').trimEnd()}
`)
    }
    
    // output the options for this command.
    //  - opts are a z.ZodType with a description
    if (command.opts && command.opts._def?.type === 'object') {
      console.log(`Options:`)
      const shape = (command.opts._def as any).shape
      
      // Calculate the maximum option name length for proper alignment
      const maxOptionLength = Math.max(...Object.keys(shape).map(key => key.length + 2)) // +2 for "--"
      const minSpacing = 4 // Minimum spaces between option and description
      
      for (const [key, value] of Object.entries(shape)) {
        const description = (value as any).description || ''
        const helpText = this.generateOptionHelp(key, value as z.ZodType)
        
        // Calculate proper spacing to align descriptions
        const optionText = `--${key}`
        const spacing = ' '.repeat(minSpacing + (maxOptionLength - optionText.length))
        
        // Display option with description and type information inline
        if (helpText) {
          console.log(`  ${optionText}${spacing}${description} ${helpText}`)
        } else {
          console.log(`  ${optionText}${spacing}${description}`)
        }
        
        // Show detailed help for complex object schemas
        if ((value as z.ZodType)._def?.type === 'object') {
          this.printObjectSchemaHelp(key, value as z.ZodType, 2)
        }
      }
      
      // Show examples if they exist
      if (command.examples && command.examples.length > 0) {
        console.log('\nExamples:')
        for (const example of command.examples) {
          console.log(this.darkGrey(`# ${example.description}`))
          if (Array.isArray(example.command)) {
            console.log(this.cyan('$'), `${this.programName} ${opts.join(' ')} \\\n    ${example.command.join(' \\\n    ')}`)
          } else {
            console.log(this.cyan('$'), `${this.programName} ${opts.join(' ')} \\\n    ${example.command}`)
          }
          console.log('')
        }
      }
    }
  }

  private darkGrey(text: string) {
    return `\x1b[90m${text}\x1b[0m`
  }

  private cyan(text: string) {
    return `\x1b[36m${text}\x1b[0m`
  }

  private blue(text: string) {
    return `\x1b[34m${text}\x1b[0m`
  }

  private generateOptionHelp(key: string, schema: z.ZodType): string {
    const def = schema._def
    
    // Handle primitive types
    if (def.type === 'string') {
      return `string value (e.g., --${key}=value)`
    }
    if (def.type === 'number') {
      return `number value (e.g., --${key}=123)`
    }
    if (def.type === 'boolean') {
      return `boolean flag (e.g., --${key} or --${key}=true)`
    }
    
    // Handle arrays
    if (def.type === 'array') {
      const elementType = (def as any).element
      const elementHelp = this.generateElementHelp(elementType)
      return `array of ${elementHelp} (e.g., --${key}=value1 --${key}=value2)`
    }
    
    // Handle objects
    if (def.type === 'object') {
      const shape = (def as any).shape
      const objectHelp = this.generateObjectHelp(shape)
      return `object: ${objectHelp} (e.g., --${key}=${this.generateObjectExample(shape)})`
    }
    
    // Handle enums
    if (def.type === 'enum') {
      const values = (def as any).values
      if (values && Array.isArray(values)) {
        return `${values.join(' | ')} value`
      }
      return 'enum value'
    }
    
    // Handle unions
    if (def.type === 'union') {
      const options = (def as any).options
      if (options && Array.isArray(options)) {
        const unionHelp = options.map((opt: z.ZodType) => {
          if (opt._def?.type === 'string') return 'string'
          if (opt._def?.type === 'number') return 'number'
          if (opt._def?.type === 'boolean') return 'boolean'
          if (opt._def?.type === 'enum') return 'enum'
          if (opt._def?.type === 'array') {
            const elementType = (opt._def as any).element
            if (elementType._def?.type === 'string') return 'string[]'
            if (elementType._def?.type === 'number') return 'number[]'
            if (elementType._def?.type === 'boolean') return 'boolean[]'
            if (elementType._def?.type === 'object') return 'object[]'
            return 'value[]'
          }
          if (opt._def?.type === 'object') {
            const shape = (opt._def as any).shape
            if (shape) {
              // For simple objects like attachments, show a more readable format
              const keys = Object.keys(shape)
              if (keys.length <= 3) {
                return keys.join(',')
              }
              const objectHelp = this.generateObjectHelp(shape)
              return objectHelp
            }
            return 'object'
          }
          return 'value'
        }).join(' | ')
        return `<${unionHelp}>`
      }
      return 'union value'
    }
    
    // Handle optional types - check if the schema is optional by examining the def
    if (def.type === 'optional') {
      const innerType = (def as any).innerType
      if (innerType) {
        const innerDef = innerType._def
        if (innerDef.type === 'string') return 'optional string value (e.g., --' + key + '=value)'
        if (innerDef.type === 'number') return 'optional number value (e.g., --' + key + '=123)'
        if (innerDef.type === 'boolean') return 'optional boolean flag (e.g., --' + key + ' or --' + key + '=true)'
        if (innerDef.type === 'array') return 'optional array value'
        if (innerDef.type === 'object') return 'optional object value'
        return 'optional value'
      }
    }
    
    // Handle coerced types - check if the schema has a coerce method
    if ((schema as any).coerce) {
      try {
        const innerType = (schema as any).innerType || schema
        return `coerced ${this.generateOptionHelp(key, innerType)}`
      } catch {
        // Fallback
      }
    }
    
    return 'value'
  }

  private generateElementHelp(schema: z.ZodType): string {
    const def = schema._def
    
    if (def.type === 'string') return 'strings'
    if (def.type === 'number') return 'numbers'
    if (def.type === 'boolean') return 'booleans'
    if (def.type === 'object') return 'objects'
    
    return 'values'
  }

  private generateObjectHelp(shape: Record<string, z.ZodType>): string {
    const properties = Object.entries(shape).map(([propKey, propSchema]) => {
      const propDef = propSchema._def
      let propType = 'value'
      
      if (propDef.type === 'string') propType = 'string'
      else if (propDef.type === 'number') propType = 'number'
      else if (propDef.type === 'boolean') propType = 'boolean'
      else if (propDef.type === 'object') propType = 'object'
      
      return `${propKey}:${propType}`
    })
    
    return `{${properties.join(', ')}}`
  }

  private generateObjectExample(shape: Record<string, z.ZodType>): string {
    const examples = Object.entries(shape).map(([propKey, propSchema]) => {
      const propDef = propSchema._def
      let example = 'value'
      
      if (propDef.type === 'string') example = 'text'
      else if (propDef.type === 'number') example = '123'
      else if (propDef.type === 'boolean') example = 'true'
      else if (propDef.type === 'object') example = 'key=value'
      
      return `${propKey}=${example}`
    })
    
    return examples.join(',')
  }

  private printObjectSchemaHelp(key: string, schema: z.ZodType, indent: number = 0): void {
    const def = schema._def
    if (def.type !== 'object') return
    
    const shape = (def as any).shape
    if (!shape) return
    
    const indentStr = ' '.repeat(indent * 2)
    console.log(`${indentStr}Object structure:`)
    
    for (const [propKey, propSchema] of Object.entries(shape)) {
      const propDef = (propSchema as z.ZodType)._def
      const description = (propSchema as any).description || ''
      let propType = 'unknown'
      
      if (propDef.type === 'string') propType = 'string'
      else if (propDef.type === 'number') propType = 'number'
      else if (propDef.type === 'boolean') propType = 'boolean'
      else if (propDef.type === 'object') propType = 'object'
      else if (propDef.type === 'array') propType = 'array'
      
      console.log(`${indentStr}  ${propKey}: ${propType}${description ? ` - ${description}` : ''}`)
      
      // Show nested object examples
      if (propDef.type === 'object') {
        const nestedShape = (propDef as any).shape
        if (nestedShape) {
          const nestedExample = this.generateNestedObjectExample(propKey, nestedShape)
          console.log(`${indentStr}    Example: --${key}=${nestedExample}`)
        }
      }
    }
  }

  private generateNestedObjectExample(parentKey: string, shape: Record<string, z.ZodType>): string {
    const examples = Object.entries(shape).map(([propKey, propSchema]) => {
      const propDef = propSchema._def
      let example = 'value'
      
      if (propDef.type === 'string') example = 'text'
      else if (propDef.type === 'number') example = '123'
      else if (propDef.type === 'boolean') example = 'true'
      
      return `${parentKey}.${propKey}=${example}`
    })
    
    return examples.join(',')
  }
}