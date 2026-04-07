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
import { Storage } from '@google-cloud/storage'
import { GCSDriver } from '../../../drivers/gcs/driver.js'
import { GCS_BUCKET, GCS_FINE_GRAINED_ACL_BUCKET, GCS_KEY, GCS_OTHER_BUCKET } from './env.js'

/**
 * Direct access to Google cloud storage bucket
 * via their SDK
 */
const bucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_BUCKET)
const otherBucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_OTHER_BUCKET)
const noUniformedAclBucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_FINE_GRAINED_ACL_BUCKET)

test.group('GCS Driver | copy', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await otherBucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('copy file from source to the destination', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await fdgcs.put(source, contents)
    await fdgcs.copy(source, destination)

    assert.equal(await fdgcs.get(destination), contents)
  })

  test('copy file from source to a nested directory', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `foo/bar/baz/${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await fdgcs.put(source, contents)
    await fdgcs.copy(source, destination)

    assert.equal(await fdgcs.get(destination), contents)
  })

  test('return error when source file does not exist', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await assert.rejects(async () => {
      await fdgcs.copy(source, destination)
    }, /No such object:/)
  })

  test('retain source file visibility and metadata during copy', async ({ assert }) => {
    const source = `${string.random(10)}.txt`
    const destination = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_FINE_GRAINED_ACL_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: false,
    })

    await fdgcs.put(source, contents, {
      contentType: 'image/png',
      visibility: 'private',
    })

    await fdgcs.copy(source, destination)
    const metaData = await fdgcs.getMetaData(destination)
    const visibility = await fdgcs.getVisibility(destination)

    assert.equal(visibility, 'private')
    assert.equal(metaData.contentType, 'image/png')

    const existsResponse = await noUniformedAclBucket.file(source).exists()
    assert.isTrue(existsResponse[0])
  })

  test('copy file with explicit bucket option', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await fdgcs.put(source, contents)
    await fdgcs.copy(source, destination, { destinationBucket: GCS_BUCKET })

    assert.equal(await fdgcs.get(destination), contents)
    const [exists] = await bucket.file(source).exists()
    assert.isTrue(exists)
  })

  test('copy file to another bucket with explicit bucket option', async ({ assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const sourceDriver = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    const destinationDriver = new GCSDriver({
      visibility: 'public',
      bucket: GCS_OTHER_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await sourceDriver.put(source, contents)
    await sourceDriver.copy(source, destination, { destinationBucket: GCS_OTHER_BUCKET })

    assert.equal(await destinationDriver.get(destination), contents)

    const [sourceExists] = await bucket.file(source).exists()
    const [destinationExists] = await otherBucket.file(destination).exists()

    assert.isTrue(sourceExists)
    assert.isTrue(destinationExists)
  })
})
