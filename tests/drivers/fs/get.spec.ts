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
})

test.group('FS Driver | getArrayBuffer', () => {
  test('get file contents as array buffer', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    assert.equal(new TextDecoder().decode(await fdfs.getArrayBuffer(key)), contents)
  })

  test('return error when file does not exist', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })

    await assert.rejects(async () => {
      await fdfs.getArrayBuffer(key)
    }, /ENOENT: no such file or directory/)
  })
})
