import type { Options as GlobbyOptions } from 'globby'
import type { CopyOptions, CopySyncOptions, WriteFileOptions } from 'node:fs'
import type { writeFile } from 'node:fs/promises'
import type { AsyncPluginHooks } from 'rollup'

type WriteFileData = Parameters<typeof writeFile>[1]

export type ExternalOptions = CopyOptions
  & CopySyncOptions
  & Exclude<WriteFileOptions, BufferEncoding | null>
  & GlobbyOptions

export interface Target extends GlobbyOptions {
  /**
   * One or more destinations where to copy.
   */
  readonly dest: readonly string[] | string

  /**
   * Change destination file or folder name.
   */
  readonly rename?: ((name: string, extension: string, fullPath: string) => string) | string
  /**
   * Path or glob of what to copy.
   */
  readonly src: readonly string[] | string

  /**
   * Modify file contents.
   */
  readonly transform?: (contents: Buffer, name: string) => Promise<WriteFileData> | WriteFileData
}

export default interface Options extends ExternalOptions {
  /**
   * Copy items once. Useful in watch mode.
   * @default false
   */
  readonly copyOnce?: boolean

  /**
   * Copy items synchronous.
   * @default false
   */
  readonly copySync?: boolean

  /**
   * Remove the directory structure of copied files.
   * @default true
   */
  readonly flatten?: boolean

  /**
   * Rollup hook the plugin should use.
   * @default 'buildEnd'
   */
  readonly hook?: AsyncPluginHooks

  /**
   * Array of targets to copy.
   * @default []
   */
  readonly targets?: readonly Target[]

  /**
   * Output copied items to console.
   * @default false
   */
  readonly verbose?: boolean
}
