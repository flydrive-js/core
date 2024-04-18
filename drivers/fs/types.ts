/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ObjectVisibility } from '../../src/types.js'

/**
 * The options accepted by the FSDriver
 */
export type FSDriverOptions = {
  /**
   * Root location of the filesystem. The files will be
   * read and persisted to this location
   */
  location: URL | string

  /**
   * The default visibility of all the files. The FSDriver
   * does not use visbility to implement any logic, instead
   * it returns the value as it is via the "getMetaData"
   * method
   */
  visibility: ObjectVisibility
}
