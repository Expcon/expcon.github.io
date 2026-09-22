# Third-party notices

Included with the public CR5AF cinematic build. Package metadata ambiguity below remains unresolved upstream.

## 1. CR5AF robot geometry — © 2026 Dobot, MIT

The CR5AF mesh data comes from one pinned public source:

- Repository: <https://github.com/Dobot-Arm/DOBOT_6Axis_ROS2_V4>
- Pinned commit: `ec201c40d5db63185a3593ec9c39f80fe25aa527` (branch `main`, 2026-09-03T08:29:50Z)
- Assets: 7 binary STL meshes in `cra_description/meshes/cr5af/` (duplicated byte-identically in
  `dobot_rviz/meshes/cr5af/`), 2,312,488 bytes total, 46,238 triangles, metres, identity scale;
  joint definitions from `dobot_rviz/urdf/cr5af_robot.urdf` and `cra_description/urdf/cr5af_robot.xacro`.
- License: repository-root `LICENSE` — MIT, “Copyright (c) 2026 Dobot”; the repository READMEs also state MIT.
  The complete upstream license text (1,061 bytes, verified by SHA256) is reproduced verbatim, followed by a
  provenance block, in `dobot-CR5AF-MIT.txt` in this directory.
- Disclosed conflict (recorded, not resolved by this notice): `cra_description/package.xml` and
  `cr5af_moveit/package.xml` declare `<license>BSD</license>`, and `dobot_rviz/package.xml` — the package named
  inside the URDF mesh paths — declares `<license>TODO: License declaration</license>`. There is no `NOTICE` file
  and no mesh-specific license note upstream. The site owner accepted the repository-root MIT reading on
  2026-09-21; the full audit is `docs/cr5af-public-asset-audit.md` at the workspace root.

Required attribution if the asset ships (owner-reviewed wording):

> CR5AF robot geometry © 2026 Dobot, MIT-licensed — source: github.com/Dobot-Arm/DOBOT_6Axis_ROS2_V4 @ commit
> ec201c40. This is an independent project and is not affiliated with, sponsored by, or endorsed by Dobot.

Also required:

- Keep the exact pinned commit and the 7 file hashes with the notice; fail any build whose mesh bytes differ.
- Do not use the Dobot name or any Dobot logo as a brand element of the site, and do not imply endorsement.
- Keep the geometry clearly identified as a CR5AF study asset: no hardware capability, accuracy or experimental
  claim may be attached to it.
- The private `DobotStudio` `all.glb` is **not** covered by this notice, is not derived from this pin, and must
  never be added to a build.

## 2. three.js — MIT

- Vendored upstream: `three@0.185.1` (`three.module.min.js`, `three.core.min.js`, and the
  `examples/jsm/environments/RoomEnvironment.js` module used by the local stage).
- License: MIT, “Copyright © 2010-2026 three.js authors”. The build already copies the upstream license to
  `vendor/three-LICENSE.txt` in the published output; keep that behaviour and keep it byte-identical to the
  license file shipped by the installed package.

## 3. GSAP 3.12.5 and ScrollTrigger 3.12.5 — GreenSock standard license (not MIT)

- Vendored files: `vendor/gsap.min.js`, `vendor/ScrollTrigger.min.js`.
- The files carry the upstream banner: “Copyright 2024, GreenSock. All rights reserved. Subject to the terms at
  https://gsap.com/standard-license or for Club GSAP members, the agreement issued with that membership.”
- Required: preserve those banner comments unmodified in the vendored files, and keep the license URL available in
  the notices text. The GreenSock standard license is not an open-source license, so this entry must remain visible
  rather than being folded into an “MIT components” summary.
- Open item for the build round: record which GreenSock terms apply to this site (standard license terms as
  published) in the same place, so the notices file is complete for every vendored script.

## 4. Release obligations

1. Copy `dobot-CR5AF-MIT.txt` and `THIRD_PARTY_NOTICES.md` into the published output (for example
   `vendor/licenses/`), byte-for-byte.
2. Extend the build allowlist explicitly; do not let wildcard copying pick up this directory or any `*.local.js`.
3. Re-verify the 7 mesh SHA256s and the upstream `LICENSE` SHA256 before generating the geometry; abort on mismatch.
4. Add a visible, low-noise attribution line plus a link to the notices text on the page that displays the model.
5. Re-run the public-build tests and the full chapter walk-through on the built artifact before any deployment, and
   only with the owner’s explicit go-ahead in that round.

## 5. Accepted web conversion (2026-09-22)

Owner accepted after local comparison. GLB: 1,148,116 bytes; SHA256 75e4b4d47a039fd3c658381234a2224079998b377b77bc1ffcf7819a8939a337; all 46,238 source triangles. Converter: experiments/public-cr5af-review/reconstruct-official.mjs in the course repository. Official URDF origins/RPY/axes and metre units are preserved; the loader adapts them to the frozen V2 joint interface. PBR colours and component assignments are authored approximations, not vendor material metadata. No private geometry, textures or logos are included.
