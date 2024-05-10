/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/utils'

import debug from './debug.js'
import { Disk } from './disk.js'
import { FakeDisk } from './fake_disk.js'
import { DriveManagerOptions, DriverContract } from './types.js'

/**
 * Drive manager exposes the API to manage Disk instances for multiple
 * services. Also, it offers a fakes API for testing.
 */
export class DriveManager<Services extends Record<string, () => DriverContract>> {
  /**
   * Registered config
   */
  #config: DriveManagerOptions<Services>

  /**
   * A collection of cached service. We re-use disk instances for a
   * service, since there isn't any need to reconstruct them
   * everytime.
   */
  #cachedServices: Map<keyof Services, Disk> = new Map()

  /**
   * A collection of fakes created for the services.
   */
  #fakes: Map<keyof Services, FakeDisk> = new Map()

  constructor(config: DriveManagerOptions<Services>) {
    this.#config = config
    debug('driver manager config %O', config)
  }

  /**
   * Returns an instance of a Disk for the given service. By default
   * use the "default" service from config
   */
  use<K extends keyof Services>(service?: K): Disk {
    const serviceToUse = service || this.#config.default

    /**
     * Return fake when exists
     */
    const fake = this.#fakes.get(serviceToUse)
    if (fake) {
      debug('returning fake for service %s', serviceToUse)
      return fake
    }

    /**
     * Return from cache
     */
    const cachedDisk = this.#cachedServices.get(serviceToUse)
    if (cachedDisk) {
      debug('use cached disk instance for service %s', serviceToUse)
      return cachedDisk
    }

    /**
     * Create disk and cache it
     */
    const disk = new Disk(this.#config.services[serviceToUse]())
    debug('creating disk instance for service %s', serviceToUse)
    this.#cachedServices.set(serviceToUse, disk)
    return disk
  }

  /**
   * Deploy fake for a given service. The "use" method for the same service
   * will now return an instance of the "FakeDisk" class and not the
   * real implementation.
   */
  fake<K extends keyof Services>(service?: K): FakeDisk {
    const serviceToUse = service || this.#config.default

    /**
     * Ensure fakes config has been defined
     */
    if (!this.#config.fakes) {
      throw new RuntimeException(
        'Cannot use "drive.fake". Make sure to define fakes configuration when creating DriveManager instance'
      )
    }

    /**
     * Remove existing fake
     */
    this.restore(serviceToUse)
    debug('creating fake for service %s', serviceToUse)

    /**
     * Create new fake
     */
    const fake = new FakeDisk(serviceToUse as string, this.#config.fakes)
    this.#fakes.set(serviceToUse, fake)
    return fake
  }

  /**
   * Restore fake for a given service
   */
  restore<K extends keyof Services>(service?: K): void {
    const serviceToUse = service || this.#config.default
    const fake = this.#fakes.get(serviceToUse)

    if (fake) {
      debug('restoring fake for service %s', serviceToUse)
      fake.clear()
      this.#fakes.delete(serviceToUse)
    }
  }
}
