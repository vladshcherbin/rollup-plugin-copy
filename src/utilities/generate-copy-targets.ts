import { isString } from '@sindresorhus/is'
import { readFile, stat } from 'node:fs/promises'
import { join, parse } from 'node:path'
import type { Target } from '../types.ts'
import renameTarget from './rename-target.ts'

export default async function generateCopyTargets(
  path: string,
  { dest, rename, transform }: Target,
  { flatten }: { flatten: boolean }
) {
  if (transform && !(await stat(path)).isFile()) {
    throw new Error(`"transform" option works only on files: '${path}' must be a file`)
  }

  const { base, dir } = parse(path)
  const destinations = isString(dest) ? [dest] : dest

  return Promise.all(destinations.map(async (destination) => {
    const destinationFolder = (flatten || !dir)
      ? destination
      : dir.replace(dir.split('/').at(0)!, destination)
    const destinationPath = rename ? renameTarget(base, rename, path) : base

    return {
      dest: join(destinationFolder, destinationPath),
      renamed: Boolean(rename),
      src: path,
      transformed: Boolean(transform),
      ...(transform && { contents: await transform(await readFile(path), base) })
    } as const
  }))
}

export type CopyTarget = Awaited<ReturnType<typeof generateCopyTargets>>[number]
