/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { GCS_BUCKET, GCS_KEY } from './env.js'
import { GCSDriver } from '../../../drivers/gcs/driver.js'

test.group('GCS Driver | bucket', () => {
  test('switch bucket', async ({ assert }) => {
    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
      usingUniformAcl: true,
    })
    assert.doesNotThrow(() => {
      fdgcs.bucket('other-bucket')
    })
  })
})
