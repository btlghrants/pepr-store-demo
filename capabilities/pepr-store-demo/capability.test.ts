// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec);
import { K8s, kind } from "kubernetes-fluent-client";
import { waitFor } from "../test.helpers";


class TestRunConfig {
  unique: string;
  namespace: string;
  labelKey: string;

  constructor(ts: string = new Date().valueOf().toString()) {
    this.unique = ts;
    this.namespace = `pepr-store-demo-${ts}`
    this.labelKey = "pepr-store-demo/test-transient"
  }
}
const runConf = new TestRunConfig()

async function cleanCluster(trc: TestRunConfig): Promise<void> {
  const nsList = await K8s(kind.Namespace).Get()
  
  const testNamespaces = nsList.items.filter(ns => {
    return ns.metadata.labels[trc.labelKey]
  })

  testNamespaces.forEach(async ns => { await K8s(kind.Namespace).Delete(ns) })

  const gone = async (ns) => {
    try { await K8s(kind.Namespace).Get(ns.metadata.name) }
    catch (e) { if (e.status === 404) { return Promise.resolve(true)} }
    return Promise.resolve(false)
  }
  const terminating = testNamespaces.map(async ns => waitFor(() => gone(ns)))
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

}, 30000) // 30 sec timeout

describe("example test structure", () => {
  it("builds Pepr Module", () => {
    console.log("a")
  })

  it.skip("deploys Pepr Module", () => {
    console.log("b")
  })

  it.skip("applys trigger manifest", () => {
    console.log("c")
  })

  it.skip("perpares completion resource watch", () => {
    console.log("d")
  })

  it.skip("asserts cluster state", () => {
    console.log("e")
  })
})

// describe("asdf", () => {
//   it("fdsa", async () => {
    // const cmd = `npm run --silent dev:logs:msg`
    // const {stdout, stderr} = await exec(cmd)
    // // const logs = JSON.parse(stdout)
    // // expect(logs).toBe('')
    // expect(stdout).toBe('')
    // expect(stderr).toBe('')
//   })
// })
