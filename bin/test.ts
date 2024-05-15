import { assert } from '@japa/assert'
import { fileSystem } from '@japa/file-system'
import { configure, processCLIArgs, run } from '@japa/runner'

processCLIArgs(process.argv.splice(2))

configure({
  suites: [
    {
      name: 'main',
      files: ['tests/core/*.spec.ts', 'tests/drivers/fs/*.spec.ts'],
    },
    {
      name: 'gcs',
      files: ['tests/drivers/gcs/*.spec.ts'],
    },
    {
      name: 's3',
      files: ['tests/drivers/s3/*.spec.ts'],
    },
  ],
  plugins: [assert(), fileSystem()],
})

run()
