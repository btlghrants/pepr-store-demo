// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import {
  beforeAll, afterAll,
  afterEach, beforeEach,
  describe, expect, it
} from '@jest/globals';
import {
  ms, secs, mins,
  sleep, untilTrue, waitLock,
  nearestAncestor
} from "./general";
import * as pfs from 'fs/promises';
import * as os from 'os';

describe("sleep", () => {
  it("resolves after (roughly) given number of seconds", async () => {
    const checkTheClock = () => new Date().valueOf();  // ms since epoch
    const nearestSecond = (num) => Math.round( num / 1000 );
    const seconds = 1

    const alpha = checkTheClock()
    await sleep(seconds)
    const omega = checkTheClock()
    const delta = nearestSecond(omega - alpha)

    expect(delta).toBe(seconds)
  })
})

describe("untilTrue", () => {
  it("resolves when given predicate returns true", async () => {
    let predicate = () => new Promise<boolean>(resolve => {
      setTimeout(() => resolve(true), 250)
    })
    await untilTrue(predicate)
  })
})

describe("ms", () => {
  it("returns appropriate number of milliseconds", () => {
    const testTable = [
      [100, 100],
      [1000, 1000],
      [10000, 10000]
    ]
    testTable.forEach(([input, result]) => {
      expect(ms(input)).toBe(result)
    })
  })
})

describe("secs", () => {
  it("returns appropriate number of milliseconds", () => {
    const testTable = [
      [1, 1000],
      [30, 30000],
      [300, 300000]
    ]
    testTable.forEach(([input, result]) => {
      expect(secs(input)).toBe(result)
    })
  })
})

describe("mins", () => {
  it("returns appropriate number of milliseconds", () => {
    const testTable = [
      [1, 60000],
      [2, 120000],
      [5, 300000]
    ]
    testTable.forEach(([input, result]) => {
      expect(mins(input)).toBe(result)
    })
  })
})

describe("waitLock", () => {
  let workdir: string;

  beforeEach(async () => {
    workdir = await pfs.mkdtemp(`${os.tmpdir()}/waitLock-`)
  })

  it("immediate claim", async () => {
    const lockfile = `${workdir}/lock.txt`
    const myUnique = `/example/unique/value`

    await waitLock(lockfile, myUnique)

    expect(pfs.stat(lockfile)).resolves.toBeTruthy()
    expect(await pfs.readFile(lockfile, "utf8")).toBe(myUnique)
  }, secs(1))

  it("wait and claim", async () => {
    const lockfile = `${workdir}/lock.txt`
    const myUnique = `/example/unique/value`
    await pfs.writeFile(lockfile, '/not/the/right/value')
    setTimeout(async () => pfs.rm(lockfile), ms(100))

    await waitLock(lockfile, myUnique)

    expect(pfs.stat(lockfile)).resolves.toBeTruthy()
    expect(await pfs.readFile(lockfile, "utf8")).toBe(myUnique)
  }, secs(2))

  afterEach(async () => {
    await pfs.rm(workdir, { recursive: true, force: true })
  })
})

describe("nearestAncestor", () => {
  let rootdir: string
  let filename: string
  let ancestor: string
  let workdir: string

  beforeAll(async () => {
    rootdir = await pfs.mkdtemp(`${os.tmpdir()}/nearestAncestor-`)
    filename = "package.json"
    ancestor = `${rootdir}/${filename}`
    workdir = `${rootdir}/a/b/c/work`

    await pfs.writeFile(ancestor, '{"fake":"package.json"}')
    await pfs.mkdir(workdir, { recursive: true })
  })

  it("synchronously returns path of first ancenstor with given name", () => {
    const found = nearestAncestor(filename, workdir)
    expect(found).toBe(ancestor)
  })

  it("throws when ancestor can't be found", () => {
    const notFound = () => nearestAncestor("missing.txt", workdir)
    expect(notFound).toThrow()
  })

  afterAll(async () => {
    await pfs.rm(rootdir, { recursive: true, force: true })
  })
})