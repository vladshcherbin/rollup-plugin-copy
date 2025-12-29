import util from 'node:util'

export default function stringify(value: unknown) {
  return util.inspect(value, { breakLength: Infinity })
}
