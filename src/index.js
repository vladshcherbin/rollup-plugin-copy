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

function generateCopyTarget(src, dest, { flatten, rename, transform }) {
  const { dir, base } = path.parse(src)
  const destinationFolder = (flatten || (!flatten && !dir))
    ? dest
    : dir.replace(dir.split('/')[0], dest)

  let contents = null
  if (transform) {
    if (!fs.lstatSync(src).isDirectory()) {
      contents = transform(fs.readFileSync(src))
    } else {
      console.log(yellow(`\`transform\` option only works on files, not on directories (received ${src})`))
    }
  }

  return {
    src,
    dest: path.join(destinationFolder, rename ? renameTarget(base, rename) : base),
    contents
  }
}

export default function copy(options = {}) {
  const {
    copyOnce = false,
    flatten = true,
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    ...restPluginOptions
  } = options

  let copied = false

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

          const { src, dest, rename, transform, ...restTargetOptions } = target

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
                ? dest.map((destination) => generateCopyTarget(
                  matchedPath,
                  destination,
                  { flatten, rename, transform }
                ))
                : [generateCopyTarget(matchedPath, dest, { flatten, rename, transform })]

              copyTargets.push(...generatedCopyTargets)
            })
          }
        }
      }

      if (copyTargets.length) {
        if (verbose) {
          console.log(green('copied:'))
        }

        for (const { src, dest, contents } of copyTargets) {
          if (contents) {
            await fs.outputFile(dest, contents, restPluginOptions)
          } else {
            await fs.copy(src, dest, restPluginOptions)
          }

          if (verbose) {
            console.log(green(`  ${bold(src)} → ${bold(dest)}${contents ? ' (transformed)' : ''}`))
          }
        }
      } else if (verbose) {
        console.log(yellow('no items to copy'))
      }

      copied = true
    }
  }
}
