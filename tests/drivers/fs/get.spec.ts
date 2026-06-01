/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getStream from 'get-stream'
import { test } from '@japa/runner'

import { FSDriver } from '../../../drivers/fs/driver.js'

test.group('FS Driver | get', () => {
  test('get file contents from the destination', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    assert.equal(await fdfs.get(key), contents)
  })

  test('return error when file does not exist', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await assert.rejects(async () => {
      await fdfs.get(key)
    }, /ENOENT: no such file or directory/)
  })

  test('return error when trying to read contents of a folder', async ({ fs, assert }) => {
    const key = 'foo/hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, 'hello world')
    await assert.rejects(async () => {
      await fdfs.get('foo')
    }, /EPERM: operation not permitted|EISDIR: illegal operation on a direct/)
  })
})

test.group('FS Driver | getStream', () => {
  test('get file contents as a stream', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    assert.equal(await getStream(await fdfs.getStream(key)), contents)
  })

  test('return error when file does not exist', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })

    await assert.rejects(async () => {
      await getStream(await fdfs.getStream(key))
    }, /ENOENT: no such file or directory/)
  })

  test('get file contents for range - {label}')
    .with([
      { label: 'start and end', range: { start: 3, end: 7 }, expected: 'lo wo' },
      { label: 'start only', range: { start: 6 }, expected: 'world' },
      { label: 'end only', range: { end: 4 }, expected: 'Hello' },
      { label: 'single byte', range: { start: 0, end: 0 }, expected: 'H' },
      { label: 'empty object', range: {}, expected: 'Hello world' },
    ])
    .run(async ({ fs, assert }, { range, expected }) => {
      const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
      await fdfs.put('hello.txt', 'Hello world')
      assert.equal(await getStream(await fdfs.getStream('hello.txt', { range })), expected)
    })

  test('throws E_RANGE_UNSATISFIABLE - {label}')
    .with([
      { label: 'invalid range syntax', range: { start: -1 } },
      { label: 'range exceeds file size', range: { start: 0, end: 99999 } },
      { label: 'start exceeds file size', range: { start: 99999 } },
    ])
    .run(async ({ fs, assert }, { range }) => {
      const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
      await fdfs.put('hello.txt', 'Hello world')
      await assert.rejects(
        async () => fdfs.getStream('hello.txt', { range }),
        /The specified range is invalid or exceeds the file size/
      )
    })
})

test.group('FS Driver | getBytes', () => {
  test('get file contents as array buffer', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    assert.equal(new TextDecoder().decode(await fdfs.getBytes(key)), contents)
  })

  test('return error when file does not exist', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })

    await assert.rejects(async () => {
      await fdfs.getBytes(key)
    }, /ENOENT: no such file or directory/)
  })

  test('get file contents for range - {label}')
    .with([
      { label: 'start and end', range: { start: 3, end: 7 }, expected: 'lo wo' },
      { label: 'start only', range: { start: 6 }, expected: 'world' },
      { label: 'end only', range: { end: 4 }, expected: 'Hello' },
      { label: 'single byte', range: { start: 0, end: 0 }, expected: 'H' },
      { label: 'empty object', range: {}, expected: 'Hello world' },
    ])
    .run(async ({ fs, assert }, { range, expected }) => {
      const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
      await fdfs.put('hello.txt', 'Hello world')
      assert.equal(new TextDecoder().decode(await fdfs.getBytes('hello.txt', { range })), expected)
    })

  test('throws E_RANGE_UNSATISFIABLE - {label}')
    .with([
      { label: 'invalid range syntax', range: { start: -1 } },
      { label: 'range exceeds file size', range: { start: 0, end: 99999 } },
      { label: 'start exceeds file size', range: { start: 99999 } },
    ])
    .run(async ({ fs, assert }, { range }) => {
      const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
      await fdfs.put('hello.txt', 'Hello world')
      await assert.rejects(
        async () => fdfs.getBytes('hello.txt', { range }),
        /The specified range is invalid or exceeds the file size/
      )
    })
})
