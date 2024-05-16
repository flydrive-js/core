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

test.group('GCS Driver | visibility | uniform ACL', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get visibility of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const visibility = await fdgcs.getVisibility(key)
    assert.equal(visibility, 'private')
  })

  test('throw error when trying to update visibility of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, 'hello world')

    await assert.rejects(async () => {
      await fdgcs.setVisibility(key, 'public')
    }, /Cannot update access control for an object when uniform bucket-level access is enabled/)
  })
})

test.group('GCS Driver | visibility', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get visibility of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await fdgcs.put(key, 'hello world')

    const visibility = await fdgcs.getVisibility(key)
    assert.equal(visibility, 'public')
  })

  test('make file private', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await fdgcs.put(key, 'hello world', {
      cacheControl: 'no-cache',
    })
    assert.equal(await fdgcs.getVisibility(key), 'public')

    await fdgcs.setVisibility(key, 'private')
    assert.equal(await fdgcs.getVisibility(key), 'private')
  })

  test('make file public', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'private',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await fdgcs.put(key, 'hello world', {
      cacheControl: 'no-cache',
    })
    assert.equal(await fdgcs.getVisibility(key), 'private')

    await fdgcs.setVisibility(key, 'public')
    assert.equal(await fdgcs.getVisibility(key), 'public')
  })

  test('throw error when trying to update visibility of a non-existing file', async ({
    assert,
  }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await assert.rejects(async () => {
      await fdgcs.setVisibility(key, 'public')
    }, /No such object/)
  })
})
