/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { S3DriverOptions } from './types.js'
import type { DriverContract, WriteOptions } from '../../src/types.js'

export class S3Driver implements DriverContract {
  constructor(public options: S3DriverOptions) {}
}
