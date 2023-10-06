import { a, Capability, Log } from "pepr";

export const PeprStoreDemo = new Capability({
  name: "pepr-store-demo",
  description: "A capability to demonstrate/exercise the Pepr Store.",
  namespaces: ["pepr-store-demo"],
});

const { When /*, Store*/ } = PeprStoreDemo;

When(a.Namespace)
  .IsCreated()
  .Mutate(ns => {
    Log.info(`  --> mutate on namespace created: ${ns}`);
  });

When(a.Namespace)
  .IsUpdated()
  .Mutate(ns => {
    Log.info(`  --> mutate on namespace updated: ${ns}`);
  });

When(a.Namespace)
  .IsDeleted()
  .Mutate(ns => {
    Log.info(`  --> mutate on namespace deleted: ${ns}`);
  });

When(a.Namespace)
  .IsCreated()
  .Validate(req => {
    const ns = req.Raw.metadata.name;
    Log.info(`  --> validate on namespace created: ${ns}`);
    return req.Approve();
  });

When(a.Namespace)
  .IsUpdated()
  .Validate(req => {
    const ns = req.Raw.metadata.name;
    Log.info(`  --> validate on namespace updated: ${ns}`);
    return req.Approve();
  });

When(a.Namespace)
  .IsDeleted()
  .Validate(req => {
    const ns = req.Raw.metadata.name;
    Log.info(`  --> validate on namespace deleted: ${ns}`);
    return req.Approve();
  });
