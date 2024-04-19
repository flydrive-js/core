/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { SaveOptions, Storage } from '@google-cloud/storage'

import debug from './debug.js'
import type { GCSDriverOptions } from './types.js'
import type { DriverContract, ObjectMetaData, WriteOptions } from '../../src/types.js'

/**
 * Implementation of FlyDrive driver that reads and persists files
 * to Google cloud storage service
 */
export class GCSDriver implements DriverContract {
  #storage: Storage
  #usingUniformAcl: boolean = true

  constructor(public options: GCSDriverOptions) {
    this.#storage = 'storage' in options ? options.storage : new Storage(options)
    if (options.usingUniformAcl !== undefined) {
      this.#usingUniformAcl = options.usingUniformAcl
    }
  }

  /**
   * Returns GCS options for the save operations.
   */
  #getSaveOptions(options?: WriteOptions): SaveOptions {
    /**
     * Destructuring known properties and creating a new object
     * with the rest of unknown properties.
     */
    const {
      visibility, // used locally
      contentType, // forwaded as metadata
      cacheControl, // forwaded as metadata
      contentEncoding, // forwaded as metadata
      contentLength, // not entertained by GCS
      contentLanguage, // not entertained by GCS
      contentDisposition, // not entertained by GCS
      ...rest // forwarded as it is
    } = options || {}

    /**
     * Creating GCS options with all the unknown properties and empty
     * metadata object. We will later fill this metadata object
     * with the known options.
     */
    const gcsOptions: SaveOptions = { resumable: false, ...rest }
    gcsOptions.metadata = Object.assign(gcsOptions.metadata || {}, {
      contentType,
      cacheControl,
      contentEncoding,
    })

    /**
     * Assign ACL to the object when not using uniform ACL
     * on the bucket or project.
     */
    if (this.#usingUniformAcl === false) {
      gcsOptions.public = (visibility || this.options.visibility) === 'public'
      gcsOptions.private = !gcsOptions.public
      gcsOptions.predefinedAcl = gcsOptions.public ? 'publicRead' : 'private'
    }

    debug('gcs write options %s', gcsOptions)
    return gcsOptions
  }

  /**
   * Writes a file to the bucket for the given key and contents.
   */
  async put(
    key: string,
    contents: string | Uint8Array,
    options?: WriteOptions | undefined
  ): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)
    await bucket.file(key).save(Buffer.from(contents), this.#getSaveOptions(options))
  }

  /**
   * Writes a file to the bucket for the given key and stream
   */
  async putStream(
    key: string,
    contents: Readable,
    options?: WriteOptions | undefined
  ): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)
    return new Promise((resolve, reject) => {
      contents.once('error', (error) => reject(error))
      return pipeline(contents, bucket.file(key).createWriteStream(this.#getSaveOptions(options)))
        .then(resolve)
        .catch(reject)
    })
  }

  /**
   * Returns the contents of a file as a UTF-8 string. An
   * exception is thrown when object is missing.
   */
  async get(key: string): Promise<string> {
    const bucket = this.#storage.bucket(this.options.bucket)
    const response = await bucket.file(key).download()
    return response[0].toString('utf-8')
  }

  /**
   * Returns the contents of the file as a Readable stream. An
   * exception is thrown when the file is missing.
   */
  async getStream(key: string): Promise<Readable> {
    const bucket = this.#storage.bucket(this.options.bucket)
    return bucket.file(key).createReadStream()
  }

  /**
   * Returns the contents of the file as an Uint8Array. An
   * exception is thrown when the file is missing.
   */
  async getArrayBuffer(key: string): Promise<ArrayBuffer> {
    const bucket = this.#storage.bucket(this.options.bucket)
    const response = await bucket.file(key).download()
    return new Uint8Array(response[0])
  }

  /**
   * Returns the file metadata.
   */
  async getMetaData(key: string): Promise<ObjectMetaData> {
    const bucket = this.#storage.bucket(this.options.bucket)
    const response = await bucket.file(key).getMetadata()
    const [isFilePublic] = await bucket.file(key).isPublic()

    return {
      contentLength: Number(response[0].size!),
      etag: response[0].etag!,
      lastModified: new Date(response[0].updated!),
      visibility: isFilePublic ? 'public' : 'private',
      contentType: response[0].contentType!,
    }
  }

  /**
   * Copies the source file to the destination. Both paths must
   * be within the root location.
   */
  async copy(source: string, destination: string, options?: WriteOptions): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)
    options = options || {}

    /**
     * Copy visibility from the source file to the
     * desintation when no inline visibility is
     * defined and not using usingUniformAcl
     */
    if (!options.visibility && !this.#usingUniformAcl) {
      const [isFilePublic] = await bucket.file(source).isPublic()
      options.visibility = isFilePublic ? 'public' : 'private'
    }

    await bucket.file(source).copy(destination, this.#getSaveOptions(options))
  }

  /**
   * Moves the source file to the destination. Both paths must
   * be within the root location.
   */
  async move(source: string, destination: string, options?: WriteOptions): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)
    options = options || {}

    /**
     * Copy visibility from the source file to the
     * desintation when no inline visibility is
     * defined and not using usingUniformAcl
     */
    if (!options.visibility && !this.#usingUniformAcl) {
      const [isFilePublic] = await bucket.file(source).isPublic()
      options.visibility = isFilePublic ? 'public' : 'private'
    }

    await bucket.file(source).move(destination, this.#getSaveOptions(options))
  }

  /**
   * Deletes the object from the bucket
   */
  async delete(key: string) {
    const bucket = this.#storage.bucket(this.options.bucket)
    await bucket.file(key).delete({ ignoreNotFound: true })
  }
}
