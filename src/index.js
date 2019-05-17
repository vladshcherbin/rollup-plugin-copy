/* eslint-disable no-await-in-loop, no-console, no-restricted-syntax */
import path from 'path'
import util from 'util'
import fs from 'fs-extra'
import globby from 'globby'
import isObject from 'is-plain-object'
import { bold, green, yellow } from 'colorette'

function stringify(target) {
  return util.inspect(target, { breakLength: Infinity })
}

function generateCopyTarget(src, dest) {
  return {
    src,
    dest: path.join(dest, path.basename(src))
  }
}

export default function copy(options = {}) {
  const {
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    ...rest
  } = options

  return {
    name: 'copy',
    [hook]: async () => {
      const copyTargets = []

      if (Array.isArray(targets) && targets.length) {
        for (const target of targets) {
          if (!isObject(target)) {
            throw new Error(`${stringify(target)} target must be an object`)
          }

          if (!target.src || !target.dest) {
            throw new Error(`${stringify(target)} target must have "src" and "dest" properties`)
          }

          const matchedPaths = await globby(target.src, {
            expandDirectories: false,
            onlyFiles: false,
            ...rest
          })

          if (matchedPaths.length) {
            matchedPaths.forEach((matchedPath) => {
              const generatedCopyTargets = Array.isArray(target.dest)
                ? target.dest.map(dest => generateCopyTarget(matchedPath, dest))
                : [generateCopyTarget(matchedPath, target.dest)]

              copyTargets.push(...generatedCopyTargets)
            })
          }
        }
      }

      if (copyTargets.length) {
        if (verbose) {
          console.log(green('copied:'))
        }

        for (const { src, dest } of copyTargets) {
          await fs.copy(src, dest, rest)

          if (verbose) {
            console.log(green(`  ${bold(src)} → ${bold(dest)}`))
          }
        }
      } else if (verbose) {
        console.log(yellow('no items to copy'))
      }
    }
  }
}
