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

test.group('GCS Driver | getMetaData', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get metaData of a file', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    const metaData = await fdgcs.getMetaData(key)

    assert.exists(metaData.etag)
    assert.isTrue(metaData.lastModified instanceof Date)
    assert.containsSubset(metaData, {
      contentLength: 11,
      contentType: 'text/plain',
    })
  })

  test('return error when file does not exists', async ({ assert }) => {
    const key = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await fdgcs.getMetaData(key)
    }, /No such object:/)
  })
})
