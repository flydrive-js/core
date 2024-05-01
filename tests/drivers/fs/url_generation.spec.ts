/*
 * @flydrive/core
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { FSDriver } from '../../../drivers/fs/driver.js'

test.group('FS Driver | getUrl', () => {
  test('throw error when trying to generate a URL', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await assert.rejects(
      () => fdfs.getUrl(key),
      'Cannot generate URL. The "fs" driver does not support it'
    )
  })

  test('use custom implementation to generate a URL', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({
      location: fs.baseUrl,
      visibility: 'public',
      urlBuilder: {
        async generateURL(fileKey) {
          return `/assets/${fileKey}`
        },
      },
    })

    assert.equal(await fdfs.getUrl(key), '/assets/hello.txt')
  })

  test('throw error when trying to generate a signed URL', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({ location: fs.baseUrl, visibility: 'public' })
    await assert.rejects(
      () => fdfs.getSignedUrl(key),
      'Cannot generate signed URL. The "fs" driver does not support it'
    )
  })

  test('use custom implementation to generate a signed URL', async ({ fs, assert }) => {
    const key = 'hello.txt'

    const fdfs = new FSDriver({
      location: fs.baseUrl,
      visibility: 'public',
      urlBuilder: {
        async generateSignedURL(fileKey) {
          return `/assets/${fileKey}?signature=foo`
        },
      },
    })

    assert.equal(await fdfs.getSignedUrl(key), '/assets/hello.txt?signature=foo')
  })
})
