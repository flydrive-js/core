/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Storage, StorageOptions } from '@google-cloud/storage'
import type { ObjectVisibility } from '../../src/types.js'

/**
 * The base set of options that are always needed to
 * create GCS driver instance
 */
type GCSDriverBaseOptions = {
  /**
   * The bucket from which to read and write files
   */
  bucket: string

  /**
   * The default visibility of all the objects within the
   * bucket. The property is only considered when the
   * bucket is not using uniformACL.
   */
  visibility: ObjectVisibility

  /**
   * Is bucket using uniform ACL? Defaults to "true".
   *
   * When set to "true", the visibility setting of FlyDrive
   * will have no impact.
   */
  usingUniformAcl?: boolean
}

/**
 * Configuration options accepted by the GCS driver
 */
export type GCSDriverOptions =
  | ({
      /**
       * An instance of the GCS storage class. If not provided,
       * one must provide other options to establish a connection
       */
      storage: Storage
    } & GCSDriverBaseOptions)
  | (StorageOptions & GCSDriverBaseOptions)
