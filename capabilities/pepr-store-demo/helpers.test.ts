// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { describe, expect, it } from '@jest/globals';
import { sleep, waitFor } from "./helpers";

describe("sleep", () => {
  it("resolves after (roughly) given number of seconds", async () => {
    const nearestThousand = (num: number) => Math.round( num / 1000 ) * 1000;

    const seconds = 2, millis = seconds * 1000
    const alpha = new Date().valueOf()
    
    await sleep(seconds)
    const omega = new Date().valueOf()
    const delta = nearestThousand( omega - alpha )

    expect(delta).toBe(millis)
  })
})

describe("waitFor", () => {
  it.only("uh, does..?", async () => {
    
  })
})