// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { describe, expect, it, jest } from '@jest/globals';
import { secs } from "./helpers";
import { synthesizeManifests } from './module'
import { TestRunCfg } from './TestRunCfg';

import * as pfs from "fs/promises"
jest.mock("fs/promises")
const { writeFile } = jest.mocked(pfs)

import * as child_process from 'child_process';
jest.mock("child_process")
const { exec } = jest.mocked(child_process)

describe.skip("build()", () => {
  it("is going to be obsolete soon (once the --output-dir flag is released!)", () => {
    expect("TODO").toBe("DONE")
  })
})

describe.skip("deploy()", () => {
  it("???", () => {
    expect("TODO").toBe("DONE")
  })
})

describe.skip("ready()", () => {
  it("???", () => {
    expect("TODO").toBe("DONE")
  })
})

describe("synthesizeManifests()", () => {
  const root = "/fake/root"
  const here = `${root}/sub/path`
  const name = "capability-name"
  const me = `${here}/${name}.test.ts`

  describe("single manifest, single resource", () => {
    it("writes List-wrapped, jsonified resources to file", async () => {
      const manifests = () => [
        [`${here}/${name}.test.0.yaml`, `${here}/${name}.test.0.yaml.json`],
      ]
      const trc = {
        unique: 'uq',
        manifests,
        labelKey: () => 'lk',
        namespace: () => 'ns',
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
                "namespace": "${trc.namespace()}",
                "labels": {
                  "${trc.labelKey()}": "${trc.unique}"
                }
              }
            }
          ]
        }
      `), null, 2)

      exec.mockClear().mockImplementation((
        (_, cb) => cb(null, ({ stdout: original }))
      ) as unknown as typeof exec)
      writeFile.mockClear()

      await synthesizeManifests(trc)

      expect(writeFile).toHaveBeenCalledWith(trc.manifests()[0][1], modified, "utf8")
    }, secs(1))
  })

  describe("multiple manifests, multiple resources", () => {
    it("writes List-wrapped, jsonified resources to file", async () => {
      const manifests = () => [
        [`${here}/${name}.test.0.yaml`, `${here}/${name}.test.0.yaml.json`],
        [`${here}/${name}.test.1.yaml`, `${here}/${name}.test.1.yaml.json`]
      ]
      const trc = {
        unique: 'uq',
        manifests,
        labelKey: () => 'lk',
        namespace: () => 'ns'
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
                "namespace": "${trc.namespace()}",
                "labels": {
                  "${trc.labelKey()}": "${trc.unique}"
                }
              }
            },
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-bravo",
                "namespace": "${trc.namespace()}",
                "labels": {
                  "${trc.labelKey()}": "${trc.unique}"
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
                "namespace": "${trc.namespace()}",
                "labels": {
                  "${trc.labelKey()}": "${trc.unique}"
                }
              }
            },
            {
              "apiVersion": "v1",
              "kind": "ConfigMap",
              "metadata": {
                "name": "cm-delta",
                "namespace": "${trc.namespace()}",
                "labels": {
                  "${trc.labelKey()}": "${trc.unique}"
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
      expect(writeFile).toHaveBeenNthCalledWith(1, trc.manifests()[0][1], modified_0, "utf8")
      expect(writeFile).toHaveBeenNthCalledWith(2, trc.manifests()[1][1], modified_1, "utf8")
    }, secs(1))
  })
})