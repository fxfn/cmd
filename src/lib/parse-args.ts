export function parseArgs(input: string[]) {
  // iterate over the input until we find the end, or an option
  const result: string[] = []

  for (let i = 0; i < input.length; i++) {
    const arg = input[i]
    if (arg.startsWith('-')) {
      break
    } else {
      result.push(arg)
    }
  }

  return result
}