import {
  GenericClass,
  K8s,
  kind,
  KubernetesListObject,
  KubernetesObject,
  RegisterKind
} from "kubernetes-fluent-client";
import { TestRunCfg } from './TestRunCfg';
import { untilTrue, resourceGone } from "./general";

export async function clean(trc: TestRunCfg): Promise<void> {
  // K8s-native kinds
  let kinds = Object.keys(kind)
    .filter(k => k !== "GenericKind")
    .map(k => kind[k])

  // in-cluster crd-based generic kinds
  const crds = await K8s(kind.CustomResourceDefinition).Get()
  crds.items.forEach(crd => {
    const grp = crd.spec.group
    const knd = crd.spec.names.kind

    crd.spec.versions.forEach(version => {
      const ver = version.name
      const name = `${ver.slice(0, 1).toUpperCase()}${ver.slice(1)}${knd}`
      const cls = { [name]: class extends kind.GenericKind {} }

      // the KFC keeps module-level list of registered kinds but doesn't expose
      //  it, so can't pre-check registers... have to catch/squash re-registers
      try {
        RegisterKind(cls[name], { group: grp, version: ver, kind: knd })

      } catch (e) {
        const expected = e.message === `GVK ${name} already registered`
        if (!expected) { throw e }
      }

      kinds.push(cls[name])
    })
  })

  // call cluster for all available (non-404) & authorized (non-405) resources
  const gets = await Promise.all(
    kinds.map(k => K8s(k).Get()
      .then(o => [k, o] as [GenericClass, KubernetesListObject<typeof k>])
      .catch(e => { if ( ![404, 405].includes(e.status) ) { throw e } })
    ))

  // unwrap resource lists
  const resources = gets.flatMap(g => g ? [g] : [])
    .flatMap(([k, l]) => 
      l.items.map(o => [k, o] as [GenericClass, KubernetesObject])
    )

  // isolate test-labelled resources
  const [prefix, ] = trc.labelKey().split("/")
  const tbds = resources.filter(([, o]) =>
    o.metadata.labels &&
      Object.keys(o.metadata.labels)
        .filter(l => l.startsWith(`${prefix}/`))
        .length > 0
  )

  // delete test-labelled resources (in parallel)
  tbds.forEach(([k, o]) => K8s(k).Delete(o))
  let terminating = tbds.map(tbd => untilTrue(() => resourceGone(...tbd)))
  await Promise.all(terminating)
}

export async function setup(trc: TestRunCfg) {
  const ns = K8s(kind.Namespace).Apply({
    metadata: {
      name: trc.namespace(),
      labels: {
        [trc.labelKey()]: trc.unique
      }
    }
  })
  return Promise.all([
    ns
  ])
}
