// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { secs } from "./general";
import { clean, setup } from './cluster'
import { TestRunCfg } from './TestRunCfg';

import * as kfc from 'kubernetes-fluent-client';
jest.spyOn(kfc, "K8s").mockImplementation(
  jest.fn() as typeof kfc.K8s
)
const { kind } = kfc
const { K8s } = jest.mocked(kfc)

function mockK8s(members = {}) {
  return K8s.mockImplementation((() => members ) as unknown as typeof K8s)
}

beforeEach(() => { K8s.mockClear() })

describe("clean()", () => {
  const trc = { labelKey: () => "lk" } as TestRunCfg

  describe("removes 'pepr-system' namespace", () => {
    it("tells collaborator to delete & polls until gone", async () => {
      const ns = {
        metadata: {
          name: "pepr-system",
          labels: { itsLike: "whatever" }
        }
      }

      let Get = jest.fn()
      Get.mockImplementationOnce(() => Promise.resolve({ items: [ ns ] }))
      Get.mockImplementationOnce(() => Promise.resolve(ns))
      Get.mockImplementationOnce(() => Promise.reject({ status: 404 }))
      let Delete = jest.fn(() => Promise.resolve())
      let K8s = mockK8s({Get, Delete})

      await clean(trc)
      
      expect(K8s).toHaveBeenNthCalledWith(1, kind.Namespace)
      expect(Get).toHaveBeenNthCalledWith(1)

      expect(K8s).toHaveBeenNthCalledWith(2, kind.Namespace)
      expect(Delete).toHaveBeenNthCalledWith(1, ns)

      expect(K8s).toHaveBeenNthCalledWith(3, kind.Namespace)
      expect(Get).toHaveBeenNthCalledWith(2, ns.metadata.name)

      expect(K8s).toHaveBeenNthCalledWith(4, kind.Namespace)
      expect(Get).toHaveBeenNthCalledWith(3, ns.metadata.name)
    }, secs(2))
  })

  describe("removes namespaces with TestRunCfg-defined label", () => {
    it("tells collaborator to delete & polls until gone", async () => {
      const ns = {
        metadata: {
          name: "not-pepr-system",
          labels: { [trc.labelKey()]: "whatever" }
        }
      }

      let Get = jest.fn()
      Get.mockImplementationOnce(() => Promise.resolve({ items: [ ns ] }))
      Get.mockImplementationOnce(() => Promise.resolve(ns))
      Get.mockImplementationOnce(() => Promise.reject({ status: 404 }))
      let Delete = jest.fn(() => Promise.resolve())
      let K8s = mockK8s({Get, Delete})

      await clean(trc)
      
      expect(K8s).toHaveBeenNthCalledWith(1, kind.Namespace)
      expect(Get).toHaveBeenNthCalledWith(1)

      expect(K8s).toHaveBeenNthCalledWith(2, kind.Namespace)
      expect(Delete).toHaveBeenNthCalledWith(1, ns)

      expect(K8s).toHaveBeenNthCalledWith(3, kind.Namespace)
      expect(Get).toHaveBeenNthCalledWith(2, ns.metadata.name)

      expect(K8s).toHaveBeenNthCalledWith(4, kind.Namespace)
      expect(Get).toHaveBeenNthCalledWith(3, ns.metadata.name)
    }, secs(2))
  })
})

describe("setup()", () => {
  const trc = { labelKey: () => "lk", namespace: () => "ns", unique: "uq" } as TestRunCfg

  describe("adds test isolation namespace", () => {
    it("tells collaborator to add namespace & returns result", async () => {
      const ns = {
        metadata: {
          name: trc.namespace(),
          labels: { [trc.labelKey()]: trc.unique }
        }
      }

      let Apply = jest.fn(() => Promise.resolve(ns) )
      let K8s = mockK8s({Apply})

      await setup(trc)

      expect(K8s).toHaveBeenNthCalledWith(1, kind.Namespace)
      expect(Apply).toHaveBeenNthCalledWith(1, ns)
    }, secs(2))
  })
})
