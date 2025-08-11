import { z } from "zod/v4"

export function parseOptions<T extends z.ZodType>(input: string[], schema: T) {
  const result: Record<string, unknown> = {}

  // Pre-count option occurrences by key for conditional comma-splitting
  const occurrences = countOptionOccurrences(input)

  for (let i = 0; i < input.length; i++) {
    let arg = input[i]
    if (arg.startsWith('-')) {
      arg = arg.replace('--', '')
      if (arg.startsWith('-')) {
        arg = arg.replace('-', '')
      }

      // Split on the first '=' to get the key and the rest
      const firstEqualIndex = arg.indexOf('=')
      if (firstEqualIndex === -1) {
        // No value provided, treat as boolean flag
        setNestedValue(result, arg, true)
        continue
      }

      const key = arg.substring(0, firstEqualIndex)
      const value = arg.substring(firstEqualIndex + 1)

      // Parse the value - check if it contains object-like key-value pairs
      const parsedValue = parseValue(value)

      const isArrayForKey = isArraySchemaAtPath(schema, key)

      // If the schema expects an array, there is only a single occurrence of this key,
      // and the value is a comma-separated primitive list (not object-like),
      // then split into an array and coerce primitives for each item.
      if (isArrayForKey && occurrences[key] === 1 && typeof parsedValue === 'string' && parsedValue.includes(',')) {
        const splitValues = parsedValue
          .split(',')
          .map(part => part.trim())
          .filter(Boolean)
          .map(part => parsePrimitiveValue(part))

        if (key.includes('.')) {
          setNestedValue(result, key, splitValues)
        } else {
          result[key] = splitValues
        }
        continue
      }

      // Handle dot notation in keys (e.g., db.host=localhost)
      if (key.includes('.')) {
        setNestedValue(result, key, parsedValue)
      } else {
        // Handle regular keys with potential array behavior by collecting multiples
        if (result[key]) {
          if (Array.isArray(result[key])) {
            ;(result[key] as unknown[]).push(parsedValue)
          } else {
            result[key] = [result[key], parsedValue]
          }
        } else {
          result[key] = parsedValue
        }
      }
    }
  }

  return schema.safeParse(result)
}

function parseValue(value: string): unknown {
  if (!value) {
    return true
  }

  // Check if the value contains key-value pairs (e.g., "filename=hello.txt,content=Hello world")
  // We need to be careful about commas that are part of values vs commas that separate key-value pairs
  
  // First, let's check if this looks like a key-value pattern
  // A key-value pattern should have at least one "key=value" structure
  if (!value.includes('=')) {
    return value
  }

  // Enhanced parsing for complex object structures
  return parseObjectValue(value)
}

function parseObjectValue(value: string): unknown {
  // Handle nested object structures like "config.database.host=localhost,config.database.port=5432"
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
  
  // Only return an object if we found valid key-value pairs
  if (hasValidKeyValuePairs && Object.keys(result).length > 0) {
    return result
  }

  // Return the value as-is for primitive types
  return value
}

function countOptionOccurrences(input: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (let i = 0; i < input.length; i++) {
    const arg = input[i]
    if (!arg.startsWith('-')) continue
    const clean = arg.replace(/^--?/, '')
    const equalIndex = clean.indexOf('=')
    if (equalIndex === -1) continue
    const key = clean.substring(0, equalIndex)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

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
  return finalDef?.type === 'array'
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
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
  
  // If the value is a string, parse it as a primitive value
  if (typeof value === 'string') {
    current[lastKey] = parsePrimitiveValue(value)
  } else {
    current[lastKey] = value
  }
}

function parsePrimitiveValue(value: string): unknown {
  // Try to parse as different primitive types
  if (value === 'true' || value === 'false') {
    return value === 'true'
  }
  
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
  
  // Check if it's a JSON string
  if ((value.startsWith('{') && value.endsWith('}')) || 
      (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value)
    } catch {
      // Not valid JSON, treat as string
    }
  }
  
  // Return as string
  return value
}