import { assert } from '@japa/assert'
import { fileSystem } from '@japa/file-system'
import { configure, processCLIArgs, run } from '@japa/runner'

processCLIArgs(process.argv.splice(2))

configure({
  files: ['tests/**/*.spec.ts'],
  suites: [
    {
      name: 'main',
      files: ['tests/core/*.spec.ts', 'tests/drivers/fs/*.spec.ts'],
    },
    {
      name: 'gcs',
      files: ['tests/drivers/gcs/*.spec.ts'],
    },
  ],
  plugins: [assert(), fileSystem()],
})

run()
