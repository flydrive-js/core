/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import getStream from 'get-stream'
import { test } from '@japa/runner'
import { createReadStream } from 'node:fs'
import string from '@poppinss/utils/string'
import { GetObjectAclCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

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

test.group('S3 Driver | put', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('create file at the destination', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(await getStream(response.Body), contents)
  })

  test('create file from Uint8Array', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, new TextEncoder().encode(contents))

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(await getStream(response.Body), contents)
  })

  test('overwrite contents of existing file', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'
    const newContents = 'Hi world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)
    await s3fs.put(key, newContents)

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(await getStream(response.Body), newContents)
  })

  test('create files at a nested destination', async ({ assert }) => {
    const key = `users/1/${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents)

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(await getStream(response.Body), contents)
  })

  test('create file with custom metadata', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents, {
      contentType: 'image/png',
      cacheControl: 'no-cache',
      contentEncoding: 'binary',
    })

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(response.ContentType, 'image/png')
    assert.equal(response.ContentEncoding, 'binary')
    assert.equal(response.CacheControl, 'no-cache')
  })

  test('create file with local visibility', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents, {
      contentType: 'image/png',
      cacheControl: 'no-cache',
      contentEncoding: 'binary',
    })

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectAclCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(
      response.Grants?.find(
        (grant) => grant.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AllUsers'
      )?.Permission,
      'READ'
    )
  }).skip(!SUPPORTS_ACL, 'Service does not support ACL. Hence, we cannot control file visibility')

  test('create file with inline local visibility', async ({ assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await s3fs.put(key, contents, {
      contentType: 'image/png',
      cacheControl: 'no-cache',
      contentEncoding: 'binary',
      visibility: 'private',
    })

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectAclCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(
      response.Grants?.find(
        (grant) => grant.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AllUsers'
      )?.Permission,
      undefined
    )
  }).skip(!SUPPORTS_ACL, 'Service does not support ACL. Hence, we cannot control file visibility')
})

test.group('S3 Driver | putStream', (group) => {
  group.each.setup(() => {
    return async () => {
      await deleteS3Objects(client, S3_BUCKET, '/')
    }
  })
  group.each.timeout(10_000)

  test('create file from readable stream', async ({ fs, assert }) => {
    const key = `${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await fs.create(key, contents)
    await s3fs.putStream(key, createReadStream(join(fs.basePath, key)))

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(await getStream(response.Body), contents)
  })

  test('create files at a nested destination', async ({ fs, assert }) => {
    const key = `users/1/${string.random(10)}.txt`
    const contents = 'Hello world'

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await fs.create(key, contents)
    await s3fs.putStream(key, createReadStream(join(fs.basePath, key)))

    /**
     * Verify put operation
     */
    const response = await client.send(new GetObjectCommand({ Key: key, Bucket: S3_BUCKET }))
    assert.equal(await getStream(response.Body), contents)
  })

  test('throw error when source stream returns an error', async ({ fs, assert }) => {
    const key = `users/1/${string.random(10)}.txt`

    const s3fs = new S3Driver({
      visibility: 'public',
      client: client,
      bucket: S3_BUCKET,
      supportsACL: SUPPORTS_ACL,
    })

    await assert.rejects(async () => {
      await s3fs.putStream(key, createReadStream(join(fs.basePath, key)))
    }, /UnknownError|no such file or directory/)
  })
})
