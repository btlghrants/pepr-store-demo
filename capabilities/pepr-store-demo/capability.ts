import { a, Capability, Log } from "pepr";

export const DefaultCapabilityCfg = {
  name: "pepr-store-demo",
  description: "A capability to demonstrate/exercise the Pepr Store.",
  namespaces: ["pepr-store-demo"],
}

export const PeprStoreDemo = new Capability(DefaultCapabilityCfg);

const { When, Store } = PeprStoreDemo;

When(a.ConfigMap)
  .IsCreated()
  .Mutate(cm => {
    cm.SetLabel("pepr-store-demo/touched", "true")
  });

// When(a.Namespace)
//   .IsCreated()
//   .Mutate(ns => {
//     const name = ns.Raw.metadata.name;
//     Log.info(`  --> mutate on namespace created: ${name}`);
//   });

// When(a.Namespace)
//   .IsUpdated()
//   .Mutate(ns => {
//     const name = ns.Raw.metadata.name;
//     Log.info(`  --> mutate on namespace updated: ${name}`);
//   });

// When(a.Namespace)
//   .IsDeleted()
//   .Mutate(ns => {
//     const name = ns.Raw.metadata.name;
//     Log.info(`  --> mutate on namespace deleted: ${name}`);
//   });

// When(a.Namespace)
//   .IsCreated()
//   .Validate(req => {
//     const ns = req.Raw.metadata.name;
//     Log.info(`  --> validate on namespace created: ${ns}`);
//     return req.Approve();
//   });

// When(a.Namespace)
//   .IsUpdated()
//   .Validate(req => {
//     const ns = req.Raw.metadata.name;
//     Log.info(`  --> validate on namespace updated: ${ns}`);
//     return req.Approve();
//   });

// When(a.Namespace)
//   .IsDeleted()
//   .Validate(req => {
//     const ns = req.Raw.metadata.name;
//     Log.info(`  --> validate on namespace deleted: ${ns}`);
//     return req.Approve();
//   });
