// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec)
import { promises as fs } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { mins, secs, untilTrue, waitLock } from "../helpers/general";
import { TestRunCfg } from '../helpers/TestRunCfg';
import { clean, setup } from '../helpers/cluster';
import { build, deploy, ready, synthesizeManifests } from '../helpers/module';

const runConf = new TestRunCfg(__filename)

beforeAll(async () => {
  // Jest runs test files in parallel but we can't guarantee that capabilities
  // will only touch non-global cluster resources, so... we're serializing 
  // cluster access/ownership with a file-based lock
  await waitLock(runConf.lockfile(), `${runConf.me}:${runConf.unique}`)
}, mins(10))

describe(`Capability Module Test: ${runConf.me}`, () => {

  describe("Cluster", () => {
    it("Clean", async () => { await clean(runConf) }, mins(1))
    it("Prepare", async () => { await setup(runConf) }, secs(1))
  })

  describe("Module", () => {
    let buildDir: string
    it("Build", async () => { buildDir = await build(runConf) }, secs(20))
    it("Deploy", async () => { await deploy(buildDir) }, secs(10))
    it("Startup", async () => { await ready() }, secs(30))
  })

  describe("Scenario", () => {
    describe("Arrange", () => {
      it('Synthesize test manifests', async () => {
        await synthesizeManifests(runConf)
      }, secs(2))
    })

    describe("Step 0", () => {
      it("Act: create 'cm-alpha'", async () => {
        await exec(`kubectl apply -f ${runConf.manifest(0)}`)
      }, secs(1))

      it("Assert: 'cm-alpha' has label 'pepr-store-demo/touched=true'", async () => {
        const found = async () => {
          let cm: kind.ConfigMap;
          try {
            cm = await K8s(kind.ConfigMap)
              .InNamespace(runConf.namespace())
              .Get("cm-alpha")
          }
          catch (e) { if (e.status === 404) { return false } else { throw e } }

          const lbl = cm.metadata.labels["pepr-store-demo/touched"]
          return lbl && lbl === "true"
        }
        await untilTrue(found)
      }, secs(1))
    })

    describe("Step 1", () => {
      it("Act: create 'cm-bravo'", async () => {
        await exec(`kubectl apply -f ${runConf.manifest(1)}`)
      }, secs(1))

      it("Assert: 'cm-bravo' has label 'pepr-store-demo/touched=true'", async () => {
        const found = async () => {
          let cm: kind.ConfigMap;
          try {
            cm = await K8s(kind.ConfigMap)
              .InNamespace(runConf.namespace())
              .Get("cm-bravo")
          }
          catch (e) { if (e.status === 404) { return false } else { throw e } }

          const lbl = cm.metadata.labels["pepr-store-demo/touched"]
          return lbl && lbl === "true"
        }
        await untilTrue(found)
      }, secs(1))
    })

  })

  // describe("Assert", () => {
  //   it("sees a 'pepr-store-demo/touched=true' label on 'cm-alpha'", async () => {
  //     // wait for success conditions!
  //   }, secs(30))

  //   it("sees a '' label on 'cm-alpha'", async () => {
  //     // wait for success conditions!
  //   }, mins(1))

  //   // TODO: add an update / delete test... which will mean update/delete.test.yaml
  //   //  files & running them in order, etc.

  //   // TODO: assert on some hook log

  //   // TODO: do something with the Store (finally!)
  // })
})

afterAll(async () => await fs.rm(runConf.lockfile()))