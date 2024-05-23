/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import etag from 'etag'
import mimeTypes from 'mime-types'
import { Readable } from 'node:stream'
import { slash } from '@poppinss/utils'
import * as fsp from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Retrier } from '@humanwhocodes/retry'
import { RuntimeException } from '@poppinss/utils'
import { dirname, join, relative } from 'node:path'
import { existsSync, rmSync, createReadStream, Dirent } from 'node:fs'

import debug from './debug.js'
import type { FSDriverOptions } from './types.js'
import { DriveFile } from '../../src/driver_file.js'
import { DriveDirectory } from '../../src/drive_directory.js'
import type {
  WriteOptions,
  ObjectMetaData,
  DriverContract,
  ObjectVisibility,
  SignedURLOptions,
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

    debug('driver config %O', options)
  }

  /**
   * Reads the file for the provided path
   */
  #read(key: string): Promise<Buffer> {
    const location = join(this.#rootUrl, key)
    return this.#retrier.retry(() => fsp.readFile(location))
  }

  /**
   * Reads dir and ignores non-existing errors
   */
  async #readDir(location: string, recursive: boolean): Promise<Dirent[]> {
    try {
      return await fsp.readdir(location, {
        recursive,
        withFileTypes: true,
      })
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
      return []
    }
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
   * Synchronously check if a file exists
   */
  existsSync(key: string): boolean {
    debug('checking if file exists %s:%s', this.#rootUrl, key)
    const location = join(this.#rootUrl, key)
    return existsSync(location)
  }

  /**
   * Returns a boolean indicating if the file exists or not.
   */
  async exists(key: string): Promise<boolean> {
    debug('checking if file exists %s:%s', this.#rootUrl, key)
    const location = join(this.#rootUrl, key)
    try {
      const object = await fsp.stat(location)
      return object.isFile()
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false
      }
      throw error
    }
  }

  /**
   * Returns the contents of the file as a UTF-8 string. An
   * exception is thrown when the file is missing.
   */
  async get(key: string): Promise<string> {
    debug('reading file contents %s:%s', this.#rootUrl, key)
    return this.#read(key).then((value) => value.toString('utf-8'))
  }

  /**
   * Returns the contents of the file as a stream. An
   * exception is thrown when the file is missing.
   */
  async getStream(key: string): Promise<Readable> {
    debug('reading file contents as a stream %s:%s', this.#rootUrl, key)
    const location = join(this.#rootUrl, key)
    return createReadStream(location)
  }

  /**
   * Returns the contents of the file as an Uint8Array. An
   * exception is thrown when the file is missing.
   */
  async getArrayBuffer(key: string): Promise<ArrayBuffer> {
    debug('reading file contents as array buffer %s:%s', this.#rootUrl, key)
    return this.#read(key).then((value) => new Uint8Array(value.buffer))
  }

  /**
   * Returns the metadata of a file.
   */
  async getMetaData(key: string): Promise<ObjectMetaData> {
    debug('fetching file metadata %s:%s', this.#rootUrl, key)
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
   * Returns the public URL of the file. This method does not check
   * if the file exists or not.
   */
  async getUrl(key: string): Promise<string> {
    const location = join(this.#rootUrl, key)
    const generateURL = this.options.urlBuilder?.generateURL
    if (generateURL) {
      debug('generating public URL %s:%s', this.#rootUrl, key)
      return generateURL(key, location)
    }

    throw new RuntimeException('Cannot generate URL. The "fs" driver does not support it')
  }

  /**
   * Returns the signed/temporary URL of the file. By default, the signed URLs
   * expire in 30mins, but a custom expiry can be defined using
   * "options.expiresIn" property.
   */
  async getSignedUrl(key: string, options?: SignedURLOptions): Promise<string> {
    const location = join(this.#rootUrl, key)
    const normalizedOptions = Object.assign(
      {
        expiresIn: '30 mins',
      },
      options
    )

    /**
     * Use custom implementation when exists.
     */
    const generateSignedURL = this.options.urlBuilder?.generateSignedURL
    if (generateSignedURL) {
      debug('generating signed URL %s:%s', this.#rootUrl, key)
      return generateSignedURL(key, location, normalizedOptions)
    }

    throw new RuntimeException('Cannot generate signed URL. The "fs" driver does not support it')
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
    debug('creating/updating file %s:%s', this.#rootUrl, key)
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
    debug('creating/updating file using readable stream %s:%s', this.#rootUrl, key)
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
    debug('copying file from %s to %s', source, destination)
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
    debug('moving file from %s to %s', source, destination)
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
    debug('deleting file %s:%s', this.#rootUrl, key)
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
    debug('deleting all files in folder %s:%s', this.#rootUrl, prefix)
    const location = join(this.#rootUrl, prefix)

    return this.#retrier.retry(async () => {
      return fsp.rm(location, { recursive: true, force: true })
    })
  }

  /**
   * Synchronously delete all files from the root location
   */
  clearSync() {
    rmSync(this.#rootUrl, { recursive: true, force: true })
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
    debug('listing files from folder %s:%s %O', this.#rootUrl, prefix, options)

    /**
     * Reading files with their types.
     */
    const files = await this.#readDir(location, recursive)

    /**
     * The generator is used to lazily iterate over files and
     * convert them into DriveFile or DriveDirectory instances
     */
    function* filesGenerator(): Iterator<
      DriveFile | { isFile: false; isDirectory: true; prefix: string; name: string }
    > {
      for (const file of files) {
        const relativeName = slash(
          relative(self.#rootUrl, join(file.parentPath || file.path, file.name))
        )
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
