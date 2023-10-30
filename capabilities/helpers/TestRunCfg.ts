import * as path from 'path';
import * as fs from 'fs';
import * as pfs from 'fs/promises';
import * as util from 'util';
import * as child_process from 'child_process';
const exec = util.promisify(child_process.exec)
import { nearestAncestor } from './helpers'

export class TestRunCfg {
  me: string;
  name: string;
  here: string;
  root: string;
  lock: string;
  module: string;
  manifests: [string, string][];
  unique: string;
  namespace: string;
  labelKey: string;

  constructor(me: string, unique: string = new Date().valueOf().toString()) {
    this.me = me
    this.name = path.basename(this.me).replace('.test.ts', '')
    this.here = path.dirname(this.me)
    this.root = path.dirname(nearestAncestor("package.json", this.here))
    this.lock = `${this.root}/cluster.lock`
    this.module = `${this.me.replace('.test', '.pepr')}`
    this.unique = unique
    this.namespace = `${path.basename(this.here)}-${this.name}-${unique}`
    this.labelKey = `${this.name}/test-transient`
    this.manifests = fs.readdirSync(this.here)
      .filter(f => new RegExp(`^${this.name}\..*`).test(f))
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
  }

  manifest(index: number): string {
    return this.manifests
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
  for (let [yaml, json] of trc.manifests) {

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
      res.metadata.namespace = trc.namespace
      res.metadata.labels = {...res.metadata.labels, [trc.labelKey]: trc.unique }
      return res
    })

    // re-add client-side (kubectl) `kind: "List"` wrapping
    resources = {"kind": "List", apiVersion: "v1", "items": resources}
    const ready = JSON.stringify(resources, null, 2)
  
    // write to file
    await pfs.writeFile(json, ready, "utf8")
  }
}