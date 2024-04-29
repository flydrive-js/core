/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { basename } from 'node:path'
import { Readable } from 'node:stream'

import * as errors from './errors.js'
import { KeyNormalizer } from './key_normalizer.js'
import type { DriverContract, ObjectMetaData, ObjectVisibility } from './types.js'

/**
 * DriveFile is a pointer to a given object. It can be used to lazily
 * read the file contents and metadata and also you may convert it
 * to a snapshot and persist it inside the database.
 */
export class DriveFile {
  /**
   * The driver to use for performing read-only operations
   */
  #driver: DriverContract

  /**
   * Known metadata from the snapshot or from the files listing
   * API
   */
  #metaData?: ObjectMetaData

  /**
   * The normalizer is used to normalize and validate keys
   */
  #normalizer = new KeyNormalizer()

  /**
   * The basename of the file. Extracted from the key
   */
  name: string

  /**
   * Flags to know if the object is a file or a directory
   */
  isFile: true = true
  isDirectory: false = false

  constructor(
    public key: string,
    driver: DriverContract,
    metaData?: ObjectMetaData
  ) {
    this.#driver = driver
    this.#metaData = metaData
    this.name = basename(this.key)
  }

  /**
   * Returns file contents as a UTF-8 string. Use "getArrayBuffer" method
   * if you need more control over the file contents decoding.
   */
  async get(): Promise<string> {
    const key = this.#normalizer.normalize(this.key)
    try {
      return await this.#driver.get(key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([key], { cause: error })
    }
  }

  /**
   * Returns file contents as a Readable stream.
   */
  async getStream(): Promise<Readable> {
    const key = this.#normalizer.normalize(this.key)
    try {
      return await this.#driver.getStream(key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([key], { cause: error })
    }
  }

  /**
   * Returns file contents as a Uint8Array.
   */
  async getArrayBuffer(): Promise<ArrayBuffer> {
    const key = this.#normalizer.normalize(this.key)
    try {
      return await this.#driver.getArrayBuffer(key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([key], { cause: error })
    }
  }

  /**
   * Returns metadata of the given file.
   */
  async getMetaData(): Promise<ObjectMetaData> {
    if (this.#metaData) {
      return this.#metaData
    }

    const key = this.#normalizer.normalize(this.key)
    try {
      return await this.#driver.getMetaData(key)
    } catch (error) {
      throw new errors.E_CANNOT_GET_METADATA([key], { cause: error })
    }
  }

  /**
   * Returns the visibility of the file
   */
  async getVisibility(): Promise<ObjectVisibility> {
    const key = this.#normalizer.normalize(this.key)
    try {
      return await this.#driver.getVisibility(key)
    } catch (error) {
      throw new errors.E_CANNOT_GET_METADATA([key], { cause: error })
    }
  }
}
