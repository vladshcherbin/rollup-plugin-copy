/* eslint-disable no-await-in-loop, no-console, no-restricted-syntax */
import path from 'path'
import util from 'util'
import fs from 'fs-extra'
import globby from 'globby'
import isObject from 'is-plain-object'
import chalk from 'chalk'

function stringify(target) {
  return util.inspect(target, { breakLength: Infinity })
}

async function processTarget(src, dest, options) {
  const matchedPaths = await globby(src, { expandDirectories: false, onlyFiles: false, ...options })

  return !matchedPaths.length
    ? [{ src, dest, nonExist: true }]
    : matchedPaths.map(matchedPath => ({
      src: matchedPath,
      dest: path.join(dest, path.basename(matchedPath))
    }))
}

export default function copy(options = {}) {
  const {
    hook = 'buildEnd',
    outputFolder,
    targets = [],
    verbose = false,
    warnOnNonExist = false,
    ...rest
  } = options

  return {
    name: 'copy',
    async [hook]() {
      const itemsToCopy = []

      if (Array.isArray(targets) && targets.length) {
        for (const target of targets) {
          if (isObject(target)) {
            if (!target.src || !target.dest) {
              this.error(`'src' or 'dest' is not set in ${stringify(target)}`)
            }

            itemsToCopy.push(...await processTarget(target.src, target.dest, rest))
          } else {
            if (!outputFolder) {
              this.error(`'outputFolder' is not set for ${stringify(target)}`)
            }

            itemsToCopy.push(...await processTarget(target, outputFolder, rest))
          }
        }
      }

      if (itemsToCopy.length) {
        if (verbose) {
          console.log('Copied files and folders:')
        }

        for (const { src, dest, nonExist } of itemsToCopy) {
          try {
            if (!nonExist) {
              await fs.copy(src, dest, rest)

              if (verbose) {
                console.log(chalk.green(`${stringify(src)} -> ${stringify(dest)}`))
              }
            } else {
              if (verbose) {
                console.log(chalk.red(`${stringify(src)} -> ${stringify(dest)} (no items to copy)`))
              }

              if (warnOnNonExist) {
                this.warn(`No items to copy - ${stringify(src)} -> ${stringify(dest)}`)
              }
            }
          } catch (e) {
            this.error(e)
          }
        }
      }
    }
  }
}
