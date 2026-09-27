"use client";

import dynamic from "next/dynamic";

const PaperTexture = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.PaperTexture),
  { ssr: false }
);

export function TexturedBackground() {
  return (
    <div className="fixed inset-0 -z-50 pointer-events-none opacity-70">
      <PaperTexture
        width="100%"
        height="100%"
        colorBack="#ffffff"
        colorPaper="#fdfbf7"
        colorShadow="#e8e5dc"
        blending={1}
        distortion={0.5}
        angle={45}
        seed={42}
        roughness={0.7}
        roughnessSize={0.3}
        roughnessRows={0}
        fiber={0.5}
        fiberSize={0.4}
        folds={0.2}
        foldSizeX={1}
        foldSizeY={1}
        wrinkles={0.3}
        wrinkleSize={0.5}
        crumples={0.1}
        crumpleCount={4}
        drops={0.1}
        scale={1.2}
        fit="cover"
      />
    </div>
  );
}
