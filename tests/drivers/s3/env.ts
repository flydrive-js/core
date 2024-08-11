/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Env } from '@adonisjs/env'

const env = await Env.create(new URL('../../../', import.meta.url), {
  S3_SERVICE: Env.schema.enum(['r2', 'do'] as const),
  S3_BUCKET: Env.schema.string(),
  S3_ACCESS_KEY: Env.schema.string(),
  S3_ACCESS_SECRET: Env.schema.string(),
  S3_ENDPOINT: Env.schema.string(),
  S3_REGION: Env.schema.string(),
  S3_CDN_URL: Env.schema.string(),
})

export const S3_SERVICE = env.get('S3_SERVICE')
export const SUPPORTS_ACL = S3_SERVICE !== 'r2'
export const S3_BUCKET = env.get('S3_BUCKET')
export const S3_CDN_URL = env.get('S3_CDN_URL')
export const S3_REGION = env.get('S3_REGION')
export const S3_ENDPOINT = env.get('S3_ENDPOINT')
export const AWS_ACCESS_KEY = env.get('S3_ACCESS_KEY')
export const AWS_ACCESS_SECRET = env.get('S3_ACCESS_SECRET')
