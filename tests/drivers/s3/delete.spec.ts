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
import { S3Client } from '@aws-sdk/client-s3'

import { S3Driver } from '../../../drivers/s3/driver.js'
import {
  S3_REGION,
  S3_BUCKET,
  S3_ENDPOINT,
  AWS_ACCESS_KEY,
  AWS_ACCESS_SECRET,
  deleteS3Objects,
} from '../../helpers.js'

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
      await deleteS3Objects(client, '/')
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
    })
    await s3fs.put(key, contents)
    await s3fs.delete(key)

    assert.isFalse(await s3fs.exist(key))
  })

  test('delete file at nested path', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })
    await s3fs.put(key, contents)
    await s3fs.delete(key)

    assert.isFalse(await s3fs.exist(key))
  })

  test('noop when trying to delete a non-existing file', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })
    await s3fs.delete(key)

    assert.isFalse(await s3fs.exist(key))
  })

  test('noop when trying to delete a directory', async ({ assert }) => {
    const key = `foo/bar/${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })

    await s3fs.put(key, contents)

    /**
     * S3 consider it as a 404 call and hence no error is raised
     */
    await s3fs.delete('foo/')
    assert.isTrue(await s3fs.exist(key))
  })
})

// test.group('S3 Driver | deleteAll', (group) => {
//   group.each.setup(() => {
//     return async () => {
//       await bucket.deleteFiles()
//     }
//   })
//   group.each.timeout(10_000)

//   test('delete all files matching the prefix', async ({ assert }) => {
//     const key = `foo/${string.random(6)}.txt`
//     const anotherKey = `${string.random(6)}.txt`
//     const contents = 'Hello world'

//     const s3fs = new S3Driver({
//       visibility: 'public',
//       client: client,
//       bucket: S3_BUCKET,
//     })

//     await s3fs.put(key, contents)
//     await s3fs.put(anotherKey, contents)

//     await s3fs.deleteAll('foo')
//     assert.deepEqual(await bucket.file(key).exists(), [false])
//     assert.deepEqual(await bucket.file(anotherKey).exists(), [true])
//   })

//   test('delete empty folders', async ({ assert }) => {
//     const key = `foo/${string.random(6)}.txt`
//     const anotherKey = `foo/bar/${string.random(6)}.txt}`
//     const contents = 'Hello world'

//     const s3fs = new S3Driver({
//       visibility: 'public',
//       client: client,
//       bucket: S3_BUCKET,
//     })
//     await s3fs.put(key, contents)
//     await s3fs.put(anotherKey, contents)
//     await s3fs.delete(anotherKey)

//     /**
//      * Since we have deleted the "foo/bar/hello.txt" file. The
//      * "bar" directory will return an empty array of files
//      */
//     const files = await bucket.getFiles({ prefix: 'foo/bar/' })
//     assert.lengthOf(files[0], 0)

//     /**
//      * Now we have deletes all the files within the bucket.
//      */
//     await s3fs.deleteAll('foo')
//     const allFiles = await bucket.getFiles()
//     assert.lengthOf(allFiles[0], 0)
//   })

//   test('noop when trying to delete non-existing prefixes', async () => {
//     const s3fs = new S3Driver({
//       visibility: 'public',
//       client: client,
//       bucket: S3_BUCKET,
//     })
//     await s3fs.deleteAll('foo')
//   })
// })
