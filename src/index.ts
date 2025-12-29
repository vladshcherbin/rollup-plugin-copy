import { isNonEmptyArray } from '@sindresorhus/is'
import { globby } from 'globby'
import type { OutputPlugin } from 'rollup'
import type Options from './types.ts'
import copyTargets from './utilities/copy-targets.ts'
import generateCopyTargets from './utilities/generate-copy-targets.ts'
import validateTarget from './utilities/validate-target.ts'

/**
 * Copy files and folders using Rollup
 */
export default function copy(options: Options = {}): OutputPlugin {
  const {
    copyOnce = false,
    copySync = false,
    flatten = true,
    hook = 'buildEnd',
    targets = [],
    verbose = false,
    ...restPluginOptions
  } = options

  let copied = false

  return {
    name: 'copy',
    // eslint-disable-next-line perfectionist/sort-objects
    [hook]: async () => {
      if (copyOnce && copied) {
        return
      }

      if (isNonEmptyArray(targets)) {
        const targetsToCopy = []

        for (const target of targets) {
          const { dest, rename, src, transform, ...restTargetOptions } = validateTarget(target)
          const matchingPaths = await globby(src, {
            expandDirectories: false,
            onlyFiles: false,
            ...restPluginOptions,
            ...restTargetOptions
          })

          for (const matchingPath of matchingPaths) {
            const generatedCopyTargets = await generateCopyTargets(matchingPath, target, { flatten })

            targetsToCopy.push(...generatedCopyTargets)
          }
        }

        await copyTargets(targetsToCopy, { copySync, verbose }, restPluginOptions)
      }

      // eslint-disable-next-line require-atomic-updates
      copied = true
    }
  }
}
