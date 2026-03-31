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
import { S3Client, type CopyObjectCommandInput } from '@aws-sdk/client-s3'

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
    assert.equal(await s3fs.getVisibility(destination), 'private')

    assert.isTrue(await s3fs.exists(source))
  }).skip(!SUPPORTS_ACL, 'Service does not support ACL. Hence, we cannot control file visibility')

  test('copy file with explicit bucket option', async ({ assert }) => {
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
    await s3fs.copy(source, destination, { destinationBucket: S3_BUCKET })

    assert.equal(await s3fs.get(destination), contents)
    assert.isTrue(await s3fs.exists(source))
  })

  test('copy command receives the correct destination bucket', async ({ assert }) => {
    let capturedOptions: CopyObjectCommandInput | undefined

    class TestS3Driver extends S3Driver {
      protected createCopyObjectCommand(_client: S3Client, options: CopyObjectCommandInput) {
        capturedOptions = options
        return super.createCopyObjectCommand(_client, options)
      }
    }

    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const s3fs = new TestS3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(source, contents)
    await s3fs.copy(source, destination, { destinationBucket: 'flydrive-other-bucket' })

    assert.isDefined(capturedOptions)
    assert.equal(capturedOptions!.Bucket, 'flydrive-other-bucket')
    assert.equal(capturedOptions!.CopySource, `/${S3_BUCKET}/${source}`)
  })
})
