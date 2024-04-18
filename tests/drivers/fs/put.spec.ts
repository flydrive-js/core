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
import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'

import { FSDriver } from '../../../drivers/fs/driver.js'

test.group('FS Driver | put', () => {
  test('create file at the destination', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    await assert.fileExists(key)
    await assert.fileEquals(key, contents)
  })

  test('overwrite contents of existing file', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'
    const newContents = 'Hi world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)
    await fdfs.put(key, newContents)

    await assert.fileExists(key)
    await assert.fileEquals(key, newContents)
  })

  test('create files at a nested destination', async ({ fs, assert }) => {
    const key = 'users/1/hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    await assert.fileExists(key)
    await assert.fileEquals(key, contents)
  })
})

test.group('FS Driver | putStream', () => {
  test('create file from readable stream', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.putStream(key, Readable.from([contents]))

    await assert.fileExists(key)
    await assert.fileEquals(key, contents)
  })

  test('create file from fs stream', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = JSON.stringify({ greeting: 'hello world' })
    await fs.create('foo.json', contents)

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.putStream(key, createReadStream(join(fs.basePath, 'foo.json')))

    await assert.fileExists(key)
    await assert.fileEquals(key, contents)
  })

  test('throw error when readable stream returns error', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await assert.rejects(async () => {
      await fdfs.putStream(key, createReadStream(join(fs.basePath, 'foo.json')))
    }, /ENOENT: no such file or directory/)
  })
})
