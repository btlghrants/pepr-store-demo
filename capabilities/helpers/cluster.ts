import * as util from 'util';
import * as child_process from 'child_process';
const cp = {
  exec: util.promisify(child_process.exec)
}
import * as path from 'path';
import { promises as fs } from 'fs';
import { K8s, kind } from "kubernetes-fluent-client";
import { TestRunCfg } from './TestRunCfg';
import { untilTrue } from "./helpers";

export async function clean(trc: TestRunCfg): Promise<void> {
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

export async function setup(trc: TestRunCfg) {
  const ns = K8s(kind.Namespace).Apply({
    metadata: {
      name: trc.namespace,
      labels: {
        [trc.labelKey]: trc.unique
      }
    }
  })
  return Promise.all([
    ns
  ])
}

export async function buildCapabilityModule(trc: TestRunCfg): Promise<string> {
  // `pepr build` requires /dist be in project root... hence, all of this ⮧
  // TODO: add a `pepr build --outdir` flag!

  // move module pepr.ts "out of the way" (if there is one)
  const rootMod = `${trc.root}/pepr.ts`
  const rootBak = rootMod.replace('.ts', '.ts.bak')
  if ( await fs.stat(rootMod).catch(() => {}) ) {
    await fs.rename(rootMod, rootBak)
  }

  // move capability module "into the way"
  await fs.copyFile(trc.module, rootMod)

  // modify capability module source to "fit" in new location
  let content = await fs.readFile(rootMod, "utf8")

  content = content.replace(/(\.\.\/)+package.json/, "./package.json")

  let capa = path.basename(trc.me).replace('.test.ts', '')
  let relPath = trc.me.replace(trc.root, '').replace('.test.ts', '')
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

  return `${trc.root}/dist`
}