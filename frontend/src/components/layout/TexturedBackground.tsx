"use client";

import dynamic from "next/dynamic";

const PaperTexture = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.PaperTexture),
  { ssr: false }
);

export function TexturedBackground() {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none opacity-70 mix-blend-multiply">
      <PaperTexture
        width="100%"
        height="100%"
        colorBack="#d3d2ab"
        colorPaper="#ffffff"
        colorShadow="#cccccc"
        blending={1}
        distortion={0.25}
        angle={300}
        seed={4}
        roughness={0.3}
        roughnessSize={0.2}
        roughnessRows={0.25}
        fiber={0.25}
        fiberSize={0.75}
        folds={0}
        foldSizeX={1}
        foldSizeY={1}
        wrinkles={0}
        wrinkleSize={0.5}
        crumples={0}
        crumpleCount={4}
        drops={0}
        scale={1}
        fit="cover"
      />
    </div>
  );
}
