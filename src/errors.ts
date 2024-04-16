/*
 * @adonisjs/drive
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createError } from '@poppinss/utils'

/**
 * Unable to write file to the destination
 */
// export const E_CANNOT_WRITE_FILE = createError<[key: string]>(
//   'Cannot write file at location "%s"',
//   'E_CANNOT_WRITE_FILE'
// )

// /**
//  * Unable to read file
//  */
// export const E_CANNOT_READ_FILE = createError<[key: string]>(
//   'Cannot read file from location "%s"',
//   'E_CANNOT_READ_FILE'
// )

// /**
//  * Unable to delete file
//  */
// export const E_CANNOT_DELETE_FILE = createError<[key: string]>(
//   'Cannot delete file at location "%s"',
//   'E_CANNOT_DELETE_FILE'
// )

// /**
//  * Unable to delete directory
//  */
// export const E_CANNOT_DELETE_DIRECTORY = createError<[key: string]>(
//   'Cannot delete directory at location "%s"',
//   'E_CANNOT_DELETE_FILE'
// )

// /**
//  * Unable to copy file
//  */
// export const E_CANNOT_COPY_FILE = createError<[source: string, destination: string]>(
//   'Cannot copy file from "%s" to "%s"',
//   'E_CANNOT_COPY_FILE'
// )

// /**
//  * Unable to move file
//  */
// export const E_CANNOT_MOVE_FILE = createError<[source: string, destination: string]>(
//   'Cannot move file from "%s" to "%s"',
//   'E_CANNOT_MOVE_FILE'
// )

// /**
//  * Unable to check the location of the file
//  */
// export const E_CANNOT_CHECK_FILE_EXISTENCE = createError<[key: string]>(
//   'Unable to check existence for file at location "%s"',
//   'E_CANNOT_CHECK_FILE_EXISTENCE'
// )

// /**
//  * Unable to get file metadata
//  */
// export const E_CANNOT_GET_METADATA = createError<[action: string, key: string]>(
//   'Unable to perform action "%s" on file at location "%s"',
//   'E_CANNOT_GET_METADATA'
// )

// /**
//  * Unable to set file visibility
//  */
// export const E_CANNOT_SET_VISIBILITY = createError<[action: string, key: string]>(
//   'Unable to set visibility for file at location "%s"',
//   'E_CANNOT_SET_VISIBILITY'
// )

// /**
//  * Unable to generate URL for a file
//  */
// export const E_CANNOT_GENERATE_URL = createError<[action: string, key: string]>(
//   'Cannot generate URL for file at location "%s"',
//   'E_CANNOT_GENERATE_URL'
// )

/**
 * The file key has unallowed set of characters
 */
export const E_UNALLOWED_CHARACTERS = createError<[key: string]>(
  'The key "%s" has unallowed characters',
  'E_UNALLOWED_CHARACTERS'
)

/**
 * Key post normalization leads to an empty string
 */
export const E_INVALID_KEY = createError<[key: string]>(
  'Invalid key "%s". After normalization results in an empty string',
  'E_INVALID_KEY'
)

/**
 * The file key has unallowed set of characters
 */
export const E_PATH_TRAVERSAL_DETECTED = createError<[key: string]>(
  'Path traversal segment detected in key "%s"',
  'E_PATH_TRAVERSAL_DETECTED'
)
