import { isFunction, isPlainObject, isString, isUndefined } from '@sindresorhus/is'
import type { Target } from '../types.ts'
import stringify from './stringify.ts'

export default function validateTarget(target: Target) {
  if (!isPlainObject(target)) {
    throw new Error(`${stringify(target)} target must be an object`)
  }

  if (!target.src || !target.dest) {
    throw new Error(`${stringify(target)} target must have "src" and "dest" properties`)
  }

  if (!isUndefined(target.rename) && !isString(target.rename) && !isFunction(target.rename)) {
    throw new Error(`${stringify(target)} target's "rename" property must be a string or a function`)
  }

  return target
}
