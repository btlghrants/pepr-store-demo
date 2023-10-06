import { Log, PeprModule } from "pepr";
import cfg from "./package.json";

import { PeprStoreDemo } from "./capabilities/pepr-store-demo/capability";

new PeprModule(cfg, [PeprStoreDemo], {
  deferStart: false,
  beforeHook: req => {
    Log.info(`  --> beforeHook: ${req.kind}/${req.name}`);
  },
  afterHook: res => {
    Log.info(`  --> afterHook: ${JSON.stringify(res)}`);
  },
});
