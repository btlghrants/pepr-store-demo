import * as path from 'path';
import * as fs from 'fs';
import { nearestAncestor } from './helpers'
// import { promises as pfs } from 'fs';

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