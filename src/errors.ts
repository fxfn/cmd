export class CommandNotFoundError extends Error {
  constructor() {
    super('Command not found')
    this.name = 'CommandNotFoundError'
  }
}

export class NoCommandSpecifiedError extends Error {
  constructor() {
    super('No command specified')
    this.name = 'NoCommandSpecifiedError'
  }
}