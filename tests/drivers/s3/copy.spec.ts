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

test.group('S3 Driver | copy', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('copy file from source to the destination', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.put(source, contents)
    await s3fs.copy(source, destination)

    assert.equal(await s3fs.get(destination), contents)
  })

  test('copy file from source to a nested directory', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `foo/bar/baz/${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await s3fs.put(source, contents)
    await s3fs.copy(source, destination)

    assert.equal(await s3fs.get(destination), contents)
  })

  test('return error when source file does not exist', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    await assert.rejects(async () => {
      await s3fs.copy(source, destination)
    }, /UnknownError|The specified key does not exist/)
  })

  test('retain source file metadata during copy', async ({ assert }) => {
    const source = `${string.random(10)}.txt`
    const destination = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(source, contents, {
      contentType: 'image/png',
    })

    await s3fs.copy(source, destination)
    const metaData = await s3fs.getMetaData(destination)
    assert.equal(metaData.contentType, 'image/png')

    assert.isTrue(await s3fs.exists(source))
  })

  test('retain source file visibility during copy', async ({ assert }) => {
    const source = `${string.random(10)}.txt`
    const destination = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(source, contents, {
      contentType: 'image/png',
      visibility: 'private',
    })

    await s3fs.copy(source, destination)
    assert.equal(await s3fs.getMetaData(destination), 'private')

    assert.isTrue(await s3fs.exists(source))
  }).skip(!SUPPORTS_ACL, 'Service does not support ACL. Hence, we cannot control file visibility')
})
