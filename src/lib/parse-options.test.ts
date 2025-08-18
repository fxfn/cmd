import { describe, it, expect } from 'vitest'
import { z } from 'zod/v4'
import { parseOptions } from './parse-options'

describe('parseOptions', () => {
  it('should parse basic options', () => {
    const input = ['--tenant=2']
    const schema = z.object({ 
      tenant: z.string() 
    })

    const options = parseOptions(input, schema)
    expect(options.data).toEqual({ tenant: '2' })
  })

  it('should parse multiple options', () => {
    const input = ['--tenant=2', '--name=John']
    const schema = z.object({ 
      tenant: z.string(), 
      name: z.string() 
    })

    const options = parseOptions(input, schema)
    expect(options.data?.tenant).toBe('2')
    expect(options.data?.name).toBe('John')
  })

  it('should parse options with no value', () => {
    const input = ['--tenant', '--name']
    const schema = z.object({ 
      tenant: z.boolean(), 
      name: z.boolean() 
    })

    const options = parseOptions(input, schema)
    expect(options.data?.tenant).toBe(true)
    expect(options.data?.name).toBe(true)
  })

  it('should parse input with arguments and options', () => {
    const input = ['list', '--tenant=2', '--name=John']
    const schema = z.object({ 
      tenant: z.string(), 
      name: z.string() 
    })

    const options = parseOptions(input, schema)
    expect(options.data?.tenant).toBe('2')
    expect(options.data?.name).toBe('John')
  })

  it('should return an error if the input is invalid', () => {
    const input = ['--tenant=2', '--name=John']
    const schema = z.object({ 
      tenant: z.string(), 
      name: z.string(), 
      invalid: z.string() 
    })

    const options = parseOptions(input, schema)
    expect(options.success).toBe(false)
    expect(options.error?.issues.length).toBe(1)
  })

  it('should parse multiple options with the same name to an array', () => {
    const input = ['--attachments=file1.txt', '--attachments=file2.txt']
    const schema = z.object({ 
      attachments: z.array(z.string()) 
    })

    const options = parseOptions(input, schema)
    expect(options.data?.attachments).toEqual(['file1.txt', 'file2.txt'])
  })

  it('should parse an argument to an object', () => {
    const input = ['--attachment=filename=file.txt,content=hello']
    const schema = z.object({
      attachment: z.object({
        filename: z.string(),
        content: z.string()
      })
    })

    const options = parseOptions(input, schema)
    expect(options.data?.attachment).toEqual({ filename: 'file.txt', content: 'hello' })
  })

  it('should parse primitive values', () => {
    const schema = z.object({
      name: z.string(),
      verbose: z.boolean()
    })

    const input = ['--name=test', '--verbose']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        name: 'test',
        verbose: true
      })
    }
  })

  it('should parse arrays of primitive values', () => {
    const schema = z.object({
      tags: z.array(z.string())
    })

    const input = ['--tags=tag1', '--tags=tag2', '--tags=tag3']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        tags: ['tag1', 'tag2', 'tag3']
      })
    }
  })

  it('should parse object values from comma-separated key-value pairs', () => {
    const schema = z.object({
      attachment: z.object({
        filename: z.string(),
        content: z.string()
      })
    })

    const input = ['--attachment=filename=hello.txt,content=Hello world']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        attachment: {
          filename: 'hello.txt',
          content: 'Hello world'
        }
      })
    }
  })

  it('should parse arrays of objects', () => {
    const schema = z.object({
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string()
      }))
    })

    const input = [
      '--attachments=filename=hello.txt,content=Hello world',
      '--attachments=filename=foo.txt,content=foo,bar'
    ]
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        attachments: [
          {
            filename: 'hello.txt',
            content: 'Hello world'
          },
          {
            filename: 'foo.txt',
            content: 'foo,bar'
          }
        ]
      })
    }
  })

  it('should handle mixed primitive and object values', () => {
    const schema = z.object({
      to: z.array(z.string()),
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string()
      }))
    })

    const input = [
      '--to=test@email.com',
      '--to=foo@bar.com',
      '--attachments=filename=hello.txt,content=Hello world',
      '--attachments=filename=foo.txt,content=foo,bar'
    ]
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        to: ['test@email.com', 'foo@bar.com'],
        attachments: [
          {
            filename: 'hello.txt',
            content: 'Hello world'
          },
          {
            filename: 'foo.txt',
            content: 'foo,bar'
          }
        ]
      })
    }
  })

  it('should handle values with commas that are not key-value pairs', () => {
    const schema = z.object({
      tags: z.array(z.string())
    })

    const input = ['--tags=tag1,tag2', '--tags=tag3']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        tags: ['tag1,tag2', 'tag3']
      })
    }
  })

  it('should parse options using dot notation', () => {
    const schema = z.object({
      db: z.object({
        host: z.string(),
        port: z.number()
      })
    })

    const input = ['--db.host=localhost', '--db.port=5432']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      db: {
        host: 'localhost',
        port: 5432
      }
    })
  })

  it('should parse comma seperated string values as an array', () => {
    const schema = z.object({
      tags: z.array(z.string())
    })

    const input = ['--tags=tag1,tag2,tag3']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      tags: ['tag1', 'tag2', 'tag3']
    })
  })

  it('should parse comma seperated number values as an array', () => {
    const schema = z.object({
      numbers: z.array(z.number())
    })

    const input = ['--numbers=1,2,3,4,5']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      numbers: [1, 2, 3, 4, 5]
    })
  })

  it('should parse multiple options with union schema (string or array) to an array', () => {
    const schema = z.object({
      to: z.string().or(z.array(z.string()))
    })

    const input = ['--to=foo@bar.com', '--to=hello@world.com']
    const result = parseOptions(input, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        to: ['foo@bar.com', 'hello@world.com']
      })
    }
  })
})
