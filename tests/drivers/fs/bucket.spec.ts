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

test.group('FS Driver | bucket', () => {
  test('not supported', async ({ fs, assert }) => {
    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    assert.throws(() => {
      fdfs.bucket('test-bucket')
    }, 'Cannot switch bucket. The "fs" driver does not support it.')
  })
})
