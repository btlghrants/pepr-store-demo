import { a, Capability, Log } from "pepr";

export const DefaultCapabilityCfg = {
  name: "pepr-store-demo",
  description: "A capability to demonstrate/exercise the Pepr Store.",
  namespaces: [],
}

export const PeprStoreDemo = new Capability(DefaultCapabilityCfg);

const { When, Store } = PeprStoreDemo;

When(a.ConfigMap)
  .IsCreated()
  .Mutate(cm => {
    cm.SetLabel("pepr-store-demo/touched", "true")
  });
