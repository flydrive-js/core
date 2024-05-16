/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { Storage } from '@google-cloud/storage'

import { Disk } from '../../../src/disk.js'
import * as errors from '../../../src/errors.js'
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

test.group('Disk | GCS | copyFromFs', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('copy file from the local filesystem to GCS', async ({ fs, assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    await fs.create(source, contents)

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const disk = new Disk(fdgcs)
    await disk.copyFromFs(join(fs.basePath, source), destination)

    assert.equal(await disk.get(destination), contents)
    await assert.fileExists(source)
  })

  test('throw error when source file does not exists', async ({ fs, assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const disk = new Disk(fdgcs)
    try {
      await disk.copyFromFs(join(fs.basePath, source), destination)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_WRITE_FILE)
      assert.equal(error.message, `Cannot write file at location "${destination}"`)
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})

test.group('Disk | GCS | moveFromFs', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
      await noUniformedAclBucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('move file from the local filesystem to GCS', async ({ fs, assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`
    const contents = 'Hello world'

    await fs.create(source, contents)

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const disk = new Disk(fdgcs)
    await disk.moveFromFs(join(fs.basePath, source), destination)

    assert.equal(await disk.get(destination), contents)
    await assert.fileNotExists(source)
  })

  test('move error when source file does not exists', async ({ fs, assert }) => {
    const source = `${string.random(6)}.txt`
    const destination = `${string.random(6)}.txt`

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })

    const disk = new Disk(fdgcs)
    try {
      await disk.moveFromFs(join(fs.basePath, source), destination)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_WRITE_FILE)
      assert.equal(error.message, `Cannot write file at location "${destination}"`)
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})
