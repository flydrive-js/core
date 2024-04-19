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
import { GCS_BUCKET, GCS_FINE_GRAINED_ACL_BUCKET, GCS_KEY } from '../../helpers.js'
import { GCSDriver } from '../../../drivers/gcs/driver.js'

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

test.group('GCS Driver | move', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('move file from source to the destination', async ({ assert }) => {
    const source = `${string.random(10)}.txt`
    const destination = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await fdgcs.put(source, contents)
    await fdgcs.move(source, destination)

    assert.equal(await fdgcs.get(destination), contents)

    const existsResponse = await bucket.file(source).exists()
    assert.isFalse(existsResponse[0])
  })

  test('move file from source to a nested directory', async ({ assert }) => {
    const source = `${string.random(10)}.txt`
    const destination = `foo/bar/baz/${string.random(10)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await fdgcs.put(source, contents)
    await fdgcs.move(source, destination)

    assert.equal(await fdgcs.get(destination), contents)

    const existsResponse = await bucket.file(source).exists()
    assert.isFalse(existsResponse[0])
  })

  test('return error when source file does not exist', async ({ assert }) => {
    const source = `${string.random(10)}.txt`
    const destination = `${string.random(10)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await assert.rejects(async () => {
      await fdgcs.move(source, destination)
    }, /No such object:/)
  })

  test('retain source file visibility and metadata during move', async ({ assert }) => {
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
    await fdgcs.move(source, destination)

    const metaData = await fdgcs.getMetaData(destination)
    assert.equal(metaData.visibility, 'private')
    assert.equal(metaData.contentType, 'image/png')

    const existsResponse = await noUniformedAclBucket.file(source).exists()
    assert.isFalse(existsResponse[0])
  })
})
