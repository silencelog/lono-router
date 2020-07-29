
export function cloneFunction (fn) {
  return function (...args) {
    return fn.call(this, ...args)
  }
}

/**
 * Assertion utility.
 */
export function assert (ok, ...args) {
  if (!ok) {
    throw new Error(args.join(' '))
  }
}
