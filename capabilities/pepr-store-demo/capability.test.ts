// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec);
import { K8s, kind } from "kubernetes-fluent-client";


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

function sleep(seconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, seconds * 1000));
}

async function waitFor(pred: () => Promise<boolean>) {
  while (true) { if (await pred()) { break } await sleep(1) }
}

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
      name: runConf.namespace,
      labels: {
        [runConf.labelKey]: runConf.unique
      }
    }
  })
  return Promise.all([ns])
}

beforeAll(async () => {
  await cleanCluster(runConf)
  await setupCluster(runConf)
    
}, 30000) // 30 sec timeout

describe("asdf", () => {
  it("fdsa", async () => {
    const cmd = `npm run --silent dev:logs:msg`
    const {stdout, stderr} = await exec(cmd)
    // const logs = JSON.parse(stdout)
    // expect(logs).toBe('')
    expect(stdout).toBe('')
    expect(stderr).toBe('')
  })
})
