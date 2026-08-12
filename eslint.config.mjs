import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// Next.js 16 removed `next lint`, so ESLint runs through its own CLI and needs
// flat config. This is the former .eslintrc.json ("extends": "next/core-web-vitals"),
// which eslint-config-next v16 exports directly as a flat config array.
const config = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      // Agent worktrees are full checkouts with their own .next output. The
      // '.next/**' pattern above is root-relative and does not reach them, so
      // without this ESLint lints bundled vendor chunks as if they were source.
      '.claude/**',
    ],
  },
  ...nextCoreWebVitals,
]

export default config
