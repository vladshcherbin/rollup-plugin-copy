/* eslint-disable no-console */
import { isEmptyArray } from '@sindresorhus/is'
import { cpSync } from 'node:fs'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { styleText } from 'node:util'
import type { ExternalOptions } from '../types.ts'
import type Options from '../types.ts'
import type { CopyTarget } from './generate-copy-targets.ts'

const flagKeys = ['renamed', 'transformed']

export default async function copyTargets(
  targets: CopyTarget[],
  { copySync, verbose }: Pick<Options, 'copySync' | 'verbose'>,
  externalOptions: ExternalOptions
) {
  if (verbose) {
    if (isEmptyArray(targets)) {
      console.log(styleText('yellow', 'no items to copy'))
    } else {
      console.log(styleText('green', 'copied:'))
    }
  }

  for (const target of targets) {
    const { contents, dest, src, transformed } = target

    if (transformed) {
      await mkdir(dirname(dest), { recursive: true })
      await writeFile(dest, contents!, externalOptions)
    } else if (copySync) {
      cpSync(src, dest, { recursive: true, ...externalOptions })
    } else {
      await cp(src, dest, { recursive: true, ...externalOptions })
    }

    if (verbose) {
      let message = styleText('green', `  ${styleText('bold', src)} → ${styleText('bold', dest)}`)
      const flags = Object.entries(target)
        .filter(([key, value]) => flagKeys.includes(key) && value)
        .map(([key]) => key.charAt(0).toUpperCase())

      if (flags.length) {
        message += ` ${styleText('yellow', `[${flags.join(' ')}]`)}`
      }

      console.log(message)
    }
  }
}
