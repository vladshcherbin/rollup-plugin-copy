/* eslint-disable no-await-in-loop, no-console, no-restricted-syntax */
import path from 'path'
import util from 'util'
import fs from 'fs-extra'
import isObject from 'is-plain-object'
import globby from 'globby'
import { bold, green, yellow } from 'colorette'

function stringify(value) {
  return util.inspect(value, { breakLength: Infinity })
}

function renameTarget(target, rename) {
  const parsedPath = path.parse(target)

  return typeof rename === 'string'
    ? rename
    : rename(parsedPath.name, parsedPath.ext.replace('.', ''))
}

function generateFlattenedCopyTarget(src, dest, rename) {
  const basename = path.basename(src)
  return {
    src,
    dest: path.join(dest, rename ? renameTarget(basename, rename) : basename)
  }
}

function generateCopyTarget(src, dest) {
  const root = src.split('/')[0]

  return {
    src,
    dest: src.replace(root, dest)
  }
}

export default function copy(options = {}) {
  const {
    copyOnce = false,
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    flatten = true,
    ...restPluginOptions
  } = options

  let copied = false
  let generateCopy = generateFlattenedCopyTarget
  if (!flatten) {
    generateCopy = generateCopyTarget
  }

  return {
    name: 'copy',
    [hook]: async () => {
      if (copyOnce && copied) {
        return
      }

      const copyTargets = []

      if (Array.isArray(targets) && targets.length) {
        for (const target of targets) {
          if (!isObject(target)) {
            throw new Error(`${stringify(target)} target must be an object`)
          }

          const { src, dest, rename, ...restTargetOptions } = target

          if (!src || !dest) {
            throw new Error(`${stringify(target)} target must have "src" and "dest" properties`)
          }

          if (rename && typeof rename !== 'string' && typeof rename !== 'function') {
            throw new Error(`${stringify(target)} target's "rename" property must be a string or a function`)
          }

          const matchedPaths = await globby(src, {
            expandDirectories: false,
            onlyFiles: false,
            ...restPluginOptions,
            ...restTargetOptions
          })

          if (matchedPaths.length) {
            matchedPaths.forEach((matchedPath) => {
              const generatedCopyTargets = Array.isArray(dest)
                ? dest.map(destination => generateCopy(
                  matchedPath,
                  destination,
                  rename
                ))
                : [generateCopy(matchedPath, dest, rename)]

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
          await fs.copy(src, dest, restPluginOptions)

          if (verbose) {
            console.log(green(`  ${bold(src)} → ${bold(dest)}`))
          }
        }
      } else if (verbose) {
        console.log(yellow('no items to copy'))
      }

      copied = true
    }
  }
}
