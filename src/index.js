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
  return Object.entries(targets).reduce((processedTargets, [from, to]) => (
    Array.isArray(to)
      ? [...processedTargets, ...to.map(target => ({ from, to: target }))]
      : [...processedTargets, { from, to }]
  ), [])
}

export default function copy(options = {}) {
  const {
    outputFolder,
    targets = [],
    verbose = false,
    warnOnNonExist = false,
    ...rest
  } = options

  let alreadyCopyTargets = []
  return {
    name: 'copy',
    watchChange() {
      alreadyCopyTargets = []
    },
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
            // skip already copy targets
            if (alreadyCopyTargets.find(target => target.from === from && target.to === to)) {
              return
            }
            alreadyCopyTargets.push({ from, to })
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
