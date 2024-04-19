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

test.group('FS Driver | copy', () => {
  test('copy file from source to the destination', async ({ fs, assert }) => {
    const source = 'hello.txt'
    const destination = 'hi.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(source, contents)
    await fdfs.copy(source, destination)

    assert.equal(await fdfs.get(destination), contents)
  })

  test('copy file from source to a nested directory', async ({ fs, assert }) => {
    const source = 'hello.txt'
    const destination = 'foo/bar/baz/hi.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(source, contents)
    await fdfs.copy(source, destination)

    assert.equal(await fdfs.get(destination), contents)
  })

  test('return error when source file does not exist', async ({ fs, assert }) => {
    const source = 'hello.txt'
    const destination = 'hi.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await assert.rejects(async () => {
      await fdfs.copy(source, destination)
    }, /ENOENT: no such file or directory/)
  })

  test('return error when source is a directory', async ({ fs, assert }) => {
    const source = 'foo/hello.txt'
    const destination = 'bar'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(source, 'hello world')

    await assert.rejects(async () => {
      await fdfs.copy('foo', destination)
    }, /ENOTSUP: operation not supported|EISDIR: illegal operation on a/)
  })
})
