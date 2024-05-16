/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Env } from '@adonisjs/env'
import { readFile } from 'node:fs/promises'

Env.identifier('file', (value) => {
  return readFile(new URL(`../../../${value}`, import.meta.url), 'utf-8')
})

const env = await Env.create(new URL('../../../', import.meta.url), {
  GCS_KEY: Env.schema.string(),
  GCS_BUCKET: Env.schema.string(),
  GCS_FINE_GRAINED_ACL_BUCKET: Env.schema.string(),
})

export const GCS_BUCKET = env.get('GCS_BUCKET')
export const GCS_KEY = JSON.parse(env.get('GCS_KEY'))
export const GCS_FINE_GRAINED_ACL_BUCKET = env.get('GCS_FINE_GRAINED_ACL_BUCKET')
