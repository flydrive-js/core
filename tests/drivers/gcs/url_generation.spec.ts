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
import { GCSDriver } from '../../../drivers/gcs/driver.js'
import { GCS_BUCKET, GCS_FINE_GRAINED_ACL_BUCKET, GCS_KEY } from '../../helpers.js'

/**
 * Direct access to Google cloud storage bucket
 * via their SDK
 */
const bucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_BUCKET)
const noUniformedAclBucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_FINE_GRAINED_ACL_BUCKET)

test.group('GCS Driver | getUrl', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get public URL of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const fileURL = await fdgcs.getUrl(key)
    assert.equal(fileURL, `https://storage.googleapis.com/${GCS_BUCKET}/${key}`)
  })

  test('use custom implementation for generating public URL', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
      urlBuilder: {
        async generateURL(fileKey, fileBucket) {
          return `https://cdn.example.com/${fileBucket}/${fileKey}`
        },
      },
    })

    const fileURL = await fdgcs.getUrl(key)
    assert.equal(fileURL, `https://cdn.example.com/${GCS_BUCKET}/${key}`)
  })
})

test.group('GCS Driver | getSignedUrl', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get signed URL of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const fileURL = new URL(await fdgcs.getSignedUrl(key))
    assert.equal(fileURL.pathname, `/${GCS_BUCKET}/${key}`)
    assert.isTrue(fileURL.searchParams.has('Signature'))
    assert.isTrue(fileURL.searchParams.has('Expires'))
  })

  test('define content type for the file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const fileURL = new URL(
      await fdgcs.getSignedUrl(key, {
        contentType: 'image/png',
      })
    )

    assert.equal(fileURL.searchParams.get('response-content-type'), 'image/png')
  })

  test('define content disposition for the file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const fileURL = new URL(
      await fdgcs.getSignedUrl(key, {
        contentDisposition: 'attachment',
      })
    )

    assert.equal(fileURL.searchParams.get('response-content-disposition'), 'attachment')
  })
})
