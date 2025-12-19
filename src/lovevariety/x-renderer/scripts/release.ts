import { prepareRelease } from "../../../scripts/common-release.ts";

await prepareRelease({
  depsType: "peerDependencies",
  processDeps: false,
});
