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

export default function copy(options = {}) {
  const {
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    ...rest
  } = options

  return {
    name: 'copy',
    async [hook]() {
      const itemsToCopy = []

      if (Array.isArray(targets) && targets.length) {
        for (const target of targets) {
          if (!isObject(target)) {
            this.error(`target should be an object - ${stringify(target)}`)
          }

          if (!target.src || !target.dest) {
            this.error(`'src' or 'dest' is not set in ${stringify(target)}`)
          }

          const matchedPaths = await globby(target.src, {
            expandDirectories: false,
            onlyFiles: false,
            ...rest
          })

          if (matchedPaths.length) {
            matchedPaths.forEach((matchedPath) => {
              itemsToCopy.push({
                src: matchedPath,
                dest: path.join(target.dest, path.basename(matchedPath))
              })
            })
          }
        }
      }

      if (itemsToCopy.length) {
        if (verbose) {
          console.log('Copied files and folders:')
        }

        for (const { src, dest } of itemsToCopy) {
          try {
            await fs.copy(src, dest, rest)

            if (verbose) {
              console.log(chalk.green(`${src} -> ${dest}`))
            }
          } catch (e) {
            this.error(e)
          }
        }
      } else if (verbose) {
        console.log('No items to copy')
      }
    }
  }
}
