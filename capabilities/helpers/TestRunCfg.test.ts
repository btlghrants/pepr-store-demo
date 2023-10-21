// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import {
  beforeEach,
  describe, expect, it,
  jest
} from '@jest/globals';
import * as path from 'path';
import { TestRunCfg } from "./TestRunCfg";

import * as rawHelpers from "./helpers"
jest.mock("./helpers")
const helpers = jest.mocked(rawHelpers)

import * as rawFs from "fs"
jest.mock("fs")
const fs = jest.mocked(rawFs)

describe("TestRunCfg", () => {
  const root = "/sys/root"
  const here = `${root}/sub/path`
  const name = "capability-name"
  const me = `${here}/${name}.test.ts`

  beforeEach(() => {
    helpers.nearestAncestor.mockClear().mockImplementation((f, p) => `${root}/${f}`)
    fs.readdirSync.mockClear().mockReturnValue([])
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
    helpers.nearestAncestor.mockClear().mockImplementation((f, p) => {
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
      // HACK: can't figure out how to get typescript to recognize the perfectly
      //  valid string[]-returning signature for this mock, so... basically just
      //  telling typescript "This is _exactly_ what you say it is! *wink wink*"
      //  while still returning the string[] the implementation expects.
      fs.readdirSync.mockClear().mockReturnValue(files as unknown as rawFs.Dirent[])
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