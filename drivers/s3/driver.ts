/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import mimeTypes from 'mime-types'
import { Readable } from 'node:stream'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  S3Client,
  PutObjectCommand,
  HeadObjectOutput,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectAclCommand,
  DeleteObjectCommand,
  GetObjectAclCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  CopyObjectCommandInput,
  HeadObjectCommandInput,
  GetObjectAclCommandInput,
  PutObjectAclCommandInput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput,
  DeleteObjectsCommandInput,
} from '@aws-sdk/client-s3'

import debug from './debug.js'
import { S3DriverOptions } from './types.js'
import { DriveFile } from '../../src/driver_file.js'
import { DriveDirectory } from '../../src/drive_directory.js'
import type {
  WriteOptions,
  DriverContract,
  ObjectMetaData,
  ObjectVisibility,
  SignedURLOptions,
} from '../../src/types.js'
import string from '@poppinss/utils/string'

/**
 * Implementation of FlyDrive driver that reads and persists files
 * to S3 complaint storage services like Digital ocean spaces,
 * R2 and so on.
 */
export class S3Driver implements DriverContract {
  #client: S3Client
  #supportsACL: boolean = true

  /**
   * The URI that holds permission for public
   */
  publicGrantUri = 'http://acs.amazonaws.com/groups/global/AllUsers'

  constructor(public options: S3DriverOptions) {
    this.#client = 'client' in options ? options.client : new S3Client(options)
    if (options.supportsACL !== undefined) {
      this.#supportsACL = options.supportsACL
    }

    if (debug.enabled) {
      debug('driver config %O', {
        ...options,
        credentials: 'REDACTED',
      })
    }
  }

  /**
   * Creates the metadata for the file from the raw response
   * returned by S3
   */
  #createFileMetaData(apiFile: HeadObjectOutput) {
    const metaData: ObjectMetaData = {
      contentType: apiFile.ContentType,
      contentLength: apiFile.ContentLength!,
      etag: apiFile.ETag!,
      lastModified: new Date(apiFile.LastModified!),
    }

    debug('file metadata %O', this.options.bucket, metaData)
    return metaData
  }

  /**
   * Returns S3 options for the save operations.
   */
  #getSaveOptions(key: string, options?: WriteOptions): Omit<PutObjectCommandInput, 'Key'> {
    /**
     * Destructuring properties needed for local checks. The rest
     * object will be forwarded to s3 as it is.
     */
    const {
      visibility, // used locally
      contentType, // forwaded as metadata
      cacheControl, // forwaded as metadata
      contentEncoding, // forwaded as metadata
      contentLength, // forwaded as metadata
      contentLanguage, // forwaded as metadata
      contentDisposition, // forwaded as metadata
      ...rest // forwarded as it is
    } = options || {}

    /**
     * Creating S3 options with all the known and unknown properties
     */
    const s3Options: Omit<PutObjectCommandInput, 'Key'> = {
      Bucket: this.options.bucket,
      ...rest,
    }

    /**
     * Set ACL when service supports it
     */
    if (this.#supportsACL) {
      const isPublic = (visibility || this.options.visibility) === 'public'
      s3Options.ACL = isPublic ? 'public-read' : 'private'
    }

    if (contentType) {
      s3Options.ContentType = contentType
    } else {
      const detectedContentType = mimeTypes.lookup(key)
      if (detectedContentType) {
        debug('setting "%s" file\'s content-type to "%s"', key, detectedContentType)
        s3Options.ContentType = detectedContentType
      }
    }

    if (cacheControl) {
      s3Options.CacheControl = cacheControl
    }
    if (contentEncoding) {
      s3Options.ContentEncoding = contentEncoding
    }
    if (contentLength) {
      s3Options.ContentLength = contentLength
    }
    if (contentLanguage) {
      s3Options.ContentLanguage = contentLanguage
    }
    if (contentDisposition) {
      s3Options.ContentDisposition = contentDisposition
    }

    debug('s3 write options %O', s3Options)
    return s3Options
  }

  /**
   * Deletes files recursively with a batch of 1000 files at a time
   */
  async #deleteFilesRecursively(prefix: string, paginationToken?: string) {
    /**
     * Get a list of 1000 files
     */
    const response = await this.#client.send(
      this.createListObjectsV2Command(this.#client, {
        Bucket: this.options.bucket,
        ContinuationToken: paginationToken,
        ...(prefix !== '/' ? { Prefix: prefix } : {}),
      })
    )

    /**
     * Return early if no files exists
     */
    if (!response.Contents || !response.Contents.length) {
      return
    }

    /**
     * Delete all files
     */
    await this.#client.send(
      this.createDeleteObjectsCommand(this.#client, {
        Bucket: this.options.bucket,
        Delete: {
          Objects: Array.from(response.Contents).map((file) => {
            return {
              Key: file.Key,
            }
          }),
          Quiet: true,
        },
      })
    )

    if (response.NextContinuationToken) {
      debug('deleting next batch of files with token %s', response.NextContinuationToken)
      await this.#deleteFilesRecursively(prefix, response.NextContinuationToken)
    }
  }

  /**
   * Creates S3 "PutObjectCommand". Feel free to override this method to
   * manually create the command
   */
  protected createPutObjectCommand(_: S3Client, options: PutObjectCommandInput) {
    return new PutObjectCommand(options)
  }

  /**
   * Creates S3 "GetObjectCommand". Feel free to override this method to
   * manually create the command
   */
  protected createGetObjectCommand(_: S3Client, options: GetObjectCommandInput) {
    return new GetObjectCommand(options)
  }

  /**
   * Creates S3 "HeadObjectCommand". Feel free to override this method to
   * manually create the command
   */
  protected createHeadObjectCommand(_: S3Client, options: HeadObjectCommandInput) {
    return new HeadObjectCommand(options)
  }

  /**
   * Creates S3 "GetObjectAclCommand". Feel free to override this method to
   * manually create the command
   */
  protected createGetObjectAclCommand(_: S3Client, options: GetObjectAclCommandInput) {
    return new GetObjectAclCommand(options)
  }

  /**
   * Creates S3 "PutObjectAclCommand". Feel free to override this method to
   * manually create the command
   */
  protected createPutObjectAclCommand(_: S3Client, options: PutObjectAclCommandInput) {
    return new PutObjectAclCommand(options)
  }

  /**
   * Creates S3 "DeleteObjectCommand". Feel free to override this method to
   * manually create the command
   */
  protected createDeleteObjectCommand(_: S3Client, options: DeleteObjectCommandInput) {
    return new DeleteObjectCommand(options)
  }

  /**
   * Creates S3 "CopyObjectCommand". Feel free to override this method to
   * manually create the command
   */
  protected createCopyObjectCommand(_: S3Client, options: CopyObjectCommandInput) {
    return new CopyObjectCommand(options)
  }

  /**
   * Creates S3 "ListObjectsV2Command". Feel free to override this method to
   * manually create the command
   */
  protected createListObjectsV2Command(_: S3Client, options: ListObjectsV2CommandInput) {
    return new ListObjectsV2Command(options)
  }

  /**
   * Creates S3 "DeleteObjectsCommand". Feel free to override this method to
   * manually create the command
   */
  protected createDeleteObjectsCommand(_: S3Client, options: DeleteObjectsCommandInput) {
    return new DeleteObjectsCommand(options)
  }

  /**
   * Returns a boolean indicating if the file exists
   * or not.
   */
  async exists(key: string): Promise<boolean> {
    debug('checking if file exists %s:%s', this.options.bucket, key)
    try {
      const response = await this.#client.send(
        this.createHeadObjectCommand(this.#client, {
          Key: key,
          Bucket: this.options.bucket,
        })
      )
      return response.$metadata.httpStatusCode === 200
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Returns the contents of a file as a UTF-8 string. An
   * exception is thrown when object is missing.
   */
  async get(key: string): Promise<string> {
    debug('reading file contents %s:%s', this.options.bucket, key)
    const response = await this.#client.send(
      this.createGetObjectCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
      })
    )

    return response.Body!.transformToString()
  }

  /**
   * Returns the contents of the file as a Readable stream. An
   * exception is thrown when the file is missing.
   */
  async getStream(key: string): Promise<Readable> {
    debug('reading file contents as a stream %s:%s', this.options.bucket, key)
    const response = await this.#client.send(
      this.createGetObjectCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
      })
    )

    return response.Body! as Readable
  }

  /**
   * Returns the contents of the file as an Uint8Array. An
   * exception is thrown when the file is missing.
   */
  async getArrayBuffer(key: string): Promise<ArrayBuffer> {
    debug('reading file contents as array buffer %s:%s', this.options.bucket, key)
    const response = await this.#client.send(
      this.createGetObjectCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
      })
    )

    return response.Body!.transformToByteArray()
  }

  /**
   * Returns the file metadata.
   */
  async getMetaData(key: string): Promise<ObjectMetaData> {
    debug('fetching file metadata %s:%s', this.options.bucket, key)
    const response = await this.#client.send(
      this.createHeadObjectCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
      })
    )

    return this.#createFileMetaData(response)
  }

  /**
   * Returns the visibility of a file
   */
  async getVisibility(key: string): Promise<ObjectVisibility> {
    if (!this.#supportsACL) {
      return this.options.visibility
    }

    debug('fetching file visibility %s:%s', this.options.bucket, key)
    const response = await this.#client.send(
      this.createGetObjectAclCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
      })
    )

    const isPublic = (response.Grants || []).find((grant) => {
      return (
        grant.Grantee?.URI === this.publicGrantUri &&
        (grant.Permission === 'READ' || grant.Permission === 'FULL_CONTROL')
      )
    })

    return isPublic ? 'public' : 'private'
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
      debug('using custom implementation for generating public URL %s:%s', this.options.bucket, key)
      return generateURL(key, this.options.bucket, this.#client)
    }

    debug('generating file URL %s:%s', this.options.bucket, key)

    /**
     * Make sure using CDN URL property
     */
    if (this.options.cdnUrl) {
      return new URL(key, this.options.cdnUrl).toString()
    }

    /**
     * Use endpoint from the config (when available)
     */
    if (this.#client.config.endpoint) {
      const endpoint = await this.#client.config.endpoint()

      return new URL(
        `/${this.options.bucket}/${key}`,
        `${endpoint.protocol}//${endpoint.hostname}`
      ).toString()
    }

    /**
     * Otherwise fallback to AWS based URL
     */
    return new URL(`/${key}`, `https://${this.options.bucket}.s3.amazonaws.com`).toString()
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
    const expires = string.seconds.parse(expiresIn || '30mins')

    /**
     * Options given to the GetObjectCommand when create a signed
     * URL
     */
    const signedURLOptions: GetObjectCommandInput = {
      Key: key,
      Bucket: this.options.bucket,
      ResponseContentType: contentType,
      ResponseContentDisposition: contentDisposition,
      ...rest,
    }

    /**
     * Use custom implementation when exists.
     */
    const generateSignedURL = this.options.urlBuilder?.generateSignedURL
    if (generateSignedURL) {
      debug('using custom implementation for generating signed URL %s:%s', this.options.bucket, key)
      return generateSignedURL(key, signedURLOptions, this.#client)
    }

    debug('generating signed URL %s:%s', this.options.bucket, key)
    return getSignedUrl(this.#client, this.createGetObjectCommand(this.#client, signedURLOptions), {
      expiresIn: expires,
    })
  }

  /**
   * Updates the visibility of a file
   */
  async setVisibility(key: string, visibility: ObjectVisibility): Promise<void> {
    if (!this.#supportsACL) {
      return
    }

    debug('updating file visibility %s:%s to %s', this.options.bucket, key, visibility)
    await this.#client.send(
      this.createPutObjectAclCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
        ACL: visibility === 'public' ? 'public-read' : 'private',
      })
    )
  }

  /**
   * Writes a file to the bucket for the given key and contents.
   */
  async put(
    key: string,
    contents: string | Uint8Array,
    options?: WriteOptions | undefined
  ): Promise<void> {
    debug('creating/updating file %s:%s', this.options.bucket, key)

    const command = this.createPutObjectCommand(this.#client, {
      ...this.#getSaveOptions(key, options),
      Key: key,
      Body: contents,
    })

    await this.#client.send(command)
  }

  /**
   * Writes a file to the bucket for the given key and stream
   */
  putStream(key: string, contents: Readable, options?: WriteOptions | undefined): Promise<void> {
    debug('creating/updating file %s:%s', this.options.bucket, key)

    return new Promise((resolve, reject) => {
      /**
       * GCS internally creates a pipeline of stream and invokes the "_destroy" method
       * at several occassions. Because of that, the "_destroy" method emits an event
       * which cannot handled within this block of code.
       *
       * So the only way I have been able to make GCS streams work is by ditching the
       * pipeline method and relying on the "pipe" method instead.
       */
      contents.once('error', reject)
      const command = this.createPutObjectCommand(this.#client, {
        ...this.#getSaveOptions(key, options),
        Key: key,
        Body: contents,
      })

      return this.#client
        .send(command)
        .then(() => resolve())
        .catch(reject)
    })
  }

  /**
   * Copies the source file to the destination. Both paths must
   * be within the root location.
   */
  async copy(source: string, destination: string, options?: WriteOptions): Promise<void> {
    debug(
      'copying file from %s:%s to %s:%s',
      this.options.bucket,
      source,
      this.options.bucket,
      destination
    )

    options = options || {}

    /**
     * Copy visibility from the source file to the
     * destination when no inline visibility is
     * defined
     */
    if (!options.visibility && this.#supportsACL) {
      options.visibility = await this.getVisibility(source)
    }

    await this.#client.send(
      this.createCopyObjectCommand(this.#client, {
        ...this.#getSaveOptions(destination, options),
        Key: destination,
        CopySource: `/${this.options.bucket}/${source}`,
        Bucket: this.options.bucket,
      })
    )
  }

  /**
   * Moves the source file to the destination. Both paths must
   * be within the root location.
   */
  async move(source: string, destination: string, options?: WriteOptions): Promise<void> {
    debug(
      'moving file from %s:%s to %s:%s',
      this.options.bucket,
      source,
      this.options.bucket,
      destination
    )

    await this.copy(source, destination, options)
    await this.delete(source)
  }

  /**
   * Deletes the object from the bucket
   */
  async delete(key: string) {
    debug('removing file %s:%s', this.options.bucket, key)

    await this.#client.send(
      this.createDeleteObjectCommand(this.#client, {
        Key: key,
        Bucket: this.options.bucket,
      })
    )
  }

  /**
   * Deletes the files and directories matching the provided
   * prefix.
   */
  async deleteAll(prefix: string): Promise<void> {
    debug('removing all files matching prefix %s:%s', this.options.bucket, prefix)
    await this.#deleteFilesRecursively(prefix)
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

    debug('listing all files matching prefix %s:%s', this.options.bucket, prefix)

    const response = await this.#client.send(
      this.createListObjectsV2Command(this.#client, {
        Bucket: this.options.bucket,
        Delimiter: !recursive ? '/' : '',
        ContinuationToken: paginationToken,
        ...(prefix !== '/' ? { Prefix: prefix } : {}),
        ...(maxResults !== undefined ? { MaxKeys: maxResults } : {}),
      })
    )

    /**
     * The generator is used to lazily iterate over files and
     * convert them into DriveFile or DriveDirectory instances
     */
    function* filesGenerator(): Iterator<
      DriveFile | { isFile: false; isDirectory: true; prefix: string; name: string }
    > {
      if (response.CommonPrefixes) {
        for (const directory of response.CommonPrefixes) {
          yield new DriveDirectory(directory.Prefix!.replace(/\/$/, ''))
        }
      }
      if (response.Contents) {
        for (const file of response.Contents) {
          yield new DriveFile(file.Key!, self, self.#createFileMetaData(file))
        }
      }
    }

    return {
      paginationToken: response.NextContinuationToken,
      objects: {
        [Symbol.iterator]: filesGenerator,
      },
    }
  }
}
