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

test.group('FS Driver | exists', () => {
  test('return true when file exists', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    assert.isTrue(await fdfs.exists(key))
  })

  test('return false when file does not exist', async ({ fs, assert }) => {
    const key = 'hello.txt'
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })

    assert.isFalse(await fdfs.exists(key))
  })

  test('return false when object is a folder', async ({ fs, assert }) => {
    const key = 'foo/hello.txt'
    const contents = 'Hello world'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.put(key, contents)

    assert.isFalse(await fdfs.exists('foo'))
  })
})
