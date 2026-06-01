/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import {
  isRangeRequest,
  validateRangeRequest,
  validateRangeSatisfiable,
} from '../../src/range_utils.js'

test.group('isRangeRequest', () => {
  test('returns false for undefined', ({ assert }) => {
    assert.isFalse(isRangeRequest(undefined))
  })

  test('returns false for empty object', ({ assert }) => {
    assert.isFalse(isRangeRequest({}))
  })

  test('returns true when start is defined', ({ assert }) => {
    assert.isTrue(isRangeRequest({ start: 0 }))
  })

  test('returns true when end is defined', ({ assert }) => {
    assert.isTrue(isRangeRequest({ end: 10 }))
  })

  test('returns true when both start and end are defined', ({ assert }) => {
    assert.isTrue(isRangeRequest({ start: 0, end: 10 }))
  })
})

test.group('validateRangeRequest', () => {
  test('throws for negative start', ({ assert }) => {
    assert.throws(
      () => validateRangeRequest('foo.txt', { start: -1 }),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws for negative end', ({ assert }) => {
    assert.throws(
      () => validateRangeRequest('foo.txt', { end: -1 }),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws for non-integer start', ({ assert }) => {
    assert.throws(
      () => validateRangeRequest('foo.txt', { start: 1.5 }),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws for non-integer end', ({ assert }) => {
    assert.throws(
      () => validateRangeRequest('foo.txt', { end: 1.5 }),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws when start is greater than end', ({ assert }) => {
    assert.throws(
      () => validateRangeRequest('foo.txt', { start: 10, end: 5 }),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('passes for valid start and end', ({ assert }) => {
    assert.doesNotThrow(() => validateRangeRequest('foo.txt', { start: 0, end: 10 }))
  })

  test('passes when start equals end (single byte)', ({ assert }) => {
    assert.doesNotThrow(() => validateRangeRequest('foo.txt', { start: 5, end: 5 }))
  })

  test('passes for start only', ({ assert }) => {
    assert.doesNotThrow(() => validateRangeRequest('foo.txt', { start: 0 }))
  })

  test('passes for end only', ({ assert }) => {
    assert.doesNotThrow(() => validateRangeRequest('foo.txt', { end: 10 }))
  })
})

test.group('validateRangeSatisfiable', () => {
  test('throws when start equals content length', ({ assert }) => {
    assert.throws(
      () => validateRangeSatisfiable('foo.txt', { start: 10 }, 10),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws when start exceeds content length', ({ assert }) => {
    assert.throws(
      () => validateRangeSatisfiable('foo.txt', { start: 11 }, 10),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws when end equals content length', ({ assert }) => {
    assert.throws(
      () => validateRangeSatisfiable('foo.txt', { end: 10 }, 10),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('throws when end exceeds content length', ({ assert }) => {
    assert.throws(
      () => validateRangeSatisfiable('foo.txt', { end: 11 }, 10),
      /The specified range is invalid or exceeds the file size/
    )
  })

  test('passes for in-bounds range', ({ assert }) => {
    assert.doesNotThrow(() => validateRangeSatisfiable('foo.txt', { start: 0, end: 9 }, 10))
  })

  test('passes for start at last valid byte', ({ assert }) => {
    assert.doesNotThrow(() => validateRangeSatisfiable('foo.txt', { start: 9 }, 10))
  })
})
