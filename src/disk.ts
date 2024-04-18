/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Readable } from 'node:stream'
import * as errors from './errors.js'
import type { DriverContract, ObjectMetaData, WriteOptions } from './types.js'
import { KeyNormalizer } from './key_normalizer.js'

/**
 * Disk offers a unified API for working with different drivers
 */
export class Disk {
  #normalizer: { normalize(key: string): string }
  constructor(
    public driver: DriverContract,
    normalizer?: { normalize(key: string): string }
  ) {
    this.#normalizer = normalizer || new KeyNormalizer()
  }

  async put(
    key: string,
    contents: string | ArrayBuffer | Uint8Array,
    options?: WriteOptions
  ): Promise<void> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.put(key, contents, options)
    } catch (error) {
      throw new errors.E_CANNOT_WRITE_FILE([key], { cause: error })
    }
  }

  async putStream(key: string, contents: Readable, options?: WriteOptions) {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.putStream(key, contents, options)
    } catch (error) {
      throw new errors.E_CANNOT_WRITE_FILE([key], { cause: error })
    }
  }

  async get(key: string): Promise<string> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.get(key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([key], { cause: error })
    }
  }

  async getStream(key: string): Promise<Readable> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.getStream(key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([key], { cause: error })
    }
  }

  async getArrayBuffer(key: string): Promise<ArrayBuffer> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.getArrayBuffer(key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([key], { cause: error })
    }
  }

  async getMetaData(key: string): Promise<ObjectMetaData> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.getMetaData(key)
    } catch (error) {
      throw new errors.E_CANNOT_GET_METADATA([key], { cause: error })
    }
  }

  async copy(source: string, destination: string): Promise<void> {
    source = this.#normalizer.normalize(source)
    destination = this.#normalizer.normalize(destination)
    try {
      return await this.driver.copy(source, destination)
    } catch (error) {
      throw new errors.E_CANNOT_COPY_FILE([source, destination], { cause: error })
    }
  }

  async move(source: string, destination: string): Promise<void> {
    source = this.#normalizer.normalize(source)
    destination = this.#normalizer.normalize(destination)
    try {
      return await this.driver.move(source, destination)
    } catch (error) {
      throw new errors.E_CANNOT_MOVE_FILE([source, destination], { cause: error })
    }
  }

  async delete(key: string): Promise<void> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.delete(key)
    } catch (error) {
      throw new errors.E_CANNOT_DELETE_FILE([key], { cause: error })
    }
  }
}
