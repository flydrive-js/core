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
import { createReadStream } from 'node:fs'
import { Retrier } from '@humanwhocodes/retry'
import { RuntimeException } from '@poppinss/utils'
import { dirname, join, relative } from 'node:path'

import type { FSDriverOptions } from './types.js'
import { DriveFile } from '../../src/driver_file.js'
import { DriveDirectory } from '../../src/drive_directory.js'
import type {
  WriteOptions,
  ObjectMetaData,
  DriverContract,
  ObjectVisibility,
} from '../../src/types.js'

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
   * Returns the contents of the file as a UTF-8 string. An
   * exception is thrown when the file is missing.
   */
  async get(key: string): Promise<string> {
    return this.#read(key).then((value) => value.toString('utf-8'))
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
   * Returns the contents of the file as an Uint8Array. An
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

    if (stats.isDirectory()) {
      throw new RuntimeException(`Cannot get metadata of a directory "${key}"`)
    }

    return {
      contentLength: stats.size,
      contentType: mimeTypes.lookup(key) || undefined,
      etag: etag(stats),
      lastModified: stats.mtime,
    }
  }

  /**
   * Returns the file visibility from the pre-defined config
   * value
   */
  async getVisibility(_: string): Promise<ObjectVisibility> {
    return this.options.visibility
  }

  /**
   * Results in noop, since the local filesystem cannot have per
   * object visibility.
   */
  async setVisibility(_: string, __: ObjectVisibility): Promise<void> {}

  /**
   * Writes a file to the destination with the provided contents.
   *
   * - Missing directories will be created recursively.
   * - Existing file will be overwritten.
   */
  put(key: string, contents: string | Uint8Array, options?: WriteOptions): Promise<void> {
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
      await fsp.copyFile(sourceLocation, destinationLocation)
      await fsp.unlink(sourceLocation)
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

  /**
   * Deletes the files and directories matching the provided
   * prefix. The method is same as running "rm -rf" unix
   * command
   */
  deleteAll(prefix: string): Promise<void> {
    const location = join(this.#rootUrl, prefix)
    return this.#retrier.retry(async () => {
      return fsp.rm(location, { recursive: true, force: true })
    })
  }

  /**
   * Returns a list of files. The pagination properties are ignored
   * by the fs driver, since it does not support pagination.
   */
  async listAll(
    prefix: string,
    options?: {
      recursive?: boolean
      paginationToken?: string
    }
  ): Promise<{
    paginationToken?: string
    objects: Iterable<DriveFile | DriveDirectory>
  }> {
    const self = this
    const location = join(this.#rootUrl, prefix)
    const { recursive } = Object.assign({ recursive: false }, options)

    /**
     * Reading files with their types.
     */
    const files = await fsp.readdir(location, {
      recursive,
      withFileTypes: true,
    })

    /**
     * The generator is used to lazily iterate over files and
     * convert them into DriveFile or DriveDirectory instances
     */
    function* filesGenerator(): Iterator<
      DriveFile | { isFile: false; isDirectory: true; prefix: string; name: string }
    > {
      for (const file of files) {
        // @ts-expect-error "Dirent.parentPath" is the new property, but missing on types
        const relativeName = relative(self.#rootUrl, join(file.parentPath || file.path, file.name))
        if (file.isFile()) {
          yield new DriveFile(relativeName, self)
        } else if (!recursive) {
          yield new DriveDirectory(relativeName)
        }
      }
    }

    return {
      paginationToken: undefined,
      objects: {
        [Symbol.iterator]: filesGenerator,
      },
    }
  }
}
