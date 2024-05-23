/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { unlink } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import type { Readable } from 'node:stream'

import * as errors from './errors.js'
import { DriveFile } from './driver_file.js'
import { KeyNormalizer } from './key_normalizer.js'
import { DriveDirectory } from './drive_directory.js'
import type {
  WriteOptions,
  FileSnapshot,
  ObjectMetaData,
  DriverContract,
  ObjectVisibility,
  SignedURLOptions,
} from './types.js'

/**
 * Disk offers a unified API for working with different drivers
 */
export class Disk {
  /**
   * The normalizer is used to normalize and validate keys
   */
  #normalizer = new KeyNormalizer()

  constructor(public driver: DriverContract) {}

  /**
   * Creates a new instance of the DriveFile. It can be used
   * to lazily fetch file contents or convert it into a
   * snapshot for persistence
   */
  file(key: string): DriveFile {
    return new DriveFile(key, this.driver)
  }

  /**
   * Creates a new instance of the DriveFile from the snapshot.
   */
  fromSnapshot(snapshot: FileSnapshot): DriveFile {
    return new DriveFile(snapshot.key, this.driver, {
      contentLength: snapshot.contentLength,
      etag: snapshot.etag,
      lastModified: new Date(snapshot.lastModified),
      contentType: snapshot.contentType,
    })
  }

  /**
   * Check if the file exists. This method cannot check existence
   * of directories.
   */
  exists(key: string): Promise<boolean> {
    return this.file(key).exists()
  }

  /**
   * Returns file contents as a UTF-8 string. Use "getArrayBuffer" method
   * if you need more control over the file contents decoding.
   */
  get(key: string): Promise<string> {
    return this.file(key).get()
  }

  /**
   * Returns file contents as a Readable stream.
   */
  getStream(key: string): Promise<Readable> {
    return this.file(key).getStream()
  }

  /**
   * Returns file contents as a Uint8Array.
   */
  getArrayBuffer(key: string): Promise<ArrayBuffer> {
    return this.file(key).getArrayBuffer()
  }

  /**
   * Returns metadata of the given file.
   */
  getMetaData(key: string): Promise<ObjectMetaData> {
    return this.file(key).getMetaData()
  }

  /**
   * Returns the visibility of the file
   */
  getVisibility(key: string): Promise<ObjectVisibility> {
    return this.file(key).getVisibility()
  }

  /**
   * Returns the public URL of the file
   */
  getUrl(key: string): Promise<string> {
    return this.file(key).getUrl()
  }

  /**
   * Returns a signed/temporary URL of the file
   */
  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string> {
    return this.file(key).getSignedUrl(options)
  }

  /**
   * Update the visibility of the file
   */
  async setVisibility(key: string, visibility: ObjectVisibility): Promise<void> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.setVisibility(key, visibility)
    } catch (error) {
      throw new errors.E_CANNOT_SET_VISIBILITY([key], { cause: error })
    }
  }

  /**
   * Create new file or update an existing file. In case of an error,
   * the "E_CANNOT_WRITE_FILE" exception is thrown
   */
  async put(key: string, contents: string | Uint8Array, options?: WriteOptions): Promise<void> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.put(key, contents, options)
    } catch (error) {
      throw new errors.E_CANNOT_WRITE_FILE([key], { cause: error })
    }
  }

  /**
   * Create new file or update an existing file using a Readable Stream
   * In case of an error, the "E_CANNOT_WRITE_FILE" exception is thrown
   */
  async putStream(key: string, contents: Readable, options?: WriteOptions) {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.putStream(key, contents, options)
    } catch (error) {
      throw new errors.E_CANNOT_WRITE_FILE([key], { cause: error })
    }
  }

  /**
   * Copies file from the "source" to the "destination" within the
   * same bucket or the root location of local filesystem.
   *
   * Use "copyFromFs" method to copy files from local filesystem to
   * a cloud provider
   */
  async copy(source: string, destination: string, options?: WriteOptions): Promise<void> {
    source = this.#normalizer.normalize(source)
    destination = this.#normalizer.normalize(destination)
    try {
      return await this.driver.copy(source, destination, options)
    } catch (error) {
      throw new errors.E_CANNOT_COPY_FILE([source, destination], { cause: error })
    }
  }

  /**
   * Copies file from the local filesystem to the cloud provider.
   */
  copyFromFs(source: string | URL, destination: string, options?: WriteOptions) {
    return this.putStream(destination, createReadStream(source), options)
  }

  /**
   * Moves file from the "source" to the "destination" within the
   * same bucket or the root location of local filesystem.
   *
   * Use "moveFromFs" method to move files from local filesystem to
   * a cloud provider
   */
  async move(source: string, destination: string, options?: WriteOptions): Promise<void> {
    source = this.#normalizer.normalize(source)
    destination = this.#normalizer.normalize(destination)
    try {
      return await this.driver.move(source, destination, options)
    } catch (error) {
      throw new errors.E_CANNOT_MOVE_FILE([source, destination], { cause: error })
    }
  }

  /**
   * Moves file from the local filesystem to the cloud provider.
   */
  async moveFromFs(source: string | URL, destination: string, options?: WriteOptions) {
    await this.putStream(destination, createReadStream(source), options)
    await unlink(source)
  }

  /**
   * Deletes a file for the given key. Use "deleteAll" method to delete
   * files for a matching folder prefix.
   */
  async delete(key: string): Promise<void> {
    key = this.#normalizer.normalize(key)
    try {
      return await this.driver.delete(key)
    } catch (error) {
      throw new errors.E_CANNOT_DELETE_FILE([key], { cause: error })
    }
  }

  /**
   * Delete all files matching the given prefix. In case of "fs" driver,
   * the mentioned folder will be deleted.
   */
  async deleteAll(prefix: string): Promise<void> {
    prefix = this.#normalizer.normalize(prefix)
    try {
      return await this.driver.deleteAll(prefix)
    } catch (error) {
      throw new errors.E_CANNOT_DELETE_DIRECTORY([prefix], { cause: error })
    }
  }

  /**
   * Returns a list of objects which includes and files and directories.
   * In case of "recursive" listing, no directories are returned.
   */
  listAll(
    prefix: string,
    options?: {
      recursive?: boolean
      paginationToken?: string
    }
  ): Promise<{
    paginationToken?: string
    objects: Iterable<DriveFile | DriveDirectory>
  }> {
    prefix = this.#normalizer.normalize(prefix)
    return this.driver.listAll(prefix, options)
  }
}
