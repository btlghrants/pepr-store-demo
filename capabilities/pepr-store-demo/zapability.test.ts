// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const cp = {
  exec: util.promisify(child_process.exec)
}
import * as path from 'path';
import { promises as fs } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { mins, secs, untilTrue, waitLock } from "../helpers/helpers";
import { TestRunCfg } from '../helpers/TestRunCfg';
import { clean, setup } from '../helpers/cluster'

const runConf = new TestRunCfg(__filename)

async function generateTestManifests(trc: TestRunCfg) {
  for (let [yaml, json] of trc.manifests) {

    // convert yaml manifest to json
    let {stdout} = await cp.exec(
      `kubectl apply -f ${yaml} --dry-run=client --output json`
    )

    // convert json into array of one-or-more js objects
    // see: https://kubernetes.io/docs/reference/using-api/api-concepts/#collections
    let raw = JSON.parse(stdout)
    let resources = (raw.kind === "List" ? raw.items : [ raw ])

    // strip rando fields added by kubectl --dry-run
    resources = resources.map(res => {
      delete res.metadata.annotations
      delete res.metadata.namespace
      return res
    })

    // add test-required fields
    resources = resources.map(res => {
      res.metadata.namespace = trc.namespace
      res.metadata.labels = {...res.metadata.labels, [trc.labelKey]: trc.unique }
      return res
    })

    // re-add client-side (kubectl) `kind: "List"` wrapping
    resources = {"kind": "List", apiVersion: "v1", "items": resources}
    const ready = JSON.stringify(resources, null, 2)
  
    // write to file
    await fs.writeFile(json, ready, "utf8")
  }
}

beforeAll(async () => {
  // Jest runs test files in parallel but we can't guarantee that capabilities
  // will only touch non-global cluster resources, so... we're serializing 
  // cluster access/ownership with a file-based lock
  await waitLock(runConf.lock, `${runConf.me}:${runConf.unique}`)
}, mins(10))

describe(`Capability Module Test: ${runConf.me}`, () => {

  describe("Cluster", () => {
    it("Clean", async () => await clean(runConf), mins(1))
    it("Prepare", async () => await setup(runConf), secs(1))
  })

  describe("Module", () => {
    it("Build", async () => {
      // `pepr build` requires /dist be in project root... hence, all of this ⮧
      // TODO: add a `pepr build --outdir` flag!
      
      // move module pepr.ts "out of the way" (if there is one)
      const rootMod = `${runConf.root}/pepr.ts`
      const rootBak = rootMod.replace('.ts', '.ts.bak')
      if ( await fs.stat(rootMod).catch(() => {}) ) {
        await fs.rename(rootMod, rootBak)
      }

      // move capability module "into the way"
      await fs.copyFile(runConf.module, rootMod)

      // modify capability module source to "fit" in new location
      let content = await fs.readFile(rootMod, "utf8")

      content = content.replace(/(\.\.\/)+package.json/, "./package.json")
      
      let capa = path.basename(runConf.me).replace('.test.ts', '')
      let relPath = runConf.me.replace(runConf.root, '').replace('.test.ts', '')
      content = content.replace(new RegExp(`./${capa}`), `.${relPath}`)

      await fs.writeFile(rootMod, content)

      // build
      await cp.exec(`npx pepr build`)

      // move capability module "out the way"
      await fs.rm(rootMod)

      // move module pepr.ts back "into the way" (if there was one)
      if ( await fs.stat(rootBak).catch(() => {}) ) {
        await fs.rename(rootBak, rootMod)
      }
    }, secs(20))

    it("Deploy", async () => {
      const buildDir = `${runConf.root}/dist/`
      const files = await fs.readdir(buildDir)
      const file = files.filter(f => /pepr-module.*\.yaml/.test(f))[0]
      const yaml = `${buildDir}${file}`
      await cp.exec(`kubectl apply -f ${yaml}`)
    }, secs(10))

    it("Startup", async () => {
      await cp.exec(`kubectl rollout status deployment -n pepr-system`)
    }, secs(30))
  })

  describe("Scenario", () => {
    describe("Arrange", () => {
      it('Generate test manifests', async () => {
        await generateTestManifests(runConf)
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
              .InNamespace(runConf.namespace)
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
              .InNamespace(runConf.namespace)
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

afterAll(async () => await fs.rm(runConf.lock))