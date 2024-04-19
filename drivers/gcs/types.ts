/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { StorageOptions } from '@google-cloud/storage'
import { ObjectVisibility } from '../../src/types.js'

export type GCSDriverOptions = StorageOptions & {
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
