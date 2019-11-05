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

async function copyFiles(copyTargets, verbose, copyOptions) {
  if (Array.isArray(copyTargets) && copyTargets.length) {
    if (verbose) {
      console.log(green('copied:'))
    }

    for (const { src, dest } of copyTargets) {
      await fs.copy(src, dest, copyOptions)

      if (verbose) {
        console.log(green(`  ${bold(src)} → ${bold(dest)}`))
      }
    }
  } else if (verbose) {
    console.log(yellow('no items to copy'))
  }
}

function watchFiles(targets, verbose, copyOptions) {
  return targets.map(({ src, dest, rename }) => {
    async function onChange(matchedPath) {
      const copyTargets = generateCopyTargets(matchedPath, dest, rename)
      await copyFiles(copyTargets, verbose, copyOptions)
    }

    return chokidar.watch(src, { ignoreInitial: true })
      .on('change', onChange)
      .on('add', onChange)
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
  let watchers = []

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

      await copyFiles(copyTargets, verbose, restPluginOptions)

      if (!copied && !copyOnce && process.env.ROLLUP_WATCH === 'true') {
        watchers = watchFiles(targets, verbose, restPluginOptions)
      }

      copied = true
    },
    _closeWatchers: async () => { // For unit tests
      await Promise.all(watchers.map(watcher => watcher.close()))
    }
  }
}
