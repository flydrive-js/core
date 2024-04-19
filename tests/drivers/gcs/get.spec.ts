/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getStream from 'get-stream'
import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { Storage } from '@google-cloud/storage'
import { GCS_BUCKET, GCS_KEY } from '../../helpers.js'
import { GCSDriver } from '../../../drivers/gcs/driver.js'

/**
 * Direct access to Google cloud storage bucket
 * via their SDK
 */
const bucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_BUCKET)

test.group('GCS Driver | get', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get file contents as a string', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    assert.equal(await fdgcs.get(key), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await fdgcs.get(key)
    }, /No such object:/)
  })
})

test.group('GCS Driver | getArrayBuffer', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get file contents as an arrayBuffer', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    assert.equal(new TextDecoder().decode(await fdgcs.getArrayBuffer(key)), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await fdgcs.getArrayBuffer(key)
    }, /No such object:/)
  })
})

test.group('GCS Driver | getStream', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('get file contents as a stream', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await fdgcs.put(key, contents)
    assert.equal(await getStream(await fdgcs.getStream(key)), contents)
  })

  test('return error when file does not exist', async ({ assert }) => {
    const key = `${string.random(6)}.txt`
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    await assert.rejects(async () => {
      await getStream(await fdgcs.getStream(key))
    }, /No such object:/)
  })
})
