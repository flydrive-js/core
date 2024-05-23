/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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

test.group('S3 Driver | delete', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('delete file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.put(key, contents)
    await s3fs.delete(key)

    assert.isFalse(await s3fs.exists(key))
  })

  test('delete file at nested path', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.put(key, contents)
    await s3fs.delete(key)

    assert.isFalse(await s3fs.exists(key))
  })

  test('noop when trying to delete a non-existing file', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.delete(key)

    assert.isFalse(await s3fs.exists(key))
  })

  test('noop when trying to delete a directory', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)

    /**
     * S3 consider it as a 404 call and hence no error is raised
     */
    await s3fs.delete('foo/')
    assert.isTrue(await s3fs.exists(key))
  })
})

test.group('S3 Driver | deleteAll', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('delete all files matching the prefix', async ({ assert }) => {
    const key = `foo/${string.random(6)}.txt`
    const anotherKey = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)
    await s3fs.put(anotherKey, contents)

    await s3fs.deleteAll('foo')
    assert.equal(await s3fs.exists(key), false)
    assert.equal(await s3fs.exists(anotherKey), true)
  })

  test('delete empty folders', async ({ assert }) => {
    const key = `foo/${string.random(6)}.txt`
    const anotherKey = `foo/bar/${string.random(6)}.txt}`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.put(key, contents)
    await s3fs.put(anotherKey, contents)
    await s3fs.delete(anotherKey)

    /**
     * Since we have deleted the "foo/bar/hello.txt" file. The
     * "bar" directory will return an empty array of files
     */
    const files = await s3fs.listAll('foo/bar/')
    assert.lengthOf(Array.from(files.objects), 0)

    /**
     * Now we have deletes all the files within the bucket.
     */
    await s3fs.deleteAll('foo')
    const allFiles = await s3fs.listAll('/')
    assert.lengthOf(Array.from(allFiles.objects), 0)
  })

  test('noop when trying to delete non-existing prefixes', async () => {
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.deleteAll('foo')
  })
})
