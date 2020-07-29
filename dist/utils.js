"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloneFunction = cloneFunction;
exports.assert = assert;

function cloneFunction(fn) {
  return function (...args) {
    return fn.call(this, ...args);
  };
}
/**
 * Assertion utility.
 */


function assert(ok, ...args) {
  if (!ok) {
    throw new Error(args.join(' '));
  }
}