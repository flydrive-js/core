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
import { GCS_BUCKET, GCS_KEY } from './env.js'
import { GCSDriver } from '../../../drivers/gcs/driver.js'

/**
 * Direct access to Google cloud storage bucket
 * via their SDK
 */
const bucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_BUCKET)

test.group('GCS Driver | exists', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('return true when file exists', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    await fdgcs.put(key, contents)

    assert.isTrue(await fdgcs.exists(key))
  })

  test('return false when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    assert.isFalse(await fdgcs.exists(key))
  })

  test('return false when object is a folder', async ({ assert }) => {
    const key = `foo/${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)

    assert.isFalse(await fdgcs.exists('foo'))
  })
})
