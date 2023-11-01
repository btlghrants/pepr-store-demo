import * as util from 'util';
import * as child_process from 'child_process';
const cp = {
  exec: util.promisify(child_process.exec)
}
import * as path from 'path';
import { promises as fs } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { TestRunCfg } from './TestRunCfg';
import { untilTrue } from "./general";

export async function clean(trc: TestRunCfg): Promise<void> {
  const nsList = await K8s(kind.Namespace).Get()
  const nses = nsList.items.filter(ns => {
    return (
      ns.metadata.labels[trc.labelKey()] ||
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

export async function setup(trc: TestRunCfg) {
  const ns = K8s(kind.Namespace).Apply({
    metadata: {
      name: trc.namespace(),
      labels: {
        [trc.labelKey()]: trc.unique
      }
    }
  })
  return Promise.all([
    ns
  ])
}
