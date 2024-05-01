/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Readable } from 'node:stream'
import string from '@poppinss/utils/string'
import {
  Storage,
  SaveOptions,
  FileMetadata,
  GetFilesOptions,
  GetSignedUrlConfig,
} from '@google-cloud/storage'

import debug from './debug.js'
import type { GCSDriverOptions } from './types.js'
import { DriveFile } from '../../src/driver_file.js'
import { DriveDirectory } from '../../src/drive_directory.js'
import type {
  WriteOptions,
  ObjectMetaData,
  DriverContract,
  SignedURLOptions,
  ObjectVisibility,
} from '../../src/types.js'

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
   * Creates the metadata for the file from the raw response
   * returned by GCS
   */
  #createFileMetaData(apiFile: FileMetadata) {
    const metaData: ObjectMetaData = {
      contentType: apiFile.contentType,
      contentLength: Number(apiFile.size!),
      etag: apiFile.etag!,
      lastModified: new Date(apiFile.updated!),
    }

    return metaData
  }

  /**
   * Returns the GCS objects using the callback approach, since there
   * is no other way to get access to the API response and the
   * pagination token
   *
   * Instead of using "bucket.getFiles" we use "bucket.request", because
   * the "getFiles" method internally creates an instance of "File".
   * We do not even need this instance and wasting resources when
   * querying a bucket with many files.
   */
  #getGCSObjects(
    options: GetFilesOptions
  ): Promise<{ files: FileMetadata[]; prefixes: string[]; paginationToken?: string }> {
    const bucket = this.#storage.bucket(this.options.bucket)
    return new Promise((resolve, reject) => {
      bucket.request(
        {
          uri: '/o',
          qs: options,
        },
        (error, response) => {
          if (error) {
            reject(error)
          } else {
            resolve({
              files: response.items || [],
              paginationToken: response.nextPageToken,
              prefixes: response.prefixes || [],
            })
          }
        }
      )
    })
  }

  /**
   * Returns a boolean indicating if the file exists
   * or not.
   */
  async exist(key: string): Promise<boolean> {
    const bucket = this.#storage.bucket(this.options.bucket)
    const response = await bucket.file(key).exists()
    return response[0]
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

    return this.#createFileMetaData(response[0])
  }

  /**
   * Returns the visibility of a file
   */
  async getVisibility(key: string): Promise<ObjectVisibility> {
    const bucket = this.#storage.bucket(this.options.bucket)
    const [isFilePublic] = await bucket.file(key).isPublic()
    return isFilePublic ? 'public' : 'private'
  }

  /**
   * Returns the public URL of the file. This method does not check
   * if the file exists or not.
   */
  async getUrl(key: string): Promise<string> {
    /**
     * Use custom implementation when exists.
     */
    const generateURL = this.options.urlBuilder?.generateURL
    if (generateURL) {
      return generateURL(key, this.options.bucket, this.#storage)
    }

    const bucket = this.#storage.bucket(this.options.bucket)
    const file = bucket.file(key)
    return file.publicUrl()
  }

  /**
   * Returns the signed/temporary URL of the file. By default, the signed URLs
   * expire in 30mins, but a custom expiry can be defined using
   * "options.expiresIn" property.
   */
  async getSignedUrl(key: string, options?: SignedURLOptions): Promise<string> {
    const { contentDisposition, contentType, expiresIn, ...rest } = Object.assign({}, options)

    /**
     * Options passed to GCS when generating the signed URL.
     */
    const expires = new Date()
    expires.setSeconds(new Date().getSeconds() + string.seconds.parse(expiresIn || '30mins'))

    const signedURLOptions: GetSignedUrlConfig = {
      action: 'read',
      expires: expires,
      responseType: contentType,
      responseDisposition: contentDisposition,
      ...rest,
    }

    /**
     * Use custom implementation when exists.
     */
    const generateSignedURL = this.options.urlBuilder?.generateSignedURL
    if (generateSignedURL) {
      return generateSignedURL(key, this.options.bucket, signedURLOptions, this.#storage)
    }

    const bucket = this.#storage.bucket(this.options.bucket)
    const file = bucket.file(key)

    const response = await file.getSignedUrl(signedURLOptions)
    return response[0]
  }

  /**
   * Updates the visibility of a file
   */
  async setVisibility(key: string, visibility: ObjectVisibility): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)

    const file = bucket.file(key)
    if (visibility === 'private') {
      await file.makePrivate()
    } else {
      await file.makePublic()
    }
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
  putStream(key: string, contents: Readable, options?: WriteOptions | undefined): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)
    return new Promise((resolve, reject) => {
      /**
       * GCS internally creates a pipeline of stream and invokes the "_destroy" method
       * at several occassions. Because of that, the "_destroy" method emits an event
       * which cannot handled within this block of code.
       *
       * So the only way I have been able to make GCS streams work is by ditching the
       * pipeline method and relying on the "pipe" method instead.
       */
      const writeable = bucket.file(key).createWriteStream(this.#getSaveOptions(options))
      writeable.once('error', reject)
      contents.once('error', reject)
      contents.pipe(writeable).on('finish', resolve).on('error', reject)
    })
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

  /**
   * Deletes the files and directories matching the provided
   * prefix.
   */
  async deleteAll(prefix: string): Promise<void> {
    const bucket = this.#storage.bucket(this.options.bucket)
    await bucket.deleteFiles({ prefix: `${prefix.replace(/\/$/, '')}/` })
  }

  /**
   * Returns a list of files. The pagination token can be used to paginate
   * through the files.
   */
  async listAll(
    prefix: string,
    options?: {
      recursive?: boolean
      paginationToken?: string
      maxResults?: number
    }
  ): Promise<{
    paginationToken?: string
    objects: Iterable<DriveFile | DriveDirectory>
  }> {
    const self = this
    let { recursive, paginationToken, maxResults } = Object.assign({ recursive: false }, options)
    if (prefix) {
      prefix = !recursive ? `${prefix.replace(/\/$/, '')}/` : prefix
    }

    const response = await this.#getGCSObjects({
      autoPaginate: false,
      delimiter: !recursive ? '/' : '',
      includeTrailingDelimiter: !recursive,
      includeFoldersAsPrefixes: !recursive,
      pageToken: paginationToken,
      ...(prefix !== '/' ? { prefix } : {}),
      ...(maxResults !== undefined ? { maxResults } : {}),
    })

    /**
     * The generator is used to lazily iterate over files and
     * convert them into DriveFile or DriveDirectory instances
     */
    function* filesGenerator(): Iterator<
      DriveFile | { isFile: false; isDirectory: true; prefix: string; name: string }
    > {
      for (const directory of response.prefixes) {
        yield new DriveDirectory(directory.replace(/\/$/, ''))
      }
      for (const file of response.files) {
        yield new DriveFile(file.name!, self, self.#createFileMetaData(file))
      }
    }

    return {
      paginationToken: response.paginationToken,
      objects: {
        [Symbol.iterator]: filesGenerator,
      },
    }
  }
}
