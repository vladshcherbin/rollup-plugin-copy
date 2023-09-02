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

async function isFile(filePath) {
  const fileStats = await fs.stat(filePath)

  return fileStats.isFile()
}

function renameTarget(target, rename, src) {
  const parsedPath = path.parse(target)

  return typeof rename === 'string'
    ? rename
    : rename(parsedPath.name, parsedPath.ext.replace('.', ''), src)
}

async function generateCopyTarget(src, dest, { flatten, rename, transform }) {
  if (transform && !await isFile(src)) {
    throw new Error(`"transform" option works only on files: '${src}' must be a file`)
  }

  const { base, dir } = path.parse(src)
  const destinationFolder = (flatten || (!flatten && !dir))
    ? dest
    : dir.replace(dir.split('/')[0], dest)

  return {
    src,
    dest: path.join(destinationFolder, rename ? renameTarget(base, rename, src) : base),
    ...(transform && { contents: await transform(await fs.readFile(src), src) }),
    renamed: rename,
    transformed: transform
  }
}

export default function copy(options = {}) {
  const {
    copyOnce = false,
    copySync = false,
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

          const { dest, rename, src, transform, ...restTargetOptions } = target

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
            for (const matchedPath of matchedPaths) {
              const generatedCopyTargets = Array.isArray(dest)
                ? await Promise.all(dest.map((destination) => generateCopyTarget(
                  matchedPath,
                  destination,
                  { flatten, rename, transform }
                )))
                : [await generateCopyTarget(matchedPath, dest, { flatten, rename, transform })]

              copyTargets.push(...generatedCopyTargets)
            }
          }
        }
      }

      if (copyTargets.length) {
        if (verbose) {
          console.log(green('copied:'))
        }

        for (const copyTarget of copyTargets) {
          const { contents, dest, src, transformed } = copyTarget

          if (transformed) {
            await fs.outputFile(dest, contents, restPluginOptions)
          } else if (!copySync) {
            await fs.copy(src, dest, restPluginOptions)
          } else {
            fs.copySync(src, dest, restPluginOptions)
          }

          if (verbose) {
            let message = green(`  ${bold(src)} → ${bold(dest)}`)
            const flags = Object.entries(copyTarget)
              .filter(([key, value]) => ['renamed', 'transformed'].includes(key) && value)
              .map(([key]) => key.charAt(0).toUpperCase())

            if (flags.length) {
              message = `${message} ${yellow(`[${flags.join(', ')}]`)}`
            }

            console.log(message)
          }
        }
      } else if (verbose) {
        console.log(yellow('no items to copy'))
      }

      copied = true
    }
  }
}
