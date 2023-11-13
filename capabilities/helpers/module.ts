import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec)
import * as path from 'path';
import * as pfs from 'fs/promises';
import { TestRunCfg } from './TestRunCfg';

export async function build(trc: TestRunCfg) {
  // `pepr build` requires /dist be in project root... hence, all of this ⮧
  // TODO: add a `pepr build --outdir` flag!

  // move module pepr.ts "out of the way" (if there is one)
  const rootMod = `${trc.root()}/pepr.ts`
  const rootBak = rootMod.replace('.ts', '.ts.bak')
  if ( await pfs.stat(rootMod).catch(() => {}) ) {
    await pfs.rename(rootMod, rootBak)
  }

  // move capability module "into the way"
  await pfs.copyFile(trc.module(), rootMod)

  // modify capability module source to "fit" in new location
  let content = await pfs.readFile(rootMod, "utf8")

  content = content.replace(/(\.\.\/)+package.json/, "./package.json")

  let capa = path.basename(trc.me).replace('.test.ts', '')
  let relPath = trc.me.replace(trc.root(), '').replace('.test.ts', '')
  content = content.replace(new RegExp(`./${capa}`), `.${relPath}`)

  await pfs.writeFile(rootMod, content)

  // build
  await exec(`npx pepr build`)

  // move capability module "out the way"
  await pfs.rm(rootMod)

  // move module pepr.ts back "into the way" (if there was one)
  if ( await pfs.stat(rootBak).catch(() => {}) ) {
    await pfs.rename(rootBak, rootMod)
  }

  return `${trc.root()}/dist`
}

export async function deploy(buildDir: string) {
  const files = await pfs.readdir(buildDir)
  const file = files.filter(f => /pepr-module.*\.yaml/.test(f))[0]
  const yaml = `${buildDir}/${file}`
  await exec(`kubectl apply -f ${yaml}`)
}

export async function ready() {
  await exec(`kubectl rollout status deployment -n pepr-system`)
}

export async function synthesizeManifests(trc: TestRunCfg) {
  for (let [yaml, json] of trc.manifests()) {

    // convert yaml manifest to json
    let {stdout} = await exec(
      `kubectl apply -f ${yaml} --dry-run=client --output json`
    )

    // convert json into array of one-or-more js objects
    // see: https://kubernetes.io/docs/reference/using-api/api-concepts/#collections
    let raw = JSON.parse(stdout)
    let resources = (raw.kind === "List" ? raw.items : [ raw ])

    // strip rando fields added by kubectl --dry-run
    resources = resources.map(res => {
      // "metadata.namespace: default" is added if no ns spec'd... but that's fine
      // "metadata.annotations.['kubectl.kubernetes.io/*']" annotations need to go though
      for (const anno in res.metadata.annotations) {
        if (anno.startsWith("kubectl.kubernetes.io/")) {
          delete res.metadata.annotations[anno]
        }
      }

      // remove "metadata.annotations" if empty (i.e. kubectl added it)
      if (Object.keys(res.metadata.annotations).length === 0) {
        delete res.metadata.annotations
      }

      return res
    })

    // add test-required fields
    resources = resources.map(res => {
      res.metadata.labels = {...res.metadata.labels, [trc.labelKey()]: trc.unique }
      return res
    })

    // re-add client-side (kubectl) `kind: "List"` wrapping
    resources = {"kind": "List", apiVersion: "v1", "items": resources}
    const ready = JSON.stringify(resources, null, 2)
  
    // write to file
    await pfs.writeFile(json, ready, "utf8")
  }
}