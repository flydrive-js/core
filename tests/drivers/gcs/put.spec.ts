/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { createReadStream } from 'node:fs'
import string from '@poppinss/utils/string'
import { Storage } from '@google-cloud/storage'
import { GCSDriver } from '../../../drivers/gcs/driver.js'
import { GCS_BUCKET, GCS_FINE_GRAINED_ACL_BUCKET, GCS_KEY } from './env.js'

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

test.group('GCS Driver | put', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('create file at the destination', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdfs.put(key, contents)

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).download()
    assert.equal(response[0].toString(), contents)
  })

  test('create file from Uint8Array', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdfs.put(key, new TextEncoder().encode(contents))

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).download()
    assert.equal(response[0].toString(), contents)
  })

  test('overwrite contents of existing file', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'
    const newContents = 'Hi world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdfs.put(key, contents)
    await fdfs.put(key, newContents)

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).download()
    assert.equal(response[0].toString(), newContents)
  })

  test('create files at a nested destination', async ({ assert }) => {
    const key = `users/1/${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdfs.put(key, contents)

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).download()
    assert.equal(response[0].toString(), contents)
  })

  test('create file with custom metadata', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdfs.put(key, contents, {
      contentType: 'image/png',
      cacheControl: 'no-cache',
      contentEncoding: 'binary',
    })

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).getMetadata()
    assert.equal(response[0].contentType, 'image/png')
    assert.equal(response[0].contentEncoding, 'binary')
    assert.equal(response[0].cacheControl, 'no-cache')
  })

  test('create file with local visibility', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await fdfs.put(key, contents, {
      contentType: 'image/png',
      cacheControl: 'no-cache',
      contentEncoding: 'binary',
    })

    /**
     * Verify put operation
     */
    const response = await noUniformedAclBucket.file(key).isPublic()
    assert.isTrue(response[0])
  })

  test('create file with inline local visibility', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await fdfs.put(key, contents, {
      contentType: 'image/png',
      cacheControl: 'no-cache',
      contentEncoding: 'binary',
      visibility: 'private',
    })

    /**
     * Verify put operation
     */
    const response = await noUniformedAclBucket.file(key).isPublic()
    assert.isFalse(response[0])
  })
})

test.group('GCS Driver | putStream', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('create file from readable stream', async ({ fs, assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fs.create(key, contents)
    await fdfs.putStream(key, createReadStream(join(fs.basePath, key)))

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).download()
    assert.equal(response[0].toString(), contents)
  })

  test('create files at a nested destination', async ({ fs, assert }) => {
    const key = `users/1/${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fs.create(key, contents)
    await fdfs.putStream(key, createReadStream(join(fs.basePath, key)))

    /**
     * Verify put operation
     */
    const response = await bucket.file(key).download()
    assert.equal(response[0].toString(), contents)
  })

  test('throw error when source stream returns an error', async ({ fs, assert }) => {
    const key = `users/1/${string.random(10)}.txt`

    const fdfs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await fdfs.putStream(key, createReadStream(join(fs.basePath, key)))
    }, /ENOENT: no such file or directory/)
  })
})
