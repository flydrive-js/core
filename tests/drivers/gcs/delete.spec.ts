/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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

test.group('GCS Driver | delete', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('delete file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })
    await fdgcs.put(key, contents)
    await fdgcs.delete(key)

    const existsResponse = await bucket.file(key).exists()
    assert.isFalse(existsResponse[0])
  })

  test('delete file at nested path', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })
    await fdgcs.put(key, contents)
    await fdgcs.delete(key)

    const existsResponse = await bucket.file(key).exists()
    assert.isFalse(existsResponse[0])
  })

  test('noop when trying to delete a non-existing file', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })
    await fdgcs.delete(key)

    const existsResponse = await bucket.file(key).exists()
    assert.isFalse(existsResponse[0])
  })

  test('noop when trying to delete a directory', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    await fdgcs.put(key, contents)

    /**
     * GCS consider it as a 404 call and hence no error is raised
     */
    await fdgcs.delete('foo/')

    const existsResponse = await bucket.file(key).exists()
    assert.isTrue(existsResponse[0])
  })
})

test.group('GCS Driver | deleteAll', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('delete all files matching the prefix', async ({ assert }) => {
    const key = `foo/${string.random(6)}.txt`
    const anotherKey = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    await fdgcs.put(key, contents)
    await fdgcs.put(anotherKey, contents)

    await fdgcs.deleteAll('foo')
    assert.deepEqual(await bucket.file(key).exists(), [false])
    assert.deepEqual(await bucket.file(anotherKey).exists(), [true])
  })

  test('delete empty folders', async ({ assert }) => {
    const key = `foo/${string.random(6)}.txt`
    const anotherKey = `foo/bar/${string.random(6)}.txt}`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })
    await fdgcs.put(key, contents)
    await fdgcs.put(anotherKey, contents)
    await fdgcs.delete(anotherKey)

    /**
     * Since we have deleted the "foo/bar/hello.txt" file. The
     * "bar" directory will return an empty array of files
     */
    const files = await bucket.getFiles({ prefix: 'foo/bar/' })
    assert.lengthOf(files[0], 0)

    /**
     * Now we have deletes all the files within the bucket.
     */
    await fdgcs.deleteAll('foo')
    const allFiles = await bucket.getFiles()
    assert.lengthOf(allFiles[0], 0)
  })

  test('noop when trying to delete non-existing prefixes', async () => {
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })
    await fdgcs.deleteAll('foo')
  })
})
