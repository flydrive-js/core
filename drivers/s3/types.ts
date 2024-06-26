/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { GetObjectAclCommandInput, S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import type { ObjectVisibility } from '../../src/types.js'

/**
 * The base set of options accepted by the S3 driver
 */
type S3DriverBaseOptions = {
  /**
   * The bucket from which to read and write files
   */
  bucket: string

  /**
   * The default visibility of all the objects within the
   * bucket.
   */
  visibility: ObjectVisibility

  /**
   * Does service supports ACL?
   *
   * When set to "false", the ACL related commands uses visibility
   * defined within the config without any API call.
   *
   * Defaults to "true". However, when you are using Cloudflare R2, you
   * must set it to "false".
   */
  supportsACL?: boolean

  /**
   * An optional CDN URL to use for public URLs. Otherwise the endpoint
   * will be used
   */
  cdnUrl?: string

  /**
   * Configure a custom URL builder for creating public and
   * temporary URLs
   */
  urlBuilder?: {
    /**
     * Custom implementation for creating public URLs
     */
    generateURL?(key: string, bucket: string, client: S3Client): Promise<string>

    /**
     * Custom implementation for creating signed/temporary URLs
     */
    generateSignedURL?(
      key: string,
      options: GetObjectAclCommandInput,
      client: S3Client
    ): Promise<string>
  }
}

/**
 * The configuration options accepted by the S3 driver
 */
export type S3DriverOptions =
  | (S3ClientConfig & S3DriverBaseOptions)
  | ({
      client: S3Client
    } & S3DriverBaseOptions)
