import * as path from 'path';
import * as fs from 'fs';
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
