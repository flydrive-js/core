/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import * as errors from './errors.js'
import type { RangeRequest } from './types.js'

/**
 * Returns true if the range has at least one bound defined.
 * Guards against empty range objects being treated as ranged reads.
 */
export function isRangeRequest(range?: RangeRequest): range is RangeRequest {
  return range !== undefined && (range.start !== undefined || range.end !== undefined)
}

/**
 * Validates the syntax of a range request. Checks for negative values,
 * non-integers, and start > end. Should be called before any I/O.
 */
export function validateRangeRequest(key: string, range: RangeRequest): void {
  const { start, end } = range

  if (start !== undefined && (!Number.isInteger(start) || start < 0)) {
    throw new errors.E_RANGE_UNSATISFIABLE([key])
  }

  if (end !== undefined && (!Number.isInteger(end) || end < 0)) {
    throw new errors.E_RANGE_UNSATISFIABLE([key])
  }

  if (start !== undefined && end !== undefined && start > end) {
    throw new errors.E_RANGE_UNSATISFIABLE([key])
  }
}

/**
 * Validates that the range falls within the known content length.
 * Should be called after a preflight stat or metadata fetch.
 */
export function validateRangeSatisfiable(
  key: string,
  range: RangeRequest,
  contentLength: number
): void {
  const { start, end } = range

  if (start !== undefined && start >= contentLength) {
    throw new errors.E_RANGE_UNSATISFIABLE([key])
  }

  if (end !== undefined && end >= contentLength) {
    throw new errors.E_RANGE_UNSATISFIABLE([key])
  }
}
