/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getStream from 'get-stream'
import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { Storage } from '@google-cloud/storage'
import { GCS_BUCKET, GCS_KEY } from './env.js'
import { GCSDriver } from '../../../drivers/gcs/driver.js'

/**
 * Direct access to Google cloud storage bucket
 * via their SDK
 */
const bucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_BUCKET)

test.group('GCS Driver | get', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get file contents as a string', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    assert.equal(await fdgcs.get(key), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await fdgcs.get(key)
    }, /No such object:/)
  })
})

test.group('GCS Driver | getBytes', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get file contents as an arrayBuffer', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    assert.equal(new TextDecoder().decode(await fdgcs.getBytes(key)), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await fdgcs.getBytes(key)
    }, /No such object:/)
  })

  test('get file contents for range - {label}')
    .with([
      { label: 'start and end', range: { start: 3, end: 7 }, expected: 'lo wo' },
      { label: 'start only', range: { start: 6 }, expected: 'world' },
      { label: 'end only', range: { end: 4 }, expected: 'Hello' },
      { label: 'single byte', range: { start: 0, end: 0 }, expected: 'H' },
      { label: 'empty object', range: {}, expected: 'Hello world' },
    ])
    .run(async ({ assert }, { range, expected }) => {
      const key = `${string.random(6)}.txt`
      const fdgcs = new GCSDriver({
        visibility: 'public',
        bucket: GCS_BUCKET,
        credentials: GCS_KEY,
        usingUniformAcl: true,
      })
      await fdgcs.put(key, 'Hello world')
      assert.equal(new TextDecoder().decode(await fdgcs.getBytes(key, { range })), expected)
    })

  test('throws E_RANGE_UNSATISFIABLE - {label}')
    .with([
      { label: 'invalid range syntax', range: { start: -1 } },
      { label: 'range exceeds file size', range: { start: 0, end: 99999 } },
      { label: 'start exceeds file size', range: { start: 99999 } },
    ])
    .run(async ({ assert }, { range }) => {
      const key = `${string.random(6)}.txt`
      const fdgcs = new GCSDriver({
        visibility: 'public',
        bucket: GCS_BUCKET,
        credentials: GCS_KEY,
        usingUniformAcl: true,
      })
      await fdgcs.put(key, 'Hello world')
      await assert.rejects(
        async () => fdgcs.getBytes(key, { range }),
        /The specified range is invalid or exceeds the file size/
      )
    })
})

test.group('GCS Driver | getStream', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get file contents as a stream', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    assert.equal(await getStream(await fdgcs.getStream(key)), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await getStream(await fdgcs.getStream(key))
    }, /No such object:/)
  })

  test('get file contents for range - {label}')
    .with([
      { label: 'start and end', range: { start: 3, end: 7 }, expected: 'lo wo' },
      { label: 'start only', range: { start: 6 }, expected: 'world' },
      { label: 'end only', range: { end: 4 }, expected: 'Hello' },
      { label: 'single byte', range: { start: 0, end: 0 }, expected: 'H' },
      { label: 'empty object', range: {}, expected: 'Hello world' },
    ])
    .run(async ({ assert }, { range, expected }) => {
      const key = `${string.random(6)}.txt`
      const fdgcs = new GCSDriver({
        visibility: 'public',
        bucket: GCS_BUCKET,
        credentials: GCS_KEY,
        usingUniformAcl: true,
      })
      await fdgcs.put(key, 'Hello world')
      assert.equal(await getStream(await fdgcs.getStream(key, { range })), expected)
    })

  test('throws E_RANGE_UNSATISFIABLE - {label}')
    .with([
      { label: 'invalid range syntax', range: { start: -1 } },
      { label: 'range exceeds file size', range: { start: 0, end: 99999 } },
      { label: 'start exceeds file size', range: { start: 99999 } },
    ])
    .run(async ({ assert }, { range }) => {
      const key = `${string.random(6)}.txt`
      const fdgcs = new GCSDriver({
        visibility: 'public',
        bucket: GCS_BUCKET,
        credentials: GCS_KEY,
        usingUniformAcl: true,
      })
      await fdgcs.put(key, 'Hello world')
      await assert.rejects(
        async () => fdgcs.getStream(key, { range }),
        /The specified range is invalid or exceeds the file size/
      )
    })
})
