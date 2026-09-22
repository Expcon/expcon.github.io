// Single source of truth for how the site discloses the object it displays.
//
// The displayed object is the CR5AF geometry Dobot publishes in its public ROS 2 package
// (MIT — see docs/licenses/THIRD_PARTY_NOTICES.md). It is real published geometry with the
// published URDF joint pivots, not a stand-in, so the label names the source and claims only what
// is true: a display pose, no experiment trajectory, and no affiliation with or endorsement by
// Dobot. `scripts/build-public.js` writes these same strings into the shipped static markup, so a
// no-JS or pre-runtime view discloses what this module discloses at runtime.
export const CR5AF_LABEL={
 caption:'CR5AF · PUBLISHED GEOMETRY (MIT)',
 note:'Dobot 公开 ROS 包几何 · 展示姿态 · 非实验轨迹 · 非 Dobot 背书',
 canvas:'Dobot 公开发布的 CR5AF 几何（MIT 许可）作为物理执行的视觉锚点，展示姿态而非实验轨迹；与 Dobot 无隶属或背书关系',
 status:'公开几何 (MIT) / 展示姿态 · 非实验轨迹'
};
