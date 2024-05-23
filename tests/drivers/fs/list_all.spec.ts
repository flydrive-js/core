/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { FSDriver } from '../../../drivers/fs/driver.js'

test.group('FS Driver | listAll | root dir', () => {
  test('list all files and top-level directories of the matching prefix', async ({
    fs,
    assert,
  }) => {
    const keys = ['hello.txt', 'foo/bar/hello.txt', 'baz/hello.txt']
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    for (const key of keys) {
      await fdfs.put(key, contents)
    }

    const { objects } = await fdfs.listAll('/')
    assert.deepEqual(Array.from(objects), [
      {
        isDirectory: true,
        isFile: false,
        name: 'baz',
        prefix: 'baz',
      },
      {
        isDirectory: true,
        isFile: false,
        name: 'foo',
        prefix: 'foo',
      },
      {
        isDirectory: false,
        isFile: true,
        name: 'hello.txt',
        key: 'hello.txt',
      },
    ])
  })

  test('list all files recursively', async ({ fs, assert }) => {
    const keys = ['hello.txt', 'foo/bar/hello.txt', 'baz/hello.txt']
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    for (const key of keys) {
      await fdfs.put(key, contents)
    }

    const { objects } = await fdfs.listAll('/', { recursive: true })
    assert.deepEqual(Array.from(objects), [
      {
        isDirectory: false,
        isFile: true,
        name: 'hello.txt',
        key: 'hello.txt',
      },
      {
        isDirectory: false,
        isFile: true,
        name: 'hello.txt',
        key: 'foo/bar/hello.txt',
      },
      {
        isDirectory: false,
        isFile: true,
        name: 'hello.txt',
        key: 'baz/hello.txt',
      },
    ])
  })
})

test.group('FS Driver | listAll | nested dir', () => {
  test('list all files and top-level directories of the matching prefix', async ({
    fs,
    assert,
  }) => {
    const keys = ['hello.txt', 'foo/bar/hello.txt', 'baz/hello.txt']
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    for (const key of keys) {
      await fdfs.put(key, contents)
    }

    const { objects } = await fdfs.listAll('foo')
    assert.deepEqual(Array.from(objects), [
      {
        isDirectory: true,
        isFile: false,
        name: 'bar',
        prefix: 'foo/bar',
      },
    ])
  })

  test('list all files recursively', async ({ fs, assert }) => {
    const keys = ['hello.txt', 'foo/bar/hello.txt', 'baz/hello.txt']
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    for (const key of keys) {
      await fdfs.put(key, contents)
    }

    const { objects } = await fdfs.listAll('foo', { recursive: true })
    assert.deepEqual(Array.from(objects), [
      {
        isDirectory: false,
        isFile: true,
        name: 'hello.txt',
        key: 'foo/bar/hello.txt',
      },
    ])
  })
})
