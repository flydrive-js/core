/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import etag from 'etag'
import mimeTypes from 'mime-types'
import { Readable } from 'node:stream'
import * as fsp from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createReadStream } from 'node:fs'
import { Retrier } from '@humanwhocodes/retry'

import type { FSDriverOptions } from './types.js'
import type { DriverContract, ObjectMetaData, WriteOptions } from '../../src/types.js'

/**
 * The error codes on which we want to retry fs
 * operations
 */
const RETRY_ERROR_CODES = new Set(['ENFILE', 'EMFILE'])

/**
 * Implementation of FlyDrive driver that uses the local filesystem
 * to persist and read files.
 */
export class FSDriver implements DriverContract {
  /**
   * The root directory for the driver
   */
  #rootUrl: string

  /**
   * Retrier is used to retry file system operations
   * when certain errors are raised.
   */
  #retrier = new Retrier(
    (error: NodeJS.ErrnoException) => error.code && RETRY_ERROR_CODES.has(error.code)
  )

  constructor(public options: FSDriverOptions) {
    this.#rootUrl =
      typeof options.location === 'string' ? options.location : fileURLToPath(options.location)
  }

  /**
   * Reads the file for the provided path
   */
  #read(key: string): Promise<Buffer> {
    const location = join(this.#rootUrl, key)
    return this.#retrier.retry(() => fsp.readFile(location))
  }

  /**
   * Generic implementation to write a file
   */
  #write(
    key: string,
    contents: string | Readable | Uint8Array,
    options?: { signal?: AbortSignal }
  ) {
    const location = join(this.#rootUrl, key)
    return this.#retrier.retry(async () => {
      await fsp.mkdir(dirname(location), { recursive: true })
      await fsp.writeFile(location, contents, options)
    })
  }

  /**
   * Writes a file to the destination with the provided contents.
   *
   * - Missing directories will be created recursively.
   * - Existing file will be overwritten.
   */
  put(
    key: string,
    contents: string | ArrayBuffer | Uint8Array,
    options?: WriteOptions
  ): Promise<void> {
    if (contents instanceof ArrayBuffer) {
      return this.#write(key, new Uint8Array(contents), { signal: options?.signal })
    }
    return this.#write(key, contents, { signal: options?.signal })
  }

  /**
   * Writes a file to the destination with the provided contents
   * as a readable stream.
   *
   * - Missing directories will be created recursively.
   * - Existing file will be overwritten.
   */
  putStream(key: string, contents: Readable, options?: WriteOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      contents.once('error', (error) => reject(error))
      return this.#write(key, contents, { signal: options?.signal }).then(resolve).catch(reject)
    })
  }

  /**
   * Returns the contents of the file as a UTF-8 string. An
   * exception is thrown when the file is missing.
   */
  async get(key: string): Promise<string> {
    return this.#read(key).then((value) => value.toString())
  }

  /**
   * Returns the contents of the file as a stream. An
   * exception is thrown when the file is missing.
   */
  async getStream(key: string): Promise<Readable> {
    const location = join(this.#rootUrl, key)
    return createReadStream(location)
  }

  /**
   * Returns the contents of the file as a UTF-8 string. An
   * exception is thrown when the file is missing.
   */
  async getArrayBuffer(key: string): Promise<ArrayBuffer> {
    return this.#read(key).then((value) => new Uint8Array(value.buffer))
  }

  /**
   * Returns the metadata of a file.
   */
  async getMetaData(key: string): Promise<ObjectMetaData> {
    const location = join(this.#rootUrl, key)
    const stats = await fsp.stat(location)

    return {
      contentLength: stats.size,
      contentType: mimeTypes.lookup(key) || undefined,
      etag: etag(stats),
      lastModified: stats.mtime,
      visibility: this.options.visibility,
    }
  }

  /**
   * Copies the source file to the destination. Both paths must
   * be within the root location.
   */
  copy(source: string, destination: string): Promise<void> {
    const sourceLocation = join(this.#rootUrl, source)
    const destinationLocation = join(this.#rootUrl, destination)
    return this.#retrier.retry(async () => {
      await fsp.mkdir(dirname(destinationLocation), { recursive: true })
      await fsp.copyFile(sourceLocation, destinationLocation)
    })
  }

  /**
   * Moves the source file to the destination. Both paths must
   * be within the root location.
   */
  move(source: string, destination: string): Promise<void> {
    const sourceLocation = join(this.#rootUrl, source)
    const destinationLocation = join(this.#rootUrl, destination)
    return this.#retrier.retry(async () => {
      await fsp.mkdir(dirname(destinationLocation), { recursive: true })
      await fsp.rename(sourceLocation, destinationLocation)
    })
  }

  /**
   * Deletes a file within the root location of the filesystem.
   * Attempting to delete a non-existing file will result in
   * a noop.
   */
  delete(key: string): Promise<void> {
    const location = join(this.#rootUrl, key)
    return this.#retrier.retry(async () => {
      try {
        await fsp.unlink(location)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
    })
  }
}