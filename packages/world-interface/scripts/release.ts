import { prepareRelease } from "../../../scripts/common-release.ts";

await prepareRelease({
  depsType: "dependencies",
  processDeps: true,
  additionalFields: { sideEffects: false },
});
