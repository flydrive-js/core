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
import { S3Client } from '@aws-sdk/client-s3'

import { S3Driver } from '../../../drivers/s3/driver.js'
import {
  S3_REGION,
  S3_BUCKET,
  S3_ENDPOINT,
  AWS_ACCESS_KEY,
  AWS_ACCESS_SECRET,
  SUPPORTS_ACL,
} from './env.js'
import { deleteS3Objects } from '../../helpers.js'

/**
 * Direct access to S3 client via their SDK
 */
const client = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_ACCESS_SECRET,
  },
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
})

test.group('S3 Driver | get', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('get file contents as a string', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)
    assert.equal(await s3fs.get(key), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await assert.rejects(async () => {
      await s3fs.get(key)
    }, /UnknownError|The specified key does not exist/)
  })
})

test.group('S3 Driver | getBytes', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('get file contents as an arrayBuffer', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)
    assert.equal(new TextDecoder().decode(await s3fs.getBytes(key)), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await assert.rejects(async () => {
      await s3fs.getBytes(key)
    }, /UnknownError|The specified key does not exist/)
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
      const s3fs = new S3Driver({
        visibility: 'public',
        client: client,
        bucket: S3_BUCKET,
        supportsACL: SUPPORTS_ACL,
      })
      await s3fs.put(key, 'Hello world')
      assert.equal(new TextDecoder().decode(await s3fs.getBytes(key, { range })), expected)
    })

  test('throws E_RANGE_UNSATISFIABLE - {label}')
    .with([
      { label: 'invalid range syntax', range: { start: -1 } },
      { label: 'range exceeds file size', range: { start: 0, end: 99999 } },
      { label: 'start exceeds file size', range: { start: 99999 } },
    ])
    .run(async ({ assert }, { range }) => {
      const key = `${string.random(6)}.txt`
      const s3fs = new S3Driver({
        visibility: 'public',
        client: client,
        bucket: S3_BUCKET,
        supportsACL: SUPPORTS_ACL,
      })
      await s3fs.put(key, 'Hello world')
      await assert.rejects(
        async () => s3fs.getBytes(key, { range }),
        /The specified range is invalid or exceeds the file size/
      )
    })
})

test.group('S3 Driver | getStream', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('get file contents as a stream', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)
    assert.equal(await getStream(await s3fs.getStream(key)), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await assert.rejects(async () => {
      await getStream(await s3fs.getStream(key))
    }, /UnknownError|The specified key does not exist/)
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
      const s3fs = new S3Driver({
        visibility: 'public',
        client: client,
        bucket: S3_BUCKET,
        supportsACL: SUPPORTS_ACL,
      })
      await s3fs.put(key, 'Hello world')
      assert.equal(await getStream(await s3fs.getStream(key, { range })), expected)
    })

  test('throws E_RANGE_UNSATISFIABLE - {label}')
    .with([
      { label: 'invalid range syntax', range: { start: -1 } },
      { label: 'range exceeds file size', range: { start: 0, end: 99999 } },
      { label: 'start exceeds file size', range: { start: 99999 } },
    ])
    .run(async ({ assert }, { range }) => {
      const key = `${string.random(6)}.txt`
      const s3fs = new S3Driver({
        visibility: 'public',
        client: client,
        bucket: S3_BUCKET,
        supportsACL: SUPPORTS_ACL,
      })
      await s3fs.put(key, 'Hello world')
      await assert.rejects(
        async () => s3fs.getStream(key, { range }),
        /The specified range is invalid or exceeds the file size/
      )
    })
})
