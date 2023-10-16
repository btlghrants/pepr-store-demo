// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { describe, expect, it } from '@jest/globals';
import { mins, secs, sleep, untilTrue } from "../helpers/helpers";

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
  it("resolves when true", async () => {
    let predicate = () => new Promise<boolean>(resolve => {
      setTimeout(() => resolve(true), 250)
    })
    await untilTrue(predicate)
  })
})

describe("secs", () => {
  it("returns the appropriate number of milliseconds", () => {
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
  it("returns the appropriate number of milliseconds", () => {
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