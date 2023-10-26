// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import {
  beforeAll, afterAll,
  afterEach, beforeEach,
  describe, expect, it, jest
} from '@jest/globals';
import {
  ms, secs, mins,
  sleep, untilTrue, waitLock,
  nearestAncestor
} from "./helpers";
// import { promises as pfs } from 'fs';
// import * as os from 'os';
import { clean, setup } from './cluster'
import { TestRunCfg } from './TestRunCfg';

import { K8sInit, Filters } from "kubernetes-fluent-client/dist/fluent/types";
import { K8s, KubernetesObject, GenericClass, kind} from "kubernetes-fluent-client"
jest.mock("kubernetes-fluent-client")

function mockK8s(members = {}) {
  const mockK8s = jest.mocked(K8s)

  const implK8s = <
    T extends GenericClass,
    K extends KubernetesObject = InstanceType<T>
  > (
    model: T,
    filters?: Filters
  ) :
    K8sInit<K> =>
  {
    return { ... members } as unknown as K8sInit<K>
  }

  return mockK8s.mockImplementation(implK8s)
}

describe("clean()", () => {
  const trc = { labelKey: "lk" } as TestRunCfg

  describe("removes 'pepr-system' namespace", () => {
    it("tells collaborator to delete & polls until gone", async () => {
      const ns = {
        metadata: {
          name: "pepr-system",
          labels: { notTrcLabelKey: "whatever" }
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
          labels: { [trc.labelKey]: "whatever" }
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
  const trc = { labelKey: "lk", namespace: "ns", unique: "uq" } as TestRunCfg

  describe("adds test isolation namespace", () => {
    it("tells collaborator to add namespace & returns result", async () => {
      const ns = {
        metadata: {
          name: trc.namespace,
          labels: { [trc.labelKey]: trc.unique }
        }
      }

      let Apply = jest.fn(() => { Promise.resolve(ns) })
      let K8s = mockK8s({Apply})

      await setup(trc)

      expect(K8s).toHaveBeenNthCalledWith(1, kind.Namespace)
      expect(Apply).toHaveBeenNthCalledWith(1, ns)
    }, secs(2))
  })
})