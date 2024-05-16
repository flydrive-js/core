/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { Storage } from '@google-cloud/storage'
import { GCS_BUCKET, GCS_KEY } from './env.js'
import { GCSDriver } from '../../../drivers/gcs/driver.js'

/**
 * Direct access to Google cloud storage bucket
 * via their SDK
 */
const bucket = new Storage({
  credentials: GCS_KEY,
}).bucket(GCS_BUCKET)

test.group('GCS Driver | listAll | root dir', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('list all files and top-level directories of the matching prefix', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    for (const key of keys) {
      await fdgcs.put(key, contents)
    }

    const { objects } = await fdgcs.listAll('/')

    assert.includeDeepMembers(Array.from(objects), [
      {
        isDirectory: true,
        isFile: false,
        name: 'baz',
        prefix: 'baz',
      },
      {
        isDirectory: true,
        isFile: false,
        name: 'foo',
        prefix: 'foo',
      },
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: fileName,
      },
    ])
  })

  test('list all files recursively', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    for (const key of keys) {
      await fdgcs.put(key, contents)
    }

    const { objects } = await fdgcs.listAll('/', { recursive: true })
    assert.includeDeepMembers(Array.from(objects), [
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: `baz/${fileName}`,
      },
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: `foo/bar/${fileName}`,
      },
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: fileName,
      },
    ])
  })

  test('paginate recursive results', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    for (const key of keys) {
      await fdgcs.put(key, contents)
    }

    /**
     * The expected result set. We compare the response to be a subset
     * of the expected result.
     *
     * We use this approach over "deepEqual" because the order of objects
     * is not guaranteed by GCS
     */
    const expectedResultSet = [
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: `foo/bar/${fileName}`,
      },
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: `baz/${fileName}`,
      },
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: fileName,
      },
    ]

    /**
     * Page 1
     */
    const { objects, paginationToken } = await fdgcs.listAll('/', {
      recursive: true,
      maxResults: 1,
    })
    assert.containsSubset(expectedResultSet, Array.from(objects))

    /**
     * Page 2
     */
    const { objects: page2Objects, paginationToken: page2PaginationToken } = await fdgcs.listAll(
      '/',
      {
        recursive: true,
        maxResults: 1,
        paginationToken,
      }
    )
    assert.containsSubset(expectedResultSet, Array.from(page2Objects))
    assert.notDeepEqual(Array.from(page2Objects), Array.from(objects))

    /**
     * Page 3
     */
    const { objects: page3Objects } = await fdgcs.listAll('/', {
      recursive: true,
      maxResults: 1,
      paginationToken: page2PaginationToken,
    })
    assert.containsSubset(expectedResultSet, Array.from(page3Objects))
    assert.notDeepEqual(Array.from(page3Objects), Array.from(page2Objects))
  })
})

test.group('GCS Driver | listAll | nested dir', (group) => {
  group.each.setup(() => {
    return async () => {
      await bucket.deleteFiles()
    }
  })
  group.each.timeout(10_000)

  test('list all files and top-level directories of the matching prefix', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    for (const key of keys) {
      await fdgcs.put(key, contents)
    }

    const { objects } = await fdgcs.listAll('foo')
    assert.includeDeepMembers(Array.from(objects), [
      {
        isDirectory: true,
        isFile: false,
        name: 'bar',
        prefix: 'foo/bar',
      },
    ])
  })

  test('list all files recursively', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const fdgcs = new GCSDriver({
      visibility: 'public',
      bucket: GCS_BUCKET,
      credentials: GCS_KEY,
    })

    for (const key of keys) {
      await fdgcs.put(key, contents)
    }

    const { objects } = await fdgcs.listAll('foo', { recursive: true })
    assert.includeDeepMembers(Array.from(objects), [
      {
        isDirectory: false,
        isFile: true,
        name: fileName,
        key: `foo/bar/${fileName}`,
      },
    ])
  })
})
