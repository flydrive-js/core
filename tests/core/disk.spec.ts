/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import getStream from 'get-stream'
import { test } from '@japa/runner'
import { createReadStream } from 'node:fs'

import { Disk } from '../../src/disk.js'
import * as errors from '../../src/errors.js'
import { FSDriver } from '../../drivers/fs/driver.js'

test.group('Disk | get', () => {
  test('get file contents using the underlying driver', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const disk = new Disk(fdfs)
    assert.equal(await disk.get(key), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    try {
      await disk.get(key)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_READ_FILE)
      assert.equal(error.message, 'Cannot read file from location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory, open/)
    }
  })
})

test.group('Disk | getStream', () => {
  test('get file contents as a stream', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const disk = new Disk(fdfs)
    assert.equal(await getStream(await disk.getStream(key)), contents)
  })

  test('do not wrap stream errors into generic error', async ({ fs, assert }) => {
    assert.plan(2)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    try {
      await getStream(await disk.getStream(key))
    } catch (error) {
      assert.notInstanceOf(error, errors.E_CANNOT_READ_FILE)
      assert.match(error.message, /ENOENT: no such file or directory, open/)
    }
  })
})

test.group('Disk | getArrayBuffer', () => {
  test('get file contents as array buffer', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)
    const disk = new Disk(fdfs)

    assert.equal(new TextDecoder().decode(await disk.getArrayBuffer(key)), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    try {
      await disk.getArrayBuffer(key)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_READ_FILE)
      assert.equal(error.message, 'Cannot read file from location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory, open/)
    }
  })
})

test.group('Disk | getMetaData', () => {
  test('get file metadata', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const disk = new Disk(fdfs)
    const metaData = await disk.getMetaData(key)

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
    const disk = new Disk(fdfs)

    const file = disk.fromSnapshot({
      key,
      name: key,
      contentLength: 11,
      contentType: 'image/png',
      etag: 'foo',
      lastModified: new Date().toISOString(),
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
    const disk = new Disk(fdfs)

    try {
      await disk.getMetaData(key)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_GET_METADATA)
      assert.equal(error.message, 'Unable to retrieve metadata of file at location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})

test.group('Disk | exists', () => {
  test('return true when file exists', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const disk = new Disk(fdfs)
    assert.isTrue(await disk.exists(key))
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)
    fdfs.exists = function () {
      throw new Error('Failed')
    }

    try {
      await disk.exists(key)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_CHECK_FILE_EXISTENCE)
      assert.equal(error.message, 'Unable to check existence for file at location "hello.txt"')
      assert.match(error.cause.message, /Failed/)
    }
  })
})

test.group('Disk | getVisibility', () => {
  test('get file visibility', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const disk = new Disk(fdfs)
    const visibility = await disk.getVisibility(key)
    assert.equal(visibility, 'public')
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    fdfs.getVisibility = function () {
      throw new Error('Failed')
    }

    const disk = new Disk(fdfs)
    try {
      await disk.getVisibility(key)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_GET_METADATA)
      assert.equal(error.message, 'Unable to retrieve metadata of file at location "hello.txt"')
      assert.match(error.cause.message, /Failed/)
    }
  })
})

test.group('Disk | getUrl', () => {
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

    const disk = new Disk(fdfs)
    assert.equal(await disk.getUrl(key), '/assets/hello.txt')
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

    const disk = new Disk(fdfs)

    try {
      await disk.getUrl(key)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_GENERATE_URL)
      assert.equal(error.message, 'Cannot generate URL for file at location "hello.txt"')
      assert.equal(error.cause.message, 'Cannot generate URL. The "fs" driver does not support it')
    }
  })
})

test.group('Disk | getSignedUrl', () => {
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

    const disk = new Disk(fdfs)
    assert.equal(await disk.getSignedUrl(key), '/assets/hello.txt')
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

    const disk = new Disk(fdfs)

    try {
      await disk.getSignedUrl(key)
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

test.group('Disk | put', () => {
  test('create a new file', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    await disk.put(key, contents)
    assert.equal(await disk.get(key), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    fdfs.put = function () {
      throw new Error('Put operation failed')
    }

    try {
      await disk.put(key, contents)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_WRITE_FILE)
      assert.equal(error.message, 'Cannot write file at location "hello.txt"')
      assert.equal(error.cause.message, 'Put operation failed')
    }
  })
})

test.group('Disk | putStream', () => {
  test('create a new file from readable stream', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    await fs.create('hello_tmp.txt', contents)
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    await disk.putStream(key, createReadStream(join(fs.basePath, 'hello_tmp.txt')))
    assert.equal(await disk.get(key), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    try {
      await disk.putStream(key, createReadStream(join(fs.basePath, 'hello_tmp.txt')))
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_WRITE_FILE)
      assert.equal(error.message, 'Cannot write file at location "hello.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})

test.group('Disk | copy', () => {
  test('copy file within the same root location', async ({ fs, assert }) => {
    const source = 'hello.txt'
    const desintation = 'bar.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    await disk.put(source, contents)
    await disk.copy(source, desintation)
    assert.equal(await disk.get(desintation), contents)
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const source = 'hello.txt'
    const desintation = 'bar.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    try {
      await disk.copy(source, desintation)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_COPY_FILE)
      assert.equal(error.message, 'Cannot copy file from "hello.txt" to "bar.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})

test.group('Disk | move', () => {
  test('move file within the same root location', async ({ fs, assert }) => {
    const source = 'hello.txt'
    const desintation = 'bar.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    await disk.put(source, contents)
    await disk.move(source, desintation)
    assert.equal(await disk.get(desintation), contents)
    assert.isFalse(await disk.exists(source))
  })

  test('wrap driver errors to a generic error', async ({ fs, assert }) => {
    assert.plan(3)
    const source = 'hello.txt'
    const desintation = 'bar.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const disk = new Disk(fdfs)

    try {
      await disk.move(source, desintation)
    } catch (error) {
      assert.instanceOf(error, errors.E_CANNOT_MOVE_FILE)
      assert.equal(error.message, 'Cannot move file from "hello.txt" to "bar.txt"')
      assert.match(error.cause.message, /ENOENT: no such file or directory/)
    }
  })
})

test.group('Disk | DriveFile | toSnapshot', () => {
  test('generate file snapshot', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    const disk = new Disk(fdfs)
    const snapshot = await disk.file(key).toSnapshot()

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
