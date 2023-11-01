import * as path from 'path';
import * as fs from 'fs';
import * as pfs from 'fs/promises';
import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec)
import { nearestAncestor } from './helpers'

export class TestRunCfg {
  me: string;
  unique: string;

  constructor(me: string, unique: string = new Date().valueOf().toString()) {
    this.me = me
    this.unique = unique
  }

  name(): string {
    return path.basename(this.me).replace('.test.ts', '')
  }

  here(): string {
    return path.dirname(this.me)
  }

  root(): string {
    return path.dirname(nearestAncestor("package.json", this.here()))
  }

  lockfile(): string {
    return `${this.root()}/cluster.lock`
  }

  module(): string {
    return `${this.me.replace('.test', '.pepr')}`
  }

  namespace(): string {
    return `${path.basename(this.here())}-${this.name()}-${this.unique}`
  }

  labelKey(): string {
    return `${this.name()}/test-transient`
  }

  manifests(): [string, string][] {
    return fs.readdirSync(this.here())
    .filter(f => new RegExp(`^${this.name()}\..*`).test(f))
    .filter(f => /\.test\.\d+\.yaml$/.test(f))
    .sort((l, r) => {
      let lnum = parseInt(l.match(/test\.(\d+)\.yaml/)[1])
      let rnum = parseInt(r.match(/test\.(\d+)\.yaml/)[1])
      return lnum === rnum
        ? 0
        : lnum < rnum ? -1 : 1
    })
    .map(f => [
      `${this.here()}/${f}`,
      `${this.here()}/${f.concat(".json")}`
    ])
  }

  manifest(index: number): string {
    return this.manifests()
      .map(m => m[1])
      .filter(f => {
        let str = f.match(/.*\.(\d+)\.yaml.json/)[1]
        let num = parseInt(str)
        return num === index
      })
      [0]
  }
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
      delete res.metadata.annotations
      delete res.metadata.namespace
      return res
    })

    // add test-required fields
    resources = resources.map(res => {
      res.metadata.namespace = trc.namespace()
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