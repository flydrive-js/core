/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import got from 'got'
import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { S3Driver } from '../../../drivers/s3/driver.js'
import {
  S3_REGION,
  S3_BUCKET,
  S3_CDN_URL,
  S3_SERVICE,
  S3_ENDPOINT,
  SUPPORTS_ACL,
  AWS_ACCESS_KEY,
  AWS_ACCESS_SECRET,
} from './env.js'
import { deleteS3Objects } from '../../helpers.js'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

test.group('S3 Driver | getUrl', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('get public URL of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, 'hello world')
    const fileURL = await s3fs.getUrl(key)

    assert.equal(fileURL, `${S3_ENDPOINT}/${S3_BUCKET}/${key}`)

    /**
     * R2 files are private unless a cdnURL is assigned to them
     */
    if (S3_SERVICE !== 'r2') {
      const fileContents = await got.get(fileURL)
      assert.equal(fileContents.body, 'hello world')
    }
  })

  test('use custom implementation for generating public URL', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
      urlBuilder: {
        async generateURL(fileKey, fileBucket) {
          return new URL(fileKey, `https://cdn.example.com/${fileBucket}/`).toString()
        },
      },
    })

    const fileURL = await s3fs.getUrl(key)
    assert.equal(fileURL, `https://cdn.example.com/${S3_BUCKET}/${key}`)
  })

  test('use CDN url for creating public URL', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
      cdnUrl: S3_CDN_URL,
    })

    await s3fs.put(key, 'hello world')
    const fileURL = await s3fs.getUrl(key)

    const fileContents = await got.get(fileURL)

    assert.equal(fileURL, new URL(key, S3_CDN_URL).toString())
    assert.equal(fileContents.body, 'hello world')
  })
})

test.group('S3 Driver | getSignedUrl', (group) => {
  group.each.setup(() => {
    return async () => {
      // await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('get signed URL of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'private',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, 'hello world')

    const fileURL = new URL(await s3fs.getSignedUrl(key))
    const fileContents = await got.get(fileURL)

    assert.include(fileURL.hostname, S3_BUCKET)
    assert.equal(fileURL.pathname, `/${key}`)
    assert.isTrue(fileURL.searchParams.has('X-Amz-Signature'))
    assert.isTrue(fileURL.searchParams.has('X-Amz-Expires'))

    assert.equal(fileContents.body, 'hello world')
  })

  test('define content type for the file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    const fileURL = new URL(
      await s3fs.getSignedUrl(key, {
        contentType: 'image/png',
      })
    )

    assert.equal(fileURL.searchParams.get('response-content-type'), 'image/png')
  })

  test('define content disposition for the file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    const fileURL = new URL(
      await s3fs.getSignedUrl(key, {
        contentDisposition: 'attachment',
      })
    )

    assert.equal(fileURL.searchParams.get('response-content-disposition'), 'attachment')
  })

  test('use custom implementation for generating signed URL', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
      urlBuilder: {
        async generateSignedURL(_, options, s3Client) {
          return getSignedUrl(
            s3Client,
            new GetObjectCommand({
              ...options,
              ResponseCacheControl: 'no-cache',
            })
          )
        },
      },
    })

    const fileURL = new URL(await s3fs.getSignedUrl(key))
    assert.equal(fileURL.searchParams.get('response-cache-control'), 'no-cache')
  })
})
