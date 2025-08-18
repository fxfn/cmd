import { z } from "zod/v4"

export interface ParsedArgument {
  key: string
  value: unknown
  original: string
  type: 'primitive' | 'object' | 'array' | 'nested'
}

/**
 * Advanced argument parser that can handle complex object transformations
 * Supports nested object structures, arrays, and primitive type coercion
 */
export function parseAdvancedArgs(input: string[]): ParsedArgument[] {
  const result: ParsedArgument[] = []
  
  for (let i = 0; i < input.length; i++) {
    const arg = input[i]
    
    if (!arg.startsWith('-')) {
      continue
    }
    
    // Remove leading dashes
    let cleanArg = arg.replace(/^--?/, '')
    
    // Check if it's a key-value pair
    const equalIndex = cleanArg.indexOf('=')
    if (equalIndex === -1) {
      // Boolean flag
      result.push({
        key: cleanArg,
        value: true,
        original: arg,
        type: 'primitive'
      })
      continue
    }
    
    const key = cleanArg.substring(0, equalIndex)
    const value = cleanArg.substring(equalIndex + 1)
    
    // Parse the value
    const parsedValue = parseAdvancedValue(value)
    
    result.push({
      key,
      value: parsedValue.value,
      original: arg,
      type: parsedValue.type
    })
  }
  
  return result
}

/**
 * Parse a value string into its appropriate type
 */
function parseAdvancedValue(value: string): { value: unknown; type: ParsedArgument['type'] } {
  if (!value) {
    return { value: true, type: 'primitive' }
  }
  
  // Check if it's a JSON string
  if ((value.startsWith('{') && value.endsWith('}')) || 
      (value.startsWith('[') && value.endsWith(']'))) {
    try {
      const parsed = JSON.parse(value)
      return { 
        value: parsed, 
        type: Array.isArray(parsed) ? 'array' : 'object' 
      }
    } catch {
      // Not valid JSON, continue with other parsing
    }
  }
  
  // Check if it contains key-value pairs (object-like)
  if (value.includes('=')) {
    const parsed = parseObjectValue(value)
    if (parsed.isObject) {
      return { value: parsed.value, type: 'object' }
    }
  }
  
  // Check if it's a comma-separated list (array-like)
  if (value.includes(',') && !value.includes('=')) {
    const parts = value.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length > 1) {
      // Try to parse as numbers if all parts are numeric
      const numericParts = parts.map(p => Number(p))
      if (numericParts.every(n => !isNaN(n) && isFinite(n))) {
        return { value: numericParts, type: 'array' }
      }
      return { value: parts, type: 'array' }
    }
  }
  
  // Try to parse as primitive types
  const primitive = parsePrimitiveValue(value)
  return { value: primitive, type: 'primitive' }
}

/**
 * Parse a string that contains key-value pairs
 */
function parseObjectValue(value: string): { isObject: boolean; value: Record<string, unknown> } {
  const parts = value.split(',')
  const result: Record<string, unknown> = {}
  let hasValidKeyValuePairs = false
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    const equalIndex = part.indexOf('=')
    
    if (equalIndex !== -1) {
      const keyPath = part.substring(0, equalIndex).trim()
      let val = part.substring(equalIndex + 1).trim()
      
      if (keyPath && val !== undefined) {
        // Check if the next parts don't have equals signs, 
        // then they might be part of this value
        let j = i + 1
        while (j < parts.length && !parts[j].includes('=')) {
          val += ',' + parts[j]
          j++
        }
        i = j - 1 // Skip the parts we've consumed
        
        // Handle nested key paths (e.g., "config.database.host")
        setNestedValue(result, keyPath, val)
        hasValidKeyValuePairs = true
      }
    }
  }
  
  return { 
    isObject: hasValidKeyValuePairs && Object.keys(result).length > 0,
    value: result
  }
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  
  const lastKey = keys[keys.length - 1]
  current[lastKey] = parsePrimitiveValue(value)
}

/**
 * Parse a primitive value string into its appropriate type
 */
function parsePrimitiveValue(value: string): unknown {
  // Handle boolean values
  if (value === 'true' || value === 'false') {
    return value === 'true'
  }
  
  // Handle null/undefined
  if (value === 'null') {
    return null
  }
  
  if (value === 'undefined') {
    return undefined
  }
  
  // Try to parse as number
  const num = Number(value)
  if (!isNaN(num) && isFinite(num)) {
    return num
  }
  
  // Return as string
  return value
}

/**
 * Validate parsed arguments against a Zod schema
 */
export function validateAdvancedArgs<T extends z.ZodType>(
  args: ParsedArgument[], 
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const parsedObject: Record<string, unknown> = {}
  
  // Group arguments by key to handle multiple values
  const groupedArgs: Record<string, ParsedArgument[]> = {}
  for (const arg of args) {
    if (!groupedArgs[arg.key]) {
      groupedArgs[arg.key] = []
    }
    groupedArgs[arg.key].push(arg)
  }
  
  // Process each key, handling multiple values appropriately
  for (const [key, keyArgs] of Object.entries(groupedArgs)) {
    if (keyArgs.length === 1) {
      // Single value, use as-is
      parsedObject[key] = keyArgs[0].value
    } else {
      // Multiple values - check if schema expects array or union with array
      const isArrayExpected = isArraySchemaAtPath(schema, key)
      
      if (isArrayExpected) {
        // Schema expects an array, collect all values
        parsedObject[key] = keyArgs.map(arg => arg.value)
      } else {
        // Schema doesn't expect array, use last value (existing behavior)
        parsedObject[key] = keyArgs[keyArgs.length - 1].value
      }
    }
  }
  
  return schema.safeParse(parsedObject)
}

/**
 * Check if a schema at a given path expects an array or union that includes an array
 */
function isArraySchemaAtPath(schema: z.ZodType, path: string): boolean {
  const segments = path.split('.')
  let current: any = schema

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const def = current?._def
    if (!def) return false

    if (def.type === 'object') {
      // In Zod v3, shape can be a function or object
      const shapeOrGetter: any = (def as any).shape
      const shape = typeof shapeOrGetter === 'function' ? shapeOrGetter() : shapeOrGetter
      current = shape?.[seg]
      if (!current) return false
    } else {
      // If not an object, we cannot traverse further
      return false
    }
  }

  const finalDef = current?._def
  
  // Check if it's directly an array
  if (finalDef?.type === 'array') {
    return true
  }
  
  // Check if it's a union that includes an array
  if (finalDef?.type === 'union') {
    const options = finalDef.options || []
    return options.some((option: any) => option._def?.type === 'array')
  }
  
  return false
}

/**
 * Generate help text for a schema based on the advanced parsing capabilities
 */
export function generateAdvancedHelp(schema: z.ZodType): string {
  const def = schema._def
  
  if (def.type === 'object') {
    const shape = (def as any).shape
    if (shape) {
      return generateObjectHelp(shape)
    }
  }
  
  return 'value'
}

function generateObjectHelp(shape: Record<string, z.ZodType>): string {
  const properties = Object.entries(shape).map(([key, propSchema]) => {
    const propDef = propSchema._def
    let propType = 'value'
    
    if (propDef.type === 'string') propType = 'string'
    else if (propDef.type === 'number') propType = 'number'
    else if (propDef.type === 'boolean') propType = 'boolean'
    else if (propDef.type === 'object') propType = 'object'
    else if (propDef.type === 'array') propType = 'array'
    
    return `${key}:${propType}`
  })
  
  return `{${properties.join(', ')}}`
}
