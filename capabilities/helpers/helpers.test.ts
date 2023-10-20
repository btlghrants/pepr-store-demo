// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { ms, secs, mins, sleep, untilTrue, waitLock } from "../helpers/helpers";
import { promises as fs } from 'fs';
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
    workdir = await fs.mkdtemp(`${os.tmpdir()}/waitLock-`)
  })

  it("immediate claim", async () => {
    const lockfile = `${workdir}/lock.txt`
    const myUnique = `/example/unique/value`

    await waitLock(lockfile, myUnique)

    expect(fs.stat(lockfile)).resolves.toBeTruthy()
    expect(await fs.readFile(lockfile, "utf8")).toBe(myUnique)
  }, secs(1))

  it("wait and claim", async () => {
    const lockfile = `${workdir}/lock.txt`
    const myUnique = `/example/unique/value`
    await fs.writeFile(lockfile, '/not/the/right/value')
    setTimeout(async () => fs.rm(lockfile), ms(100))

    await waitLock(lockfile, myUnique)

    expect(fs.stat(lockfile)).resolves.toBeTruthy()
    expect(await fs.readFile(lockfile, "utf8")).toBe(myUnique)
  }, secs(2))

  afterEach(async () => {
    await fs.rm(workdir, { recursive: true, force: true })
  })
})