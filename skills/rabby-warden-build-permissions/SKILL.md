---
name: rabby-warden-build-permissions
description: Diagnose and resolve Warden global permission errors in Rabby Yarn builds.
metadata:
  short-description: Triage Warden build permission errors
---

# Rabby Warden Build Permissions

1. Identify the global and exact package from the error, including `parent > child` for nested dependencies. Check the bundled code and Rabby's call path for required access, optional probes, and unused features.
2. **Required access.** Add an anchored, escaped pattern for that package under the global in `SecSDK/check.json`. For required dynamic access missing from the generated policy, also add the minimum `global.allow` in `SecSDK/policy-over.json`. Remove any conflicting denial.
3. **Unneeded access.** Add the global to the package's `global.disallow` in `SecSDK/policy-over.json` and remove any conflicting grant. If a static reference still blocks the build, keep the denial and report the source location.
4. Rerun the original Yarn build. Review the `SecSDK/policy.json` diff for unintended grants and report the decision and build result.
