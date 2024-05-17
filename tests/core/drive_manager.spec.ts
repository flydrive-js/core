/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Disk } from '../../src/disk.js'
import { FakeDisk } from '../../src/fake_disk.js'
import { FSDriver } from '../../drivers/fs/driver.js'
import { GCSDriver } from '../../drivers/gcs/driver.js'
import { DriveManager } from '../../src/drive_manager.js'
import { GCS_BUCKET, GCS_KEY } from '../drivers/gcs/env.js'

test.group('Drive Manager', () => {
  test('create disk instances for configured services', ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
    })

    assert.instanceOf(drive.use(), Disk)
    assert.instanceOf(drive.use('gcs'), Disk)
    assert.instanceOf(drive.use('gcs').driver, GCSDriver)

    assert.instanceOf(drive.use('fs'), Disk)
    assert.instanceOf(drive.use('fs').driver, FSDriver)
  })

  test('cache disk instances', ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
    })

    assert.instanceOf(drive.use(), Disk)
    assert.strictEqual(drive.use('gcs'), drive.use('gcs'))
  })

  test('throw error when trying to create a fake without fakes config', ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
    })

    assert.throws(
      () => drive.fake('gcs'),
      'Cannot use "drive.fake". Make sure to define fakes configuration when creating DriveManager instance'
    )
  })

  test('create fake for a service', ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
      fakes: {
        location: fs.baseUrl,
      },
    })

    const fake = drive.fake('gcs')
    assert.instanceOf(fake, FakeDisk)
    assert.strictEqual(drive.use('gcs'), fake)
    assert.notStrictEqual(drive.use('fs'), fake)
  })

  test('write files to disk when using fakes', async ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
      fakes: {
        location: fs.baseUrl,
      },
    })

    const fake = drive.fake('gcs')
    await drive.use('gcs').put('hello.txt', 'Hello world')

    fake.assertExists('hello.txt')
    await assert.fileExists('gcs/hello.txt')
  })

  test('clear files on restore', async ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
      fakes: {
        location: fs.baseUrl,
      },
    })

    const fake = drive.fake('gcs')
    await drive.use('gcs').put('hello.txt', 'Hello world')
    drive.restore('gcs')

    fake.assertMissing('hello.txt')
    await assert.fileNotExists('gcs/hello.txt')
  })

  test('create and restore fakes of the default service', async ({ fs, assert }) => {
    const drive = new DriveManager({
      default: 'fs',
      services: {
        fs: () => new FSDriver({ location: fs.baseUrl, visibility: 'public' }),
        gcs: () =>
          new GCSDriver({
            visibility: 'public',
            bucket: GCS_BUCKET,
            credentials: GCS_KEY,
            usingUniformAcl: true,
          }),
      },
      fakes: {
        location: fs.baseUrl,
      },
    })

    const fake = drive.fake()
    assert.strictEqual(fake, drive.use())

    drive.restore()
    assert.notStrictEqual(fake, drive.use())
  })
})
