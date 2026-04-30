## WOR-70: Unit tests (Vitest) for core helpers

Added comprehensive Vitest unit test suites (124 tests across 6 files) covering the core backend helper modules: state machine transitions, prompt assembly with privacy isolation, privacy response filter (verbatim token matching), transcript compression, token counting, and error code mapping. All tests are deterministic and run via `npm run test:unit`.
