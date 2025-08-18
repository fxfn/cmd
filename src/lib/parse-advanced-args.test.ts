import { z } from "zod/v4"
import { describe, it, expect } from "vitest"
import { parseAdvancedArgs, validateAdvancedArgs } from "./parse-advanced-args"

describe('parseAdvancedArgs', () => {
  it('should parse primitive boolean flags', () => {
    const input = ['--verbose', '--debug']
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      key: 'verbose',
      value: true,
      original: '--verbose',
      type: 'primitive'
    })
    expect(result[1]).toEqual({
      key: 'debug',
      value: true,
      original: '--debug',
      type: 'primitive'
    })
  })

  it('should parse primitive key-value pairs', () => {
    const input = ['--name=John', '--age=30', '--active=true']
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      key: 'name',
      value: 'John',
      original: '--name=John',
      type: 'primitive'
    })
    expect(result[1]).toEqual({
      key: 'age',
      value: 30,
      original: '--age=30',
      type: 'primitive'
    })
    expect(result[2]).toEqual({
      key: 'active',
      value: true,
      original: '--active=true',
      type: 'primitive'
    })
  })

  it('should parse comma-separated arrays', () => {
    const input = ['--tags=frontend,backend,testing', '--numbers=1,2,3,4,5']
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      key: 'tags',
      value: ['frontend', 'backend', 'testing'],
      original: '--tags=frontend,backend,testing',
      type: 'array'
    })
    expect(result[1]).toEqual({
      key: 'numbers',
      value: [1, 2, 3, 4, 5],
      original: '--numbers=1,2,3,4,5',
      type: 'array'
    })
  })

  it('should parse object-like structures', () => {
    const input = ['--config=host=localhost,port=5432,database=test']
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      key: 'config',
      value: {
        host: 'localhost',
        port: 5432,
        database: 'test'
      },
      original: '--config=host=localhost,port=5432,database=test',
      type: 'object'
    })
  })

  it('should parse nested object structures', () => {
    const input = ['--db=host=localhost,port=5432', '--db.database=test', '--db.credentials=user=admin,pass=secret']
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      key: 'db',
      value: {
        host: 'localhost',
        port: 5432
      },
      original: '--db=host=localhost,port=5432',
      type: 'object'
    })
    expect(result[1]).toEqual({
      key: 'db.database',
      value: 'test',
      original: '--db.database=test',
      type: 'primitive'
    })
    expect(result[2]).toEqual({
      key: 'db.credentials',
      value: {
        user: 'admin',
        pass: 'secret'
      },
      original: '--db.credentials=user=admin,pass=secret',
      type: 'object'
    })
  })

  it('should parse JSON strings', () => {
    const input = ['--data={"name":"John","age":30}', '--list=[1,2,3,4,5]']
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      key: 'data',
      value: { name: 'John', age: 30 },
      original: '--data={"name":"John","age":30}',
      type: 'object'
    })
    expect(result[1]).toEqual({
      key: 'list',
      value: [1, 2, 3, 4, 5],
      original: '--list=[1,2,3,4,5]',
      type: 'array'
    })
  })

  it('should handle mixed argument types', () => {
    const input = [
      '--verbose',
      '--name=John',
      '--config=host=localhost,port=5432',
      '--tags=frontend,backend',
      '--data={"key":"value"}'
    ]
    const result = parseAdvancedArgs(input)
    
    expect(result).toHaveLength(5)
    expect(result[0].type).toBe('primitive')
    expect(result[1].type).toBe('primitive')
    expect(result[2].type).toBe('object')
    expect(result[3].type).toBe('array')
    expect(result[4].type).toBe('object')
  })

  it('should parse multiple options with union schema (string or array) to an array', () => {
    const schema = z.object({
      to: z.string().or(z.array(z.string()))
    })

    const input = ['--to=foo@bar.com', '--to=hello@world.com']
    const parsedArgs = parseAdvancedArgs(input)
    const result = validateAdvancedArgs(parsedArgs, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        to: ['foo@bar.com', 'hello@world.com']
      })
    }
  })
})

describe('validateAdvancedArgs', () => {
  it('should validate primitive types', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean()
    })
    
    const args = parseAdvancedArgs(['--name=John', '--age=30', '--active=true'])
    const result = validateAdvancedArgs(args, schema)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        name: 'John',
        age: 30,
        active: true
      })
    }
  })

  it('should validate object types', () => {
    const schema = z.object({
      config: z.object({
        host: z.string(),
        port: z.number()
      })
    })
    
    const args = parseAdvancedArgs(['--config=host=localhost,port=5432'])
    const result = validateAdvancedArgs(args, schema)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        config: {
          host: 'localhost',
          port: 5432
        }
      })
    }
  })

  it('should validate array types', () => {
    const schema = z.object({
      tags: z.array(z.string()),
      numbers: z.array(z.number())
    })
    
    const args = parseAdvancedArgs(['--tags=frontend,backend', '--numbers=1,2,3'])
    const result = validateAdvancedArgs(args, schema)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        tags: ['frontend', 'backend'],
        numbers: [1, 2, 3]
      })
    }
  })

  it('should handle validation errors', () => {
    const schema = z.object({
      age: z.number().min(18)
    })
    
    const args = parseAdvancedArgs(['--age=15'])
    const result = validateAdvancedArgs(args, schema)
    
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].message).toContain('expected number to be >=18')
    }
  })

  it('should parse an object with nullish values correctly', () => {
    const schema = z.object({
      attachments: z.object({
        filename: z.string().nullish(),
        content: z.string().nullish(),
        file: z.string().nullish(),
      })
    })

    const args = parseAdvancedArgs(['--attachments=file=/tmp/foobar.txt'])
    const result = validateAdvancedArgs(args, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        attachments: {
          file: '/tmp/foobar.txt'
        }
      })
    }
  })
})
