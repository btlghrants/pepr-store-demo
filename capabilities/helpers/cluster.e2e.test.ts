import { describe, expect, it, jest } from '@jest/globals';
import { secs, resourceGone } from "./general";
import { clean} from './cluster'
import { TestRunCfg } from './TestRunCfg';
import { K8s, kind, RegisterKind } from "kubernetes-fluent-client";

const trc = {
  labelKey: jest.fn(() => "test-transient/capability-name")
} as unknown as TestRunCfg

describe("clean()", () => {
  it("removes ConfigMap with TestRunCfg-defined label", async () => {
    const configMap = {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "cm-name",
        namespace: "default",
        labels: { [trc.labelKey()]: "" }
      }
    }
    const applied = await K8s(kind.ConfigMap).Apply(configMap)

    await clean(trc)

    expect(await resourceGone(kind.ConfigMap, applied)).toBe(true)
  }, secs(5))

  it("removes CRD & CRs with TestRunCfg-defined label", async () => {
    const crd = {
      apiVersion: "apiextensions.k8s.io/v1",
      kind: "CustomResourceDefinition",
      metadata: {
        name: "crdtests.cluster.e2e.test.ts",
        labels: { [trc.labelKey()]: "" }
      },
      spec: {
        group: "cluster.e2e.test.ts",
        versions: [
          {
            name: "v1",
            served: true,
            storage: true,
            schema: {
              openAPIV3Schema: {
                type: "object",
                  properties: {
                    content: {
                      type: "string"
                    }
                  }
              }
            }
          }
        ],
        scope: "Namespaced",
        names: {
          plural: "crdtests",
          singular: "crdtest",
          kind: "CrdTest",
          shortNames: [
            "ct"
          ]
        }
      }
    }
    const applied_crd = await K8s(kind.CustomResourceDefinition).Apply(crd)

    const cr = {
      apiVersion: `${crd.spec.group}/${crd.spec.versions[0].name}`,
      kind: crd.spec.names.kind,
      metadata: {
        name: crd.spec.names.singular,
        namespace: "default",
        labels: { [trc.labelKey()]: "" }
      },
      content: "win!"
    }
    const cr_kind = class extends kind.GenericKind {}
    RegisterKind(cr_kind, {
      group: cr.apiVersion.split("/")[0],
      version: cr.apiVersion.split("/")[1],
      kind: cr.kind
    })
    const applied_cr = await K8s(cr_kind).Apply(cr)

    await clean(trc)

    expect(await resourceGone(cr_kind, applied_cr)).toBe(true)
    expect(await resourceGone(kind.CustomResourceDefinition, applied_crd)).toBe(true)
  })
})