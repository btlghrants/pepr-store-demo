// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { describe, expect, it } from '@jest/globals';
import { sleep, untilTrue } from "./helpers";

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