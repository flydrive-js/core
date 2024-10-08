/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Readable } from 'node:stream'
import { DriveFile } from './driver_file.js'
import { DriveDirectory } from './drive_directory.js'

/**
 * The visibility of the object.
 */
export type ObjectVisibility = 'public' | 'private'

/**
 * The metadata of an object that can be fetched
 * using the "getMetaData" method.
 */
export type ObjectMetaData = {
  contentType?: string
  contentLength: number
  etag: string
  lastModified: Date
}

/**
 * Options accepted by the write operations.
 */
export type WriteOptions = {
  visibility?: ObjectVisibility
  contentType?: string
  contentLanguage?: string
  contentEncoding?: string
  contentDisposition?: string
  cacheControl?: string
  contentLength?: number
} & {
  [key: string]: any
}

/**
 * Options accepted during the creation of a signed URL.
 */
export type SignedURLOptions = {
  expiresIn?: string | number
  contentType?: string
  contentDisposition?: string
} & {
  [key: string]: any
}

/**
 * Representation of file snapshot. It can be persisted
 * inside any database storage.
 */
export type FileSnapshot = {
  key: string
  name: string
  contentLength: number
  lastModified: string
  etag: string
  contentType?: string
}

/**
 * The interface every driver must implement.
 */
export interface DriverContract {
  /**
   * Return a boolean indicating if the file exists
   */
  exists(key: string): Promise<boolean>

  /**
   * Return contents of a object for the given key as a UTF-8 string.
   * Should throw "E_CANNOT_READ_FILE" error when the file
   * does not exists.
   */
  get(key: string): Promise<string>

  /**
   * Return contents of a object for the given key as a Readable stream.
   * Should throw "E_CANNOT_READ_FILE" error when the file
   * does not exists.
   */
  getStream(key: string): Promise<Readable>

  /**
   * Return contents of an object for the given key as an Uint8Array.
   * Should throw "E_CANNOT_READ_FILE" error when the file
   * does not exists.
   */
  getBytes(key: string): Promise<Uint8Array>

  /**
   * Return metadata of an object for the given key.
   */
  getMetaData(key: string): Promise<ObjectMetaData>

  /**
   * Return the visibility of the file
   */
  getVisibility(key: string): Promise<ObjectVisibility>

  /**
   * Return the public URL to access the file
   */
  getUrl(key: string): Promise<string>

  /**
   * Return the signed/temporary URL to access the file
   */
  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string>

  /**
   * Update the visibility of the file
   */
  setVisibility(key: string, visibility: ObjectVisibility): Promise<void>

  /**
   * Write object to the destination with the provided
   * contents.
   */
  put(key: string, contents: string | Uint8Array, options?: WriteOptions): Promise<void>

  /**
   * Write object to the destination with the provided
   * contents as a readable stream
   */
  putStream(key: string, contents: Readable, options?: WriteOptions): Promise<void>

  /**
   * Copy the file from within the disk root location. Both
   * the "source" and "destination" will be the key names
   * and not absolute paths.
   */
  copy(source: string, destination: string, options?: WriteOptions): Promise<void>

  /**
   * Move the file from within the disk root location. Both
   * the "source" and "destination" will be the key names
   * and not absolute paths.
   */
  move(source: string, destination: string, options?: WriteOptions): Promise<void>

  /**
   * Delete the file for the given key. Should not throw
   * error when file does not exist in first place
   */
  delete(key: string): Promise<void>

  /**
   * Delete the files and directories matching the provided prefix.
   */
  deleteAll(prefix: string): Promise<void>

  /**
   * The list all method must return an array of objects with
   * the ability to paginate results (if supported).
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
  }>
}

/**
 * Configuration accepted by DriveManager
 */
export interface DriveManagerOptions<Services extends Record<string, () => DriverContract>> {
  /**
   * The default service to use for file system operations
   */
  default: keyof Services

  /**
   * Configured services
   */
  services: Services

  /**
   * Fakes configuration. Only needed when using fakes from the
   * DriveManager
   */
  fakes?: {
    /**
     * The location for persisting files during fake mode
     */
    location: URL | string

    /**
     * Configure a custom URL builder for creating public and
     * temporary URLs in fake mode
     */
    urlBuilder?: {
      /**
       * Custom implementation for creating public URLs
       */
      generateURL?(key: string, filePath: string): Promise<string>

      /**
       * Custom implementation for creating signed/temporary URLs
       */
      generateSignedURL?(key: string, filePath: string, options: SignedURLOptions): Promise<string>
    }
  }
}
