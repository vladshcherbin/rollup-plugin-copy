import { isString } from '@sindresorhus/is'
import { parse } from 'node:path'
import type { Target } from '../types.ts'

export default function renameTarget(
  fileName: string,
  rename: NonNullable<Target['rename']>,
  fullPath: string
) {
  const { ext, name } = parse(fileName)

  return isString(rename)
    ? rename
    : rename(name, ext.replace('.', ''), fullPath)
}
