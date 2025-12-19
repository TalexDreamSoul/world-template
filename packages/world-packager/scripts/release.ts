import { prepareRelease } from "../../../scripts/common-release.ts";

await prepareRelease({
  depsType: "dependencies",
  processDeps: false,
  bin: { "world-packager": "./index.mjs" },
});
