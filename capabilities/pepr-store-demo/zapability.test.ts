// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const cp = {
  exec: util.promisify(child_process.exec)
}
import { promises as fs } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { mins, secs, untilTrue, waitLock } from "../helpers/helpers";
import { synthesizeManifests, TestRunCfg } from '../helpers/TestRunCfg';
import { buildCapabilityModule, clean, setup } from '../helpers/cluster'

const runConf = new TestRunCfg(__filename)

beforeAll(async () => {
  // Jest runs test files in parallel but we can't guarantee that capabilities
  // will only touch non-global cluster resources, so... we're serializing 
  // cluster access/ownership with a file-based lock
  await waitLock(runConf.lock(), `${runConf.me}:${runConf.unique}`)
}, mins(10))

describe(`Capability Module Test: ${runConf.me}`, () => {

  describe("Cluster", () => {
    it("Clean", async () => await clean(runConf), mins(1))
    it("Prepare", async () => await setup(runConf), secs(1))
  })

  describe("Module", () => {
    let buildDir: string

    it("Build", async () => {
      buildDir = await buildCapabilityModule(runConf)
    }, secs(20))

    it("Deploy", async () => {
      const files = await fs.readdir(buildDir)
      const file = files.filter(f => /pepr-module.*\.yaml/.test(f))[0]
      const yaml = `${buildDir}/${file}`
      await cp.exec(`kubectl apply -f ${yaml}`)
    }, secs(10))

    it("Startup", async () => {
      await cp.exec(`kubectl rollout status deployment -n pepr-system`)
    }, secs(30))
  })

  describe("Scenario", () => {
    describe("Arrange", () => {
      it('Generate test manifests', async () => {
        await synthesizeManifests(runConf)
      }, secs(2))
    })

    describe("Step 0", () => {
      it("Act: create 'cm-zalpha'", async () => {
        await cp.exec(`kubectl apply -f ${runConf.manifest(0)}`)
      }, secs(1))

      it("Assert: 'cm-zalpha' has label 'pepr-store-demoz/touched=true'", async () => {
        const found = async () => {
          let cm: kind.ConfigMap;
          try {
            cm = await K8s(kind.ConfigMap)
              .InNamespace(runConf.namespace())
              .Get("cm-zalpha")
          }
          catch (e) { if (e.status === 404) { return false } else { throw e } }

          const lbl = cm.metadata.labels["pepr-store-demoz/touched"]
          return lbl && lbl === "true"
        }
        await untilTrue(found)
      }, secs(1))
    })

    describe("Step 1", () => {
      it("Act: create 'cm-zbravo'", async () => {
        await cp.exec(`kubectl apply -f ${runConf.manifest(1)}`)
      }, secs(1))

      it("Assert: 'cm-zbravo' has label 'pepr-store-demoz/touched=true'", async () => {
        const found = async () => {
          let cm: kind.ConfigMap;
          try {
            cm = await K8s(kind.ConfigMap)
              .InNamespace(runConf.namespace())
              .Get("cm-zbravo")
          }
          catch (e) { if (e.status === 404) { return false } else { throw e } }

          const lbl = cm.metadata.labels["pepr-store-demoz/touched"]
          return lbl && lbl === "true"
        }
        await untilTrue(found)
      }, secs(1))
    })

  })
})

afterAll(async () => await fs.rm(runConf.lock()))