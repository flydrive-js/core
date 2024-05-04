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
import type {
  DriverContract,
  FileSnapshot,
  ObjectMetaData,
  ObjectVisibility,
  SignedURLOptions,
} from './types.js'

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
   * Reference to the normalized file key
   */
  key: string

  /**
   * The basename of the file. Extracted from the key
   */
  name: string

  /**
   * Flags to know if the object is a file or a directory
   */
  isFile: true = true
  isDirectory: false = false

  constructor(key: string, driver: DriverContract, metaData?: ObjectMetaData) {
    this.#driver = driver
    this.#metaData = metaData
    this.key = this.#normalizer.normalize(key)
    this.name = basename(this.key)
  }

  /**
   * Check if the file exists. This method cannot check existence
   * of directories.
   */
  async exists() {
    try {
      return await this.#driver.exist(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_CHECK_FILE_EXISTENCE([this.key], { cause: error })
    }
  }

  /**
   * Returns file contents as a UTF-8 string. Use "getArrayBuffer" method
   * if you need more control over the file contents decoding.
   */
  async get(): Promise<string> {
    try {
      return await this.#driver.get(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([this.key], { cause: error })
    }
  }

  /**
   * Returns file contents as a Readable stream.
   */
  async getStream(): Promise<Readable> {
    try {
      return await this.#driver.getStream(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([this.key], { cause: error })
    }
  }

  /**
   * Returns file contents as a Uint8Array.
   */
  async getArrayBuffer(): Promise<ArrayBuffer> {
    try {
      return await this.#driver.getArrayBuffer(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_READ_FILE([this.key], { cause: error })
    }
  }

  /**
   * Returns metadata of the given file.
   */
  async getMetaData(): Promise<ObjectMetaData> {
    if (this.#metaData) {
      return this.#metaData
    }

    try {
      return await this.#driver.getMetaData(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_GET_METADATA([this.key], { cause: error })
    }
  }

  /**
   * Returns the visibility of the file
   */
  async getVisibility(): Promise<ObjectVisibility> {
    try {
      return await this.#driver.getVisibility(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_GET_METADATA([this.key], { cause: error })
    }
  }

  /**
   * Returns the public URL of the file
   */
  async getUrl() {
    try {
      return await this.#driver.getUrl(this.key)
    } catch (error) {
      throw new errors.E_CANNOT_GENERATE_URL([this.key], { cause: error })
    }
  }

  /**
   * Returns a signed/temporary URL of the file
   */
  async getSignedUrl(options?: SignedURLOptions) {
    try {
      return await this.#driver.getSignedUrl(this.key, options)
    } catch (error) {
      throw new errors.E_CANNOT_GENERATE_URL([this.key], { cause: error })
    }
  }

  /**
   * Returns a snapshot of the file. The snapshot could be persisted
   * within any database storage and later you can create a file
   * instance from it using the "disk.fromSnapshot" method.
   */
  async toSnapshot(): Promise<FileSnapshot> {
    const metaData = await this.getMetaData()

    return {
      key: this.key,
      name: this.name,
      contentLength: metaData.contentLength,
      lastModified: metaData.lastModified.toString(),
      etag: metaData.etag,
      contentType: metaData.contentType,
    }
  }
}
