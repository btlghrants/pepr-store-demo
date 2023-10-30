// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as path from 'path';
import { TestRunCfg, synthesizeManifests } from "./TestRunCfg";

import * as helpers from './helpers';
jest.spyOn(helpers, "nearestAncestor").mockImplementation(
  jest.fn() as typeof helpers.nearestAncestor
)
const { secs } = helpers
const { nearestAncestor } = jest.mocked(helpers)

import * as fs from "fs"
jest.mock("fs")
const { readdirSync } = jest.mocked(fs)

import * as pfs from "fs/promises"
jest.mock("fs/promises")
const { writeFile } = jest.mocked(pfs)

import * as child_process from 'child_process';
jest.mock("child_process")
const { exec } = jest.mocked(child_process)

const root = "/fake/root"
const here = `${root}/sub/path`
const name = "capability-name"
const me = `${here}/${name}.test.ts`

describe("TestRunCfg", () => {
  beforeEach(() => {
    nearestAncestor.mockClear().mockImplementation((f, p) => `${root}/${f}`)
    readdirSync.mockClear().mockReturnValue([])
  })

  it("exposes given test file", () => {
    const trc = new TestRunCfg(me)
    expect(trc.me).toBe(me)
  })

  it("derives capability name", () => {
    const trc = new TestRunCfg(me)
    expect(trc.name).toBe(name)
  })

  it("derives capability path", () => {
    const trc = new TestRunCfg(me)
    expect(trc.here).toBe(here)
  })

  it ("determines project root", () => {
    nearestAncestor.mockClear().mockImplementation((f, p) => {
      if (f === "package.json" && p === here) {
        return `${root}/package.json`
      } else { throw "" }
    })
    const trc = new TestRunCfg(me)
    expect(trc.root).toBe(root)
  })

  it ("derives cluster lock file path", () => {
    const lock = `${root}/cluster.lock`
    const trc = new TestRunCfg(me)
    expect(trc.lock).toBe(lock)
  })

  it ("derives cluster module file path", () => {
    const mod = me.replace('.test', '.pepr')
    const trc = new TestRunCfg(me)
    expect(trc.module).toBe(mod)
  })

  it("exposes autogenerated unique string", () => {
    const trc = new TestRunCfg(me)
    expect(trc.unique).toBeTruthy()
  })

  it("exposes given unique string", () => {
    const unique = "set-it-explictly"
    const trc = new TestRunCfg(me, unique)
    expect(trc.unique).toBe(unique)
  })

  it("exposes a capability-and-run-specific namespace", () => {
    const unique = "i-am-so-special"
    const ns = `${path.basename(here)}-${name}-${unique}`
    const trc = new TestRunCfg(me, unique)
    expect(trc.namespace).toBe(ns)
  })

  it("exposes a capability-specific label key", () => {
    const lk = `${name}/test-transient`
    const trc = new TestRunCfg(me)
    expect(trc.labelKey).toBe(lk)
  })

  describe("discovers to-be-applied, index-ordered capability test manifests", () => {
    const files = [
      `${name}.test.0.yaml`,
      `${name}.test.8675309.yaml`,
      `${name}.test.09.yaml`,
      `${name}.test.8.yaml`,
      `${name}.test.1009.yaml`,
      `nope.test.1.yaml`
    ]
    const manifestList = [
      [`${here}/${name}.test.0.yaml`, `${here}/${name}.test.0.yaml.json`],
      [`${here}/${name}.test.8.yaml`, `${here}/${name}.test.8.yaml.json`],
      [`${here}/${name}.test.09.yaml`, `${here}/${name}.test.09.yaml.json`],
      [`${here}/${name}.test.1009.yaml`, `${here}/${name}.test.1009.yaml.json`],
      [`${here}/${name}.test.8675309.yaml`, `${here}/${name}.test.8675309.yaml.json`]
    ]

    beforeEach(() => {
      readdirSync.mockImplementation(
        ( () => files ) as unknown as typeof readdirSync
      )
    })

    it("exposes the ordered manifest lookup list", () => {
      const trc = new TestRunCfg(me)
      expect(trc.manifests).not.toHaveLength(0)
      trc.manifests.forEach((manifest, idx) => {
        const [yaml, json] = manifest
        const [yexp, jexp] = manifestList[idx]
        expect(yaml).toBe(yexp)
        expect(json).toBe(jexp)
      })
    })

    it("exposes json manifest lookup-by-index-number method", () => {
      const trc = new TestRunCfg(me)

      const json = (i: number) => manifestList[i][1]
      expect(trc.manifest(0)).toBe(json(0))
      expect(trc.manifest(8)).toBe(json(1))
      expect(trc.manifest(9)).toBe(json(2))
      expect(trc.manifest(1009)).toBe(json(3))
      expect(trc.manifest(8675309)).toBe(json(4))
    })
  })
})

describe("synthesizeManifests()", () => {
  
  describe("single manifest, single resource", () => {
    it("writes List-wrapped, jsonified resources to file", async () => {
      const manifests = [
        [`${here}/${name}.test.0.yaml`, `${here}/${name}.test.0.yaml.json`],
      ]
      const trc = {
        labelKey: 'lk', manifests, namespace: 'ns', unique: 'uq'
      } as unknown as TestRunCfg

      const original = String.raw`
        {
          "apiVersion": "v1",
          "kind": "ConfigMap",
          "metadata": {
            "annotations": {
                "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"ConfigMap\",\"metadata\":{\"annotations\":{},\"name\":\"cm-alpha\",\"namespace\":\"default\"}}\n"
            },
            "name": "cm-alpha",
            "namespace": "default"
          }
        }
      `
      const modified = JSON.stringify(JSON.parse(String.raw`
        {
          "kind": "List",
          "apiVersion": "v1",
          "items": [
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-alpha",
                "namespace": "${trc.namespace}",
                "labels": {
                  "${trc.labelKey}": "${trc.unique}"
                }
              }
            }
          ]
        }
      `), null, 2)

      exec.mockClear().mockImplementation(((_, cb) => cb(null, ({ stdout: original }))) as unknown as typeof exec)
      writeFile.mockClear()

      await synthesizeManifests(trc)

      expect(writeFile).toHaveBeenCalledWith(trc.manifests[0][1], modified, "utf8")
    }, secs(1))
  })

  describe("multiple manifests, multiple resources", () => {
    it("writes List-wrapped, jsonified resources to file", async () => {
      const manifests = [
        [`${here}/${name}.test.0.yaml`, `${here}/${name}.test.0.yaml.json`],
        [`${here}/${name}.test.1.yaml`, `${here}/${name}.test.1.yaml.json`]
      ]
      const trc = {
        labelKey: 'lk', manifests, namespace: 'ns', unique: 'uq'
      } as unknown as TestRunCfg

      const original_0 = String.raw`
        {
          "kind": "List",
          "apiVersion": "v1",
          "metadata": {},
          "items": [
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "annotations": {
                  "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"ConfigMap\",\"metadata\":{\"annotations\":{},\"name\":\"cm-alpha\",\"namespace\":\"default\"}}\n"
                },
                "name": "cm-alpha",
                "namespace": "default"
              }
            },
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "annotations": {
                  "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"ConfigMap\",\"metadata\":{\"annotations\":{},\"name\":\"cm-bravo\",\"namespace\":\"default\"}}\n"
                },
                "name": "cm-bravo",
                "namespace": "default"
              }
            }
          ]
        }
      `
      const original_1 = String.raw`
        {
          "kind": "List",
          "apiVersion": "v1",
          "metadata": {},
          "items": [
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "annotations": {
                  "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"ConfigMap\",\"metadata\":{\"annotations\":{},\"name\":\"cm-charlie\",\"namespace\":\"default\"}}\n"
                },
                "name": "cm-charlie",
                "namespace": "default"
              }
            },
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "annotations": {
                  "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"ConfigMap\",\"metadata\":{\"annotations\":{},\"name\":\"cm-delta\",\"namespace\":\"default\"}}\n"
                },
                "name": "cm-delta",
                "namespace": "default"
              }
            }
          ]
        }
      `
      const modified_0 = JSON.stringify(JSON.parse(String.raw`
        {
          "kind": "List",
          "apiVersion": "v1",
          "items": [
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-alpha",
                "namespace": "${trc.namespace}",
                "labels": {
                  "${trc.labelKey}": "${trc.unique}"
                }
              }
            },
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-bravo",
                "namespace": "${trc.namespace}",
                "labels": {
                  "${trc.labelKey}": "${trc.unique}"
                }
              }
            }
          ]
        }
      `), null, 2)
      const modified_1 = JSON.stringify(JSON.parse(String.raw`
        {
          "kind": "List",
          "apiVersion": "v1",
          "items": [
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-charlie",
                "namespace": "${trc.namespace}",
                "labels": {
                  "${trc.labelKey}": "${trc.unique}"
                }
              }
            },
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-delta",
                "namespace": "${trc.namespace}",
                "labels": {
                  "${trc.labelKey}": "${trc.unique}"
                }
              }
            }
          ]
        }
      `), null, 2)

      exec.mockClear()
      exec.mockImplementationOnce(((_, cb) => cb(null, ({ stdout: original_0 }))) as unknown as typeof exec)
      exec.mockImplementationOnce(((_, cb) => cb(null, ({ stdout: original_1 }))) as unknown as typeof exec)
      writeFile.mockClear()

      await synthesizeManifests(trc)

      expect(writeFile).toHaveBeenCalledTimes(2)
      expect(writeFile).toHaveBeenNthCalledWith(1, trc.manifests[0][1], modified_0, "utf8")
      expect(writeFile).toHaveBeenNthCalledWith(2, trc.manifests[1][1], modified_1, "utf8")
    }, secs(1))
  })
})