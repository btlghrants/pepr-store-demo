// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const cp = {
  exec: util.promisify(child_process.exec)
}
import * as path from 'path';
// import { promises as fs } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { mins, secs, untilTrue } from "../helpers/helpers";

class TestRunConfig {
  // root: string;
  // dist: string;
  here: string;
  mod: string;
  unique: string;
  namespace: string;
  labelKey: string;

  constructor(unique: string = new Date().valueOf().toString()) {
    // this.root = child_process.execSync("npm prefix").toString().trim();
    // this.dist = `${this.root}/dist`
    this.here = __dirname
    this.mod = `${this.here}/${path.basename(__filename).replace('.test', '.pepr')}`
    this.unique = unique
    this.namespace = `pepr-store-demo-${unique}`
    this.labelKey = "pepr-store-demo/test-transient"
  }
}
const runConf = new TestRunConfig()

async function cleanCluster(trc: TestRunConfig): Promise<void> {
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

async function setupCluster(trc: TestRunConfig): Promise<any> {
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

beforeAll(async () => {
  await cleanCluster(runConf)
  await setupCluster(runConf)
}, mins(1))

describe("Capability test Module", () => {
  it("builds", async () => {
    await cp.exec(`npx pepr build --entry-point ${runConf.mod}`)
  }, secs(10))

  it("deploys", async () => {
    await cp.exec(`npx pepr deploy --confirm`)
  }, secs(10))

  it("controller ready", async () => {
    await cp.exec(`kubectl rollout status deployment -n pepr-system `)
  }, secs(15))

  it.skip("accepts resources for processing", async () => {
    // await cp.exec(`kubectl rollout status deployment -n pepr-system `)
  }, secs(5))

  it.skip("completes processing", async () => {
    // await cp.exec(`kubectl rollout status deployment -n pepr-system `)
  }, mins(1))
})
