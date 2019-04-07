/* eslint-disable no-console */
import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import isObject from 'is-plain-object'

function processArrayOfTargets(targets, outputFolder) {
  return targets.map(target => ({
    from: target,
    to: path.join(outputFolder, path.basename(target))
  }))
}

function processObjectOfTargets(targets) {
  return Object.entries(targets).map(([from, to]) => ({
    from,
    to
  }))
}

export default function copy(options = {}) {
  const targets = options.targets || []
  const { outputFolder } = options
  const verbose = options.verbose || false
  const warnOnNonExist = options.warnOnNonExist || false

  return {
    name: 'copy',
    async generateBundle(outputOptions) {
      let processedTargets = []

      if (Array.isArray(targets) && targets.length) {
        const destFolder = outputFolder || outputOptions.dir || path.dirname(outputOptions.file)

        processedTargets = processArrayOfTargets(targets, destFolder)
      }

      if (isObject(targets) && Object.entries(targets).length) {
        processedTargets = processObjectOfTargets(targets)
      }

      if (processedTargets.length) {
        if (verbose) {
          console.log('Copied files and folders:')
        }

        await Promise.all(processedTargets.map(async ({ from, to }) => {
          try {
            await fs.copy(from, to)

            if (verbose) {
              console.log(chalk.green(`${from} -> ${to}`))
            }
          } catch (e) {
            if (e.code === 'ENOENT') {
              if (verbose) {
                console.log(chalk.red(`${from} -> ${to} (no such file or folder: ${e.path})`))
              }

              if (warnOnNonExist) {
                this.warn(e)
              }
            } else {
              this.error(e)
            }
          }
        }))
      }
    }
  }
}
