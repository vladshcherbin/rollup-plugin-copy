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
  const processedTargets = [];
  Object.entries(targets).forEach(([from, to]) => {
    if (Array.isArray(to)) {
      to.forEach(eachTo => {
        processedTargets.push({
          from,
          to: eachTo,
        })
      })
    } else {
      processedTargets.push({
        from,
        to
      })
    }
  });
  return processedTargets;
}

export default function copy(options = {}) {
  const {
    outputFolder,
    targets = [],
    verbose = false,
    warnOnNonExist = false,
    ...rest
  } = options

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
            await fs.copy(from, to, rest)

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
