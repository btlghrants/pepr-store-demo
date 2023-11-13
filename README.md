# Pepr Module

This is a Pepr Module. [Pepr](https://github.com/defenseunicorns/pepr) is a type-safe Kubernetes middleware system.

The `capabilities` directory contains all the capabilities for this module. By default,
a capability is a single typescript file in the format of `capability-name.ts` that is
imported in the root `pepr.ts` file as `import { HelloPepr } from "./capabilities/hello-pepr";`.
Because this is typescript, you can organize this however you choose, e.g. creating a sub-folder
per-capability or common logic in shared files or folders.

Example Structure:

```
Module Root
├── package.json
├── pepr.ts
└── capabilities
    ├── example-one.ts
    ├── example-three.ts
    └── example-two.ts
```

# TODOs

- Refactor
  - update cleanup() between tests based on applied resource types + transient tag

  - remove test namespace from suite / TestRunCfg

  - make test helper package to contain helper funcs

  - final review & refactor to normalize mock patterns
    - TestRunCfg has some nice patterns for whole-module mocks & partial module mocks (w/ spyOn())
    - formalize / document folder structure for <root>/capabilities/<named-set>/capability.*.ts
      - make test helpers that define/assume this sort of layout
        - make them easy to read/grok/use

- test wiring for Pepr Modules..?
  - As a Capability Developer
    I want new Modules to come with test wiring
    So that Capability testing is easy to get started with

  - write some tests to exercise:
    - ✓ create test-run-scoped/-named namespace
    - remove remove any pre-existing capability-scoped Pepr Modules from cluster
      - how though..?
    - create capability-scoped test Module file which should:
      - * imports only a single capability (for purity of testing)
    - deploy test Module to cluster
    - wait for test Module controller to load
    - apply capability action-triggering resource (e.g. ConfigMap)
    - waitFor capability action-completion resource (e.g. ConfigMap)
      - add timeout param (so tests don't hang forever)
      - add tests for helpers.waitFor (etc.)
    - assert on resulting cluster state

- investigate Pepr Store
  - temporal dead-zone at startup
    - how to wait for load..?
  - availablilty in hooks / capability / action scopes
  - how _exactly_ to share state across capabilities
  - how to write-then-wait to store
    - ...so code execution can continue _after_ write is durable!

- is Pepr Store WebStorage API -compabible or _-inspired_?
  - WebStorage API is synchronous (https://dev.to/shivarajnaidu/a-new-async-key-value-local-storage-for-web-jb)\
  - ...is Pepr Store synchronous?

- setItem() -> subscribe() -> on data seen -> unsubscribe()
  - try it!

- onReady()
  - exercise it!
  - what happens if I try to hit it before it's "ready"?

- how to I "do stuff" with the Store from Module Hooks..?
  - I seem to need the Capability to exist so I can pull the Store from it!
