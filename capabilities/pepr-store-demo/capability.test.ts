// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { beforeAll, describe, expect, it } from '@jest/globals';
import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec);
import { K8s, kind } from "kubernetes-fluent-client";


function sleep(seconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, seconds * 1000));
}

async function waitFor(pred: () => Promise<boolean>) {
  while (true) { if (await pred()) { break } await sleep(1) }
}

let testTimestamp = new Date().valueOf().toString()
let testNamespace = `pepr-store-demo-${testTimestamp}`
let testLabel = "pepr-store-demo/test-transient"

beforeAll(async () => {
  let list = await K8s(kind.Namespace).Get()
  let nses = list.items.filter(ns => {
    return ns.metadata.labels[testLabel]
  })
  nses.forEach(async ns => {
    console.log(`Delete Namespace: ${ns.metadata.name}`)
    await K8s(kind.Namespace).Delete(ns)
  })

  const gone = async (ns) => {
    try { await K8s(kind.Namespace).Get(ns.metadata.name) }
    catch (e) { if (e.status === 404) { return Promise.resolve(true)} }
    return Promise.resolve(false)
  }
  const terminating = nses.map(async ns => waitFor(() => gone(ns)))
  await Promise.all(terminating)

  await K8s(kind.Namespace).Apply({
    metadata: { name: testNamespace, labels: { [testLabel]: testTimestamp } }
  })

  // const cmd = `npm run --silent dev:logs:msg`
  // const {stdout, stderr} = await exec(cmd)

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
