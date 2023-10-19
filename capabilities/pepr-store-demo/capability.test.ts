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
import { readdirSync } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { mins, secs, untilTrue, waitLock } from "../helpers/helpers";

class TestRunCfg {
  me: string;
  here: string;
  root: string;
  lock: string;
  module: string;
  manifests: [string, string][];
  unique: string;
  namespace: string;
  labelKey: string;

  constructor(unique: string = new Date().valueOf().toString()) {
    this.me = __filename
    this.here = __dirname
    this.root = process.cwd()
    this.lock = `${this.root}/cluster.lock`
    this.module = `${this.me.replace('.test', '.pepr')}`
    this.manifests = readdirSync(this.here)
      .filter(f => /\.test\.\d+\.yaml$/.test(f))
      .sort((l, r) => {
        let lnum = parseInt(l.match(/test\.(\d+)\.yaml/)[1])
        let rnum = parseInt(r.match(/test\.(\d+)\.yaml/)[1])
        return lnum === rnum
          ? 0
          : lnum < rnum ? -1 : 1
      })
      .map(f => [
        `${this.here}/${f}`,
        `${this.here}/${f.concat(".json")}`
      ])
    this.unique = unique
    this.namespace = `pepr-store-demo-${unique}`
    this.labelKey = "pepr-store-demo/test-transient"
  }

  manifest(index: number): string {
    return this.manifests[index][1]
  }
}
const runConf = new TestRunCfg()

async function cleanCluster(trc: TestRunCfg): Promise<void> {
  const nsList = await K8s(kind.Namespace).Get()
  const nses = nsList.items.filter(ns => {
    return (
      ns.metadata.labels[trc.labelKey] ||
      ns.metadata.name === "pepr-system"
    )
  })
  nses.forEach(async ns => {
    await K8s(kind.Namespace).Delete(ns)
  })

  const nsGone = async (ns) => {
    try { await K8s(kind.Namespace).Get(ns.metadata.name) }
    catch (e) { if (e.status === 404) { return Promise.resolve(true)} }
    return Promise.resolve(false)
  }

  let terminating = nses.map(ns => untilTrue(() => nsGone(ns)))
  await Promise.all(terminating)
}

async function setupCluster(trc: TestRunCfg): Promise<any> {
  const ns = K8s(kind.Namespace).Apply({
    metadata: {
      name: trc.namespace,
      labels: {
        [trc.labelKey]: trc.unique
      }
    }
  })
  return Promise.all([ns])
}

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
})

describe(`Capability Module Test: ${runConf.me}`, () => {

  describe("Cluster", () => {
    it("Clean", async () => {
      await cleanCluster(runConf)
    }, mins(1))

    it("Prepare", async () => {
      await setupCluster(runConf)
    }, secs(1))
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
    }, secs(10))

    it("Deploy", async () => {
      const buildDir = `${runConf.root}/dist/`
      const files = await fs.readdir(buildDir)
      const file = files.filter(f => /pepr-module.*\.yaml/.test(f))[0]
      const yaml = `${buildDir}${file}`
      await cp.exec(`kubectl apply -f ${yaml}`)
    }, secs(10))

    it("Startup", async () => {
      await cp.exec(`kubectl rollout status deployment -n pepr-system`)
    }, secs(15))
  })

  describe("Scenario", () => {
    describe("Arrange", () => {
      it('Generate test manifests', async () => {
        await generateTestManifests(runConf)
      }, secs(2))
    })

    describe("Step 0", () => {
      it("Act: create 'cm-alpha'", async () => {
        await cp.exec(`kubectl apply -f ${runConf.manifest(0)}`)
      }, secs(1))

      it("Assert: 'cm-alpha' has label 'pepr-store-demo/touched=true'", async () => {
        const found = async () => {
          const cm = await K8s(kind.ConfigMap)
            .InNamespace(runConf.namespace)
            .Get("cm-alpha")

            const lbl = cm.metadata.labels["pepr-store-demo/touched"]
            return lbl && lbl === "true"
        }
        await untilTrue(found)
      }, secs(1))
    })

    describe("Step 1", () => {
      it("Act: create 'cm-bravo'", async () => {
        await cp.exec(`kubectl apply -f ${runConf.manifest(1)}`)
      }, secs(1))

      it("Assert: 'cm-bravo' has label 'pepr-store-demo/touched=true'", async () => {
        const found = async () => {
          const cm = await K8s(kind.ConfigMap)
            .InNamespace(runConf.namespace)
            .Get("cm-bravo")

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

afterAll(async () => {
  await fs.rm(runConf.lock)
})