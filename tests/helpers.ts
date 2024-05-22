/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

/**
 * Delete S3 Objects
 */
export async function deleteS3Objects(client: S3Client, bucket: string, prefix: string) {
  const objects = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      ...(prefix === '/' ? {} : { Prefix: prefix }),
    })
  )

  if (objects.Contents) {
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.Contents.map((object) => {
              return {
                Key: object.Key,
              }
            }),
            Quiet: true,
          },
        })
      )
    } catch (error) {
      console.log('======= BULK DELETE FAILURE START =======')
      console.log(objects)
      console.log(error.$response)
      console.log('======= BULK DELETE FAILURE END =======')
    }
  }
}
