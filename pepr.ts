import { PeprModule } from "pepr";
import cfg from "./package.json";

import { PeprStoreDemo } from "./capabilities/pepr-store-demo/zapability";

// grab JSON.stringified config from env
// destringify config
// deepmerge config over default config

new PeprModule(cfg, [PeprStoreDemo]);
