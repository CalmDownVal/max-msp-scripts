import * as Path from "node:path";

import { build } from "@calmdown/rolldown-workspace";

const jail = Path.resolve(import.meta.dirname, "..");
await build({ jail });
