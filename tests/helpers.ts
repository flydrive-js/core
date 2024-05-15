/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Env } from '@adonisjs/env'
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { readFile } from 'node:fs/promises'

Env.identifier('file', (value) => {
  return readFile(new URL(`../${value}`, import.meta.url), 'utf-8')
})

const env = await Env.create(new URL('../', import.meta.url), {
  GCS_KEY: Env.schema.string(),
  GCS_BUCKET: Env.schema.string(),
  GCS_FINE_GRAINED_ACL_BUCKET: Env.schema.string(),
  AWS_ACCESS_KEY: Env.schema.string(),
  AWS_ACCESS_SECRET: Env.schema.string(),
  S3_ENDPOINT: Env.schema.string(),
  S3_REGION: Env.schema.string(),
  S3_BUCKET: Env.schema.string(),
})

export const S3_REGION = env.get('S3_REGION')
export const S3_BUCKET = env.get('S3_BUCKET')
export const S3_ENDPOINT = env.get('S3_ENDPOINT')
export const GCS_BUCKET = env.get('GCS_BUCKET')
export const GCS_KEY = JSON.parse(env.get('GCS_KEY'))
export const AWS_ACCESS_KEY = env.get('AWS_ACCESS_KEY')
export const AWS_ACCESS_SECRET = env.get('AWS_ACCESS_SECRET')
export const GCS_FINE_GRAINED_ACL_BUCKET = env.get('GCS_FINE_GRAINED_ACL_BUCKET')

/**
 * Delete S3 Objects
 */
export async function deleteS3Objects(client: S3Client, prefix: string) {
  const objects = await client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      ...(prefix === '/' ? {} : { Prefix: prefix }),
    })
  )

  if (objects.Contents) {
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: S3_BUCKET,
          Delete: {
            Objects: objects.Contents.map((object) => {
              return {
                Key: object.Key,
              }
            }),
          },
        })
      )
    } catch (error) {
      console.log('======= BULK DELETE FAILURE START =======')
      console.log(objects)
      console.log(error.$response)
      console.log('======= BULK DELETE FAILURE END =======')
      throw error
    }
  }
}
