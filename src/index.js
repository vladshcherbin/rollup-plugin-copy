/* eslint-disable no-console */
import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import isObject from 'is-plain-object'

function isProbablyFile(filePath) {
  return path.extname(filePath).length > 1
}

function processArrayOfTargets(targets, outputFolder) {
  return targets.map(target => ({
    from: target,
    to: path.join(outputFolder, path.basename(target))
  }))
}

function processObjectOfTargets(targets, outputFolder = '') {
  return Object.entries(targets).map(([from, to]) => {
    const dest = (isProbablyFile(from) && !isProbablyFile(to))
      ? path.join(outputFolder, to, path.basename(from))
      : path.join(outputFolder, to)

    return { from, to: dest }
  })
}

export default function copy(options = { verbose: false }) {
  const { outputFolder, targets, verbose } = options

  return {
    name: 'copy',
    async generateBundle(outputOptions) {
      let processedTargets = []

      if (Array.isArray(targets) && targets.length) {
        const destFolder = outputFolder || outputOptions.dir || path.dirname(outputOptions.file)

        processedTargets = processArrayOfTargets(targets, destFolder)
      }

      if (isObject(targets) && Object.entries(targets).length) {
        processedTargets = processObjectOfTargets(targets, outputFolder)
      }

      if (processedTargets.length) {
        if (verbose) {
          console.log('Copied files and folders:')
        }

        await Promise.all(processedTargets.map(async ({ from, to }) => {
          try {
            await fs.copy(from, to)

            if (verbose) {
              console.log(`${chalk.green(`${from} -> ${to}`)}`)
            }
          } catch (e) {
            this.error(e)
          }
        }))
      }
    }
  }
}
