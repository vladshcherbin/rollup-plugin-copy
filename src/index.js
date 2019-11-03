/* eslint-disable no-await-in-loop, no-console, no-restricted-syntax */
import path from 'path'
import util from 'util'
import fs from 'fs-extra'
import isObject from 'is-plain-object'
import globby from 'globby'
import { bold, green, yellow } from 'colorette'
import chokidar from 'chokidar'

function stringify(value) {
  return util.inspect(value, { breakLength: Infinity })
}

function renameTarget(target, rename) {
  const parsedPath = path.parse(target)

  return typeof rename === 'string'
    ? rename
    : rename(parsedPath.name, parsedPath.ext.replace('.', ''))
}

function generateCopyTarget(src, dest, rename) {
  const basename = path.basename(src)

  return {
    src,
    dest: path.join(dest, rename ? renameTarget(basename, rename) : basename)
  }
}

function generateCopyTargets(src, dest, rename) {
  return Array.isArray(dest)
    ? dest.map(destination => generateCopyTarget(src, destination, rename))
    : [generateCopyTarget(src, dest, rename)]
}

async function copyFiles(copyTargets, verbose, restPluginOptions) {
  if (Array.isArray(copyTargets) && copyTargets.length) {
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
}

function watchFiles(targets, verbose, restPluginOptions) {
  const watchers = targets.map((target) => {
    const watcher = chokidar.watch(target.src, {
      ignoreInitial: true
    })

    const { dest, rename } = target

    async function onChange(matchedPath) {
      console.log('file changed')
      const copyTargets = generateCopyTargets(matchedPath, dest, rename)
      await copyFiles(copyTargets, verbose, restPluginOptions)
    }

    watcher.on('change', onChange)
    watcher.on('add', onChange)

    return watcher
  })

  process.on('SIGINT', async () => {
    console.log('CLOSE WATCHERS', watchers)
    await Promise.all(watchers.forEach(watcher => watcher.close()))
  })
}

function verifyTargets(targets) {
  if (Array.isArray(targets) && targets.length) {
    for (const target of targets) {
      if (!isObject(target)) {
        throw new Error(`${stringify(target)} target must be an object`)
      }

      const { src, dest, rename } = target

      if (!src || !dest) {
        throw new Error(`${stringify(target)} target must have "src" and "dest" properties`)
      }

      if (rename && typeof rename !== 'string' && typeof rename !== 'function') {
        throw new Error(`${stringify(target)} target's "rename" property must be a string or a function`)
      }
    }
  }
}

export default function copy(options = {}) {
  const {
    copyOnce = false,
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    ...restPluginOptions
  } = options

  let copied = false

  verifyTargets(targets)

  return {
    name: 'copy',
    [hook]: async () => {
      if (copyOnce && copied) {
        return
      }

      const copyTargets = []

      if (Array.isArray(targets) && targets.length) {
        for (const target of targets) {
          const { src, dest, rename, ...restTargetOptions } = target

          const matchedPaths = await globby(src, {
            expandDirectories: false,
            onlyFiles: false,
            ...restPluginOptions,
            ...restTargetOptions
          })

          if (matchedPaths.length) {
            matchedPaths.forEach((matchedPath) => {
              copyTargets.push(...generateCopyTargets(matchedPath, dest, rename))
            })
          }
        }
      }

      console.log('copying all files')
      await copyFiles(copyTargets, verbose, restPluginOptions)

      if (!copied && !copyOnce && process.env.ROLLUP_WATCH) {
        watchFiles(targets, verbose, restPluginOptions)
      }

      copied = true
    }
  }
}
