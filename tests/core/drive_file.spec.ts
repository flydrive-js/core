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
import * as errors from '../../src/errors.js'
import { DriveFile } from '../../src/driver_file.js'
import { FSDriver } from '../../drivers/fs/driver.js'

test.group('Drive File | get', () => {
  test('get file contents using the underlying driver', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    assert.equal(await file.get(), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const file = new DriveFile(key, fdfs)

    try {
      await file.get()
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_READ_FILE)
      assert.equal(error.message, 'Cannot read file from location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory, open/)
    }
  })
})

test.group('Drive File | getStream', () => {
  test('get file contents as a stream', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    assert.equal(await getStream(await file.getStream()), contents)
  })

  test('do not wrap stream errors into generic error', async ({ fs, assert }) => {
    assert.plan(2)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const file = new DriveFile(key, fdfs)

    try {
      await getStream(await file.getStream())
    } catch (error) {
      assert.notInstanceOf(error, errors.E_CANNOT_READ_FILE)
      assert.match(error.message, /ENOENT: no such file or directory, open/)
    }
  })
})

test.group('Drive File | getArrayBuffer', () => {
  test('get file contents as array buffer', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    assert.equal(new TextDecoder().decode(await file.getArrayBuffer()), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const file = new DriveFile(key, fdfs)

    try {
      await file.getArrayBuffer()
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_READ_FILE)
      assert.equal(error.message, 'Cannot read file from location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory, open/)
    }
  })
})

test.group('Drive File | getMetaData', () => {
  test('get file metadata', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    const metaData = await file.getMetaData()

    assert.match(metaData.etag, /W/)
    assert.isTrue(metaData.lastModified instanceof Date)
    assert.containsSubset(metaData, {
      contentLength: 11,
      contentType: 'text/plain',
    })
  })

  test('return cached metadata when exists', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs, {
      contentLength: 11,
      contentType: 'image/png',
      etag: 'foo',
      lastModified: new Date(),
    })
    const metaData = await file.getMetaData()

    assert.equal(metaData.etag, 'foo')
    assert.isTrue(metaData.lastModified instanceof Date)
    assert.containsSubset(metaData, {
      contentLength: 11,
      contentType: 'image/png',
    })
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const file = new DriveFile(key, fdfs)

    try {
      await file.getMetaData()
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_GET_METADATA)
      assert.equal(error.message, 'Unable to retrieve metadata of file at location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})

test.group('Drive File | getVisibility', () => {
  test('get file visibility', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    const visibility = await file.getVisibility()
    assert.equal(visibility, 'public')
  })
})

test.group('Drive File | getUrl', () => {
  test('get file url from the underlying driver', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({
      location: fs.baseUrl,
      visibility: 'public',
      urlBuilder: {
        async generateURL(fileKey) {
          return `/assets/${fileKey}`
        },
      },
    })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    assert.equal(await file.getUrl(), '/assets/hello.txt')
  })

  test('wrap driver errors into generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({
      location: fs.baseUrl,
      visibility: 'public',
    })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)

    try {
      await file.getUrl()
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_GENERATE_URL)
      assert.equal(error.message, 'Cannot generate URL for file at location "hello.txt"')
      assert.equal(error.cause.message, 'Cannot generate URL. The "fs" driver does not support it')
    }
  })
})

test.group('Drive File | getSignedUrl', () => {
  test('get file url from the underlying driver', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({
      location: fs.baseUrl,
      visibility: 'public',
      urlBuilder: {
        async generateSignedURL(fileKey) {
          return `/assets/${fileKey}`
        },
      },
    })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    assert.equal(await file.getSignedUrl(), '/assets/hello.txt')
  })

  test('wrap driver errors into generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({
      location: fs.baseUrl,
      visibility: 'public',
    })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)

    try {
      await file.getSignedUrl()
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_GENERATE_URL)
      assert.equal(error.message, 'Cannot generate URL for file at location "hello.txt"')
      assert.equal(
        error.cause.message,
        'Cannot generate signed URL. The "fs" driver does not support it'
      )
    }
  })
})

test.group('Drive File | toSnapshot', () => {
  test('generate file snapshot', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const file = new DriveFile(key, fdfs)
    const snapshot = await file.toSnapshot()

    assert.match(snapshot.etag, /W/)
    assert.isTrue(typeof snapshot.lastModified === 'string')
    assert.containsSubset(snapshot, {
      key: 'hello.txt',
      name: 'hello.txt',
      contentLength: 11,
      contentType: 'text/plain',
    })
  })
})
