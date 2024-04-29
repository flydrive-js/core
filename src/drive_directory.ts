/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { basename } from 'node:path'

/**
 * Representation of a directory in the listing
 * of objects.
 */
export class DriveDirectory {
  isFile: false = false
  isDirectory: true = true
  name: string
  constructor(public prefix: string) {
    this.name = basename(this.prefix)
  }
}
