/*
 * flydrive
 *
 * (c) FlyDrive
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { KeyNormalizer } from '../../src/key_normalizer.js'

test.group('Key normalizer | Pre normalization', () => {
  test('perform pre-normalization on key "{key}"')
    .with([
      {
        key: 'hello   world',
        output: 'hello world',
      },
      {
        key: 'foo\\bar',
        output: 'foo/bar',
      },
      {
        key: 'foo//bar//baz',
        output: 'foo/bar/baz',
      },
    ])
    .run(({ assert }, { key, output }) => {
      assert.equal(new KeyNormalizer().normalize(key), output)
    })
})

test.group('Key normalizer | Unallowed characters', () => {
  test('throw error when key has unallowed characters "{key}"')
    .with([
      {
        key: 'foo$',
      },
      {
        key: '^foo',
      },
      {
        key: '>foo',
      },
      {
        key: 'bar<',
      },
      {
        key: '{bar}',
      },
      {
        key: '#bar',
      },
      {
        key: 'bar%baz',
      },
      {
        key: '~virk',
      },
      {
        key: 'foo|bar',
      },
      {
        key: 'foo"bar\'',
      },
      {
        key: 'foo@bar',
      },
      {
        key: 'foo&bar',
      },
      {
        key: 'foo+bar',
      },
      {
        key: 'helloworld;',
      },
      {
        key: 'some\0/path.txt',
      },
      {
        key: 's\x09i.js"',
      },
    ])
    .run(({ assert }, { key }) => {
      assert.throws(
        () => new KeyNormalizer().normalize(key),
        `The key "${key}" has unallowed characters`
      )
    })
})

test.group('Key normalizer | Path traversal', () => {
  test('throw error when key leads to path traversal "{key}"')
    .with([
      {
        key: 'something/../../../hehe',
      },
      {
        key: '/something/../../..',
      },
      {
        key: '..',
      },
      {
        key: 'something\\..\\..',
      },
      {
        key: '\\something\\..\\..\\dirname',
      },
      {
        key: '../foo',
      },
      {
        key: 'foo/../back',
      },
      {
        key: 'beyond/root/../.././..',
      },
      {
        key: '/beyond/../..',
      },
      {
        key: '/./../some/dir',
      },
      {
        key: '.../foo/bar',
      },
      {
        key: '\\something\\...\\...\\dirname',
      },
      {
        key: 'beyond/root/.../',
      },
    ])
    .run(({ assert }, { key }) => {
      assert.throws(
        () => new KeyNormalizer().normalize(key),
        `Path traversal segment detected in key "${key}"`
      )
    })
})

test.group('Key normalizer | Post normalization', () => {
  test('perform post-normalization on key "{key}"')
    .with([
      {
        key: '/path/to/dir/.',
        output: 'path/to/dir',
      },
      {
        key: '/dirname/',
        output: 'dirname',
      },
      {
        key: 'dirname./',
        output: 'dirname',
      },
      {
        key: 'dirname/./',
        output: 'dirname',
      },
      {
        key: 'dirname/..txt',
        output: 'dirname/..txt',
      },
      {
        key: 'dirname/.',
        output: 'dirname',
      },
      {
        key: 'dirname!./',
        output: 'dirname!',
      },
      {
        key: '00004869/files/other/10-75..stl',
        output: '00004869/files/other/10-75..stl',
      },
      {
        key: '/dirname//subdir///subsubdir',
        output: 'dirname/subdir/subsubdir',
      },
      {
        key: '\\\\someshared\\\\drive',
        output: 'someshared/drive',
      },
      {
        key: 'C\\dirname\\\\subdir\\\\\\subsubdir',
        output: 'C/dirname/subdir/subsubdir',
      },
      {
        key: '...hello-world',
        output: '..hello-world',
      },
    ])
    .run(({ assert }, { key, output }) => {
      assert.equal(new KeyNormalizer().normalize(key), output)
    })
})

test.group('Key normalizer | Empty strings', () => {
  test('throw error when key leads to an empty string "{key}"')
    .with([
      {
        key: '.',
      },
      {
        key: './',
      },
      {
        key: '.  .',
      },
      {
        key: '  ',
      },
      {
        key: '.   /.',
      },
      {
        key: '.   ./',
      },
      {
        key: '.   /./',
      },
      {
        key: '.   ././',
      },
    ])
    .run(({ assert }, { key }) => {
      assert.throws(
        () => new KeyNormalizer().normalize(key),
        `Invalid key "${key}". After normalization results in an empty string`
      )
    })
})
