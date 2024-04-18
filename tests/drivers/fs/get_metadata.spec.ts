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

test.group('FS Driver | getMetaData', () => {
  test('get metaData of a file', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)
    const metaData = await fdfs.getMetaData(key)

    assert.match(metaData.etag, /W/)
    assert.isTrue(metaData.lastModified instanceof Date)
    assert.containsSubset(metaData, {
      contentLength: 11,
      contentType: 'text/plain',
      visibility: 'public',
    })
  })

  test('return error when file does not exists', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await assert.rejects(async () => {
      await fdfs.getMetaData(key)
    }, /ENOENT: no such file or directory/)
  })
})
