/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { S3Client } from '@aws-sdk/client-s3'

import { S3Driver } from '../../../drivers/s3/driver.js'
import {
  S3_REGION,
  S3_BUCKET,
  S3_ENDPOINT,
  AWS_ACCESS_KEY,
  AWS_ACCESS_SECRET,
  SUPPORTS_ACL,
} from './env.js'
import { deleteS3Objects } from '../../helpers.js'

/**
 * Direct access to S3 client via their SDK
 */
const client = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_ACCESS_SECRET,
  },
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
})

test.group('S3 Driver | listAll | root dir', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('list all files and top-level directories of the matching prefix', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    for (const key of keys) {
      await s3fs.put(key, contents)
    }

    const { objects } = await s3fs.listAll('/')

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

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    for (const key of keys) {
      await s3fs.put(key, contents)
    }

    const { objects } = await s3fs.listAll('/', { recursive: true })
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

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    for (const key of keys) {
      await s3fs.put(key, contents)
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
    const { objects, paginationToken } = await s3fs.listAll('/', {
      recursive: true,
      maxResults: 1,
    })
    assert.containsSubset(expectedResultSet, Array.from(objects))

    /**
     * Page 2
     */
    const { objects: page2Objects, paginationToken: page2PaginationToken } = await s3fs.listAll(
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
    const { objects: page3Objects } = await s3fs.listAll('/', {
      recursive: true,
      maxResults: 1,
      paginationToken: page2PaginationToken,
    })
    assert.containsSubset(expectedResultSet, Array.from(page3Objects))
    assert.notDeepEqual(Array.from(page3Objects), Array.from(page2Objects))
  })
})

test.group('S3 Driver | listAll | nested dir', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('list all files and top-level directories of the matching prefix', async ({ assert }) => {
    const fileName = `${string.random(10)}.txt`
    const keys = [fileName, `foo/bar/${fileName}`, `baz/${fileName}`]
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    for (const key of keys) {
      await s3fs.put(key, contents)
    }

    const { objects } = await s3fs.listAll('foo')
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

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    for (const key of keys) {
      await s3fs.put(key, contents)
    }

    const { objects } = await s3fs.listAll('foo', { recursive: true })
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
