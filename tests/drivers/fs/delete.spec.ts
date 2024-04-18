/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { FSDriver } from '../../../drivers/fs/driver.js'

test.group('FS Driver | delete', () => {
  test('delete file', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)
    await fdfs.delete(key)

    await assert.fileNotExists(key)
  })

  test('delete file at nested path', async ({ fs, assert }) => {
    const key = 'foo/bar/hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)
    await fdfs.delete(key)

    await assert.fileNotExists(key)
  })

  test('noop when trying to delete a non-existing file', async ({ fs, assert }) => {
    const key = 'foo/bar/hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.delete(key)

    await assert.fileNotExists(key)
  })

  test('throw error when trying to delete a directory', async ({ fs, assert }) => {
    const key = 'foo/bar/hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)
    await assert.rejects(async () => {
      await fdfs.delete('foo')
    }, /EPERM: operation not permitted|EISDIR: illegal operation on a direct/)

    await assert.fileExists(key)
  })
})
