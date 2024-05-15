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

test.group('S3 Driver | visibility', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, '/')
    }
  })
  group.each.timeout(10_000)

  test('get visibility of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })

    await s3fs.put(key, 'hello world')

    const visibility = await s3fs.getVisibility(key)
    assert.equal(visibility, 'public')
  })

  test('make file private', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })

    await s3fs.put(key, 'hello world', {
      cacheControl: 'no-cache',
    })
    assert.equal(await s3fs.getVisibility(key), 'public')

    await s3fs.setVisibility(key, 'private')
    assert.equal(await s3fs.getVisibility(key), 'private')
  })

  test('make file public', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'private',
      client: client,
      bucket: S3_BUCKET,
    })

    await s3fs.put(key, 'hello world', {
      cacheControl: 'no-cache',
    })
    assert.equal(await s3fs.getVisibility(key), 'private')

    await s3fs.setVisibility(key, 'public')
    assert.equal(await s3fs.getVisibility(key), 'public')
  })

  test('throw error when trying to update visibility of a non-existing file', async ({
    assert,
  }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
    })

    await assert.rejects(async () => {
      await s3fs.setVisibility(key, 'public')
    }, /UnknownError/)
  })
})
