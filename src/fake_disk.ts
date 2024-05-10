/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { AssertionError } from 'node:assert'

import { Disk } from './disk.js'
import { FSDriver } from '../drivers/fs/driver.js'
import type { DriveManagerOptions } from './types.js'

/**
 * FakeDisk extends the Disk class with additional capabilities to
 * write assertions.
 */
export class FakeDisk extends Disk {
  declare driver: FSDriver

  constructor(
    public disk: string,
    fakesConfig: Exclude<DriveManagerOptions<any>['fakes'], undefined>
  ) {
    super(
      new FSDriver({
        location:
          typeof fakesConfig.location === 'string'
            ? join(fakesConfig.location, disk)
            : new URL(disk, fakesConfig.location),
        visibility: 'public',
        urlBuilder: fakesConfig.urlBuilder,
      })
    )
  }

  /**
   * Assert the expected file(s) exists. Otherwise an assertion
   * error is thrown
   */
  assertExists(paths: string | string[]) {
    const pathsToVerify = Array.isArray(paths) ? paths : [paths]
    for (let filePath of pathsToVerify) {
      if (!this.driver.existsSync(filePath)) {
        throw new AssertionError({
          message: `Expected "${filePath}" to exist, but file not found.`,
        })
      }
    }
  }

  /**
   * Assert the expected file(s) to not exist. Otherwise an assertion
   * error is thrown
   */
  assertMissing(paths: string | string[]) {
    const pathsToVerify = Array.isArray(paths) ? paths : [paths]
    for (let filePath of pathsToVerify) {
      if (this.driver.existsSync(filePath)) {
        throw new AssertionError({
          message: `Expected "${filePath}" to be missing, but file exists`,
        })
      }
    }
  }

  /**
   * Clear storage
   */
  clear() {
    this.driver.clearSync()
  }
}
