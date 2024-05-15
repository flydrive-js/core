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

test.group('S3 Driver | exists', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, '/')
    }
  })
  group.each.timeout(10_000)

  test('return true when file exists', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })
    await s3fs.put(key, contents)

    assert.isTrue(await s3fs.exist(key))
  })

  test('return false when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })

    assert.isFalse(await s3fs.exist(key))
  })

  test('return false when object is a folder', async ({ assert }) => {
    const key = `foo/${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })

    await s3fs.put(key, contents)

    assert.isFalse(await s3fs.exist('foo'))
  })
})
