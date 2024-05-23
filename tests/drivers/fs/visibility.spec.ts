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

test.group('FS Driver | visibility', () => {
  test('get visibility of a file', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    const visibility = await fdfs.getVisibility(key)
    assert.equal(visibility, 'public')
  })

  test('noop when trying to set visibility of a file', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await fdfs.setVisibility(key, 'private')

    const visibility = await fdfs.getVisibility(key)
    assert.equal(visibility, 'public')
  })
})
