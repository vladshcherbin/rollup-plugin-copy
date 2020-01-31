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

function renameTarget(target, rename) {
  const parsedPath = path.parse(target)

  return typeof rename === 'string'
    ? rename
    : rename(parsedPath.name, parsedPath.ext.replace('.', ''))
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
    dest: path.join(destinationFolder, rename ? renameTarget(base, rename) : base),
    ...(transform && { contents: await transform(await fs.readFile(src)) }),
    renamed: rename,
    transformed: transform
  }
}

export default function copy(options = {}) {
  const {
    copyOnce = false,
    flatten = true,
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    ...restPluginOptions
  } = options

  let copied = false

  return {
    name: 'copy',
    buildStart() {
      if (Array.isArray(targets)) {
        for (const target of targets) {
          if (!isObject(target)) {
            throw new Error(`${stringify(target)} target must be an object`);
          }

          const {
            src,
            dest,
            rename,
            ...restTargetOptions
          } = target;

          if (!src || !dest) {
            throw new Error(`${stringify(target)} target must have "src" and "dest" properties`);
          }

          if (rename && typeof rename !== 'string' && typeof rename !== 'function') {
            throw new Error(`${stringify(target)} target's "rename" property must be a string or a function`);
          }

          const matchedPaths = globby.sync(src, {
            expandDirectories: false,
            onlyFiles: false,
            ...restPluginOptions,
            ...restTargetOptions
          });

          if (matchedPaths.length) {
            matchedPaths.forEach(matchedPath => {
              const generatedCopyTargets = Array.isArray(dest) ? dest.map(destination => generateCopyTarget(matchedPath, destination, rename)) : [generateCopyTarget(matchedPath, dest, rename)];
              copyTargets.push(...generatedCopyTargets);
            });
          }
        }
      }

      const targetSources = copyTargets.map(({ src }) => path.resolve(src));
      targetSources.forEach(target => {
        this.addWatchFile(target);
      });
    },

    [hook]: async () => {
      if (copyOnce && copied) {
        return;
      }

      if (copyTargets.length) {
        if (verbose) {
          console.log(green('copied:'));
        }

        for (const {
          src,
          dest
        } of copyTargets) {
          await fs.copy(src, dest, restPluginOptions);

          if (verbose) {
            console.log(green(`  ${bold(src)} → ${bold(dest)}`));
          }
        }
      } else if (verbose) {
        console.log(yellow('no items to copy'));
      }

      copied = true;
    }
}
