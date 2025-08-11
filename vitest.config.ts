import { defineConfig } from "vitest/config"
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    reporters: ['verbose', 'junit'],
    outputFile: {
      verbose: 'stdout',
      junit: 'test-results.xml'
    },
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: [
        'src/**/*.ts',
      ],
      exclude: [
        'dist/**/*',
        'node_modules/**/*',
        'tests/**/*'
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage'
    },
    environment: 'node',
    globals: true
  },
  plugins: [tsconfigPaths()]
})