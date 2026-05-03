import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) {
    return nextResolve(specifier, context)
  }

  const basePath = path.resolve(process.cwd(), specifier.slice(2))
  const candidates = path.extname(basePath)
    ? [basePath]
    : [`${basePath}.ts`, `${basePath}.tsx`, `${basePath}.js`, `${basePath}.mjs`, path.join(basePath, 'index.ts')]

  const matched = candidates.find((candidate) => existsSync(candidate))
  if (!matched) {
    throw new Error(`Cannot resolve alias import: ${specifier}`)
  }

  return {
    shortCircuit: true,
    url: pathToFileURL(matched).href,
  }
}
