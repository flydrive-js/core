/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { slash } from '@poppinss/utils'
import { normalize } from 'node:path/posix'
import string from '@poppinss/utils/string'

import * as errors from './errors.js'

/**
 * Key normalizer normalizes the key for writing and reading files. It
 * removes unsafe characters from a string that are either not allowed
 * by cloud providers, or can conflict with a URL.
 *
 * The keys are also scanned and protected from path traversal.
 */
export class KeyNormalizer {
  /**
   * The set of allowed characters. Key free to re-assign a new
   * value
   */
  static allowedCharacterSet = /^[A-Za-z0-9-_!\/\.\s]*$/

  /**
   * Normalizes the key by condensing whitespaces, using unix
   * slashes, and replacing consecutive slashes with one
   * slash ("/").
   */
  #preNormalize(key: string): string {
    /**
     * Condense whitespaces into one
     */
    let normalizedKey = string.condenseWhitespace(key)

    /**
     * - Normalize slashes to unix style
     * - Remove consecutive '/'
     * - Remove more than two dots + slash "..../" to "../"
     */
    return slash(normalizedKey)
      .replace(/\/{2,}/g, '/')
      .replace(/\.{3,}\//g, '../')
  }

  /**
   * Validates the key to check for unallowed characters
   */
  #validateCharacterSet(key: string, originalKey: string) {
    if (!KeyNormalizer.allowedCharacterSet.test(key)) {
      throw new errors.E_UNALLOWED_CHARACTERS([originalKey])
    }
  }

  /**
   * Checks for path traversel in key
   */
  #checkForPathTraversal(key: string, originalKey: string) {
    const tokens = key.split('/')
    for (let token of tokens) {
      if (token === '..') {
        throw new errors.E_PATH_TRAVERSAL_DETECTED([originalKey])
      }
    }
  }

  /**
   * Further normalizing the key after validating it. Here we remove
   * starting and ending path expressions like "." and "/" from
   * the key.
   */
  #postNormalize(key: string) {
    /**
     * Normalize key by removing consecutive path expressions. For example
     *
     * - "dir/." will convert to "dir"
     * - "dir/./" will convert to "dir/"
     *
     * Note
     * Do not call this method before validating for path traversal
     */
    let normalizedKey = normalize(key)

    /**
     * Remove leading and ending '/'
     * Remove leading and ending "."
     */
    return normalizedKey.replace(/^\/|\/$/g, '').replace(/^\.|\.$/g, '')
  }

  /**
   * Normalize the key
   */
  normalize(key: string) {
    let normalizedKey = this.#preNormalize(key)

    /**
     * Validating the key after pre-processing it with
     * some rules
     */
    this.#validateCharacterSet(normalizedKey, key)
    this.#checkForPathTraversal(normalizedKey, key)

    /**
     * Performing post normalization after the key passes
     * the validations
     */
    normalizedKey = this.#postNormalize(normalizedKey)

    /**
     * Post normalization sometimes can lead to an empty string
     */
    if (normalizedKey.trim() === '') {
      throw new errors.E_INVALID_KEY([key])
    }

    return normalizedKey
  }
}
