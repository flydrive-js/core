/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { S3Driver } from '../../../drivers/s3/driver.js'
import {
  AWS_ACCESS_KEY,
  AWS_ACCESS_SECRET,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_REGION,
  SUPPORTS_ACL,
} from './env.js'
import { S3Client } from '@aws-sdk/client-s3'

/**
 * Direct access to S3 client via their SDK
 */
const client = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_ACCESS_SECRET,
  },
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
})
test.group('S3 Driver | bucket', () => {
  test('switch bucket', async ({ assert }) => {
    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })
    assert.doesNotThrow(() => {
      s3fs.bucket('other-bucket')
    })
  })
})
