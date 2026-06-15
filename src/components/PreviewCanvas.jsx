import React, {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

const TOPBAR_H = 56 + 16; // height + top margin (m-4)
const PADDING_H = 48; // p-4 top (16) + pb-8 bottom (32)

const PreviewCanvas = forwardRef(function PreviewCanvas(
  {
    resultImage,
    loading,
    onPrevGroup,
    onNextGroup,
    activeGroupIndex,
    totalGroups,
  },
  ref,
) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  useEffect(() => {
    if (!resultImage) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const parent = root.parentElement;
      const maxW = parent ? parent.clientWidth : window.innerWidth;
      const maxH = window.innerHeight - TOPBAR_H - PADDING_H;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      canvas.width = w;
      canvas.height = h;
      root.style.width = w + "px";
      root.style.height = h + "px";
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = resultImage;
  }, [resultImage]);

  const handleWheel = useCallback(
    (e) => {
      if (totalGroups <= 1) return;
      e.preventDefault();
      if (e.deltaY > 0) onNextGroup();
      else if (e.deltaY < 0) onPrevGroup();
    },
    [onPrevGroup, onNextGroup, totalGroups],
  );

  if (!resultImage && !loading) {
    return (
      <div
        className="glass-panel cursor-pointer hover:opacity-90 transition-opacity max-w-lg w-full m-auto"
        onClick={() => document.getElementById("pdf-file-input")?.click()}
      >
        <div className="flex flex-col items-center justify-center gap-2 p-8 sm:p-12">
          <div className="text-4xl sm:text-5xl">📄</div>
          <h2
            className="text-base sm:text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Select a PDF to get started
          </h2>
          <p
            className="text-xs text-center max-w-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Pages are grouped into triplets, tinted, rotated, and
            multiply-blended.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-panel m-auto">
        <div className="flex flex-col items-center justify-center gap-4 p-12 sm:p-16">
          <div className="animate-spin text-3xl sm:text-4xl">⏳</div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Processing your PDF in the browser...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="glass-panel relative rounded-[10px] overflow-hidden"
      style={{ maxWidth: "100%", margin: "auto" }}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} style={{ display: "block", maxWidth: "100%" }} />
      {totalGroups > 1 && (
        <div
          className="absolute bottom-3 right-3 text-xs font-medium px-2 py-1 rounded-full"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {activeGroupIndex + 1} / {totalGroups}
        </div>
      )}
    </div>
  );
});

export default PreviewCanvas;
