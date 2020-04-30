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


/**
 * @param {string} targetFilePath
 * @param {string|(fileName: string, fileExt: string): string} rename
 */

function renameTarget(targetFilePath, rename) {
  const parsedPath = path.parse(targetFilePath)
  if (typeof rename === 'string') return rename
  return rename(parsedPath.name, parsedPath.ext.replace(/^(\.)?/, ''))
}


/**
 * @param {string}  src
 * @param {string}  dest
 * @param {boolean} options.flatten
 * @param {string|((fileName: string, fileExt: string) => string)} options.rename
 * @param {(
 *          content: string|ArrayBuffer,
 *          srcPath: string,
 *          destPath: string
 *        ): string|ArrayBuffer} options.transform
 */
async function generateCopyTarget(src, dest, options) {
  const { flatten, rename, transform } = options
  if (transform && !await isFile(src)) {
    throw new Error(`"transform" option works only on files: '${src}' must be a file`)
  }

  const { base, dir } = path.parse(src)
  const destinationFolder = (flatten || (!flatten && !dir))
    ? dest
    : dir.replace(dir.split('/')[0], dest)

  const destFilePath = path.join(destinationFolder, rename ? renameTarget(base, rename) : base)
  const result = {
    src,
    dest: destFilePath,
    renamed: Boolean(rename),
    transformed: false
  }

  if (transform) {
    result.contents = await transform(await fs.readFile(src), src, destFilePath)
    result.transformed = true
  }
  return result
}


export default function copy(options = {}) {
  const {
    copyOnce = false,
    flatten = true,
    hook = 'buildEnd',
    watchHook = 'buildStart',
    targets = [],
    verbose: shouldBeVerbose = false,
    ...restPluginOptions
  } = options

  const log = {
    /**
     * print verbose messages
     * @param {string|() => string} message
     */
    verbose(message) {
      if (!shouldBeVerbose) return
      if (typeof message === 'function') {
        // eslint-disable-next-line no-param-reassign
        message = message()
      }
      console.log(message)
    }
  }

  let copied = false
  let copyTargets = []

  async function collectAndWatchingTargets() {
    const self = this
    if (copyOnce && copied) {
      return
    }

    // Recollect copyTargets
    copyTargets = []
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
            const destinations = Array.isArray(dest) ? dest : [dest]
            const generatedCopyTargets = await Promise.all(
              destinations.map((destination) => generateCopyTarget(
                matchedPath,
                destination,
                { flatten, rename, transform }
              ))
            )
            copyTargets.push(...generatedCopyTargets)
          }
        }
      }
    }

    /**
     * Watching source files
     */
    for (const target of copyTargets) {
      const srcPath = path.resolve(target.src)
      self.addWatchFile(srcPath)
    }
  }

  /**
   * Do copy operation
   */
  async function handleCopy() {
    if (copyOnce && copied) {
      return
    }

    if (copyTargets.length) {
      log.verbose(green('copied:'))

      for (const copyTarget of copyTargets) {
        const { contents, dest, src, transformed } = copyTarget

        if (transformed) {
          await fs.outputFile(dest, contents, restPluginOptions)
        } else {
          await fs.copy(src, dest, restPluginOptions)
        }

        log.verbose(() => {
          let message = green(`  ${bold(src)} → ${bold(dest)}`)
          const flags = Object.entries(copyTarget)
            .filter(([key, value]) => ['renamed', 'transformed'].includes(key) && value)
            .map(([key]) => key.charAt(0).toUpperCase())

          if (flags.length) {
            message = `${message} ${yellow(`[${flags.join(', ')}]`)}`
          }

          return message
        })
      }
    } else {
      log.verbose(yellow('no items to copy'))
    }

    copied = true
  }

  const plugin = {
    name: 'copy',
    async [watchHook](...args) {
      const self = this
      await collectAndWatchingTargets.call(self, ...args)

      /**
       * Merge handleCopy and collectAndWatchingTargets
       */
      if (hook === watchHook) {
        await handleCopy.call(self, ...args)
      }
    }
  }

  if (hook !== watchHook) {
    plugin[hook] = handleCopy
  }
  return plugin
}
