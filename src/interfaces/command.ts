import { z } from "zod/v4"

export interface CommandExample {
  description: string
  command: string | string[]
}

export abstract class ICommand {
  abstract name: string
  abstract description: string
  opts?: z.ZodType
  
  children: (new () => ICommand)[] = []
  examples?: CommandExample[] = []
  abstract handler(opts: unknown): Promise<number | void>
}