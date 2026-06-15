import React, { useState, useCallback, useRef, useEffect } from "react";
import TopRibbon from "./components/TopRibbon";
import PreviewCanvas from "./components/PreviewCanvas";
import Sidebar from "./components/Sidebar";
import { processPdf, canvasToDataUrl } from "./processor";

function App() {
  const [resultImages, setResultImages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [colors, setColors] = useState({
    primary: "#ED553B",
    secondary: "#3CAEA3",
    tertiary: "#173F5F",
  });
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pdfScale, setPdfScale] = useState(2);
  const [rawFile, setRawFile] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const handleFileSelect = useCallback(
    async (file) => {
      if (!file || file.type !== "application/pdf") return;

      setLoading(true);
      setFileName(file.name);
      setRawFile(file);
      setActiveGroupIndex(0);

      try {
        const pdfBytes = await file.arrayBuffer();
        const { composites, totalPages: numPages } = await processPdf(
          pdfBytes,
          pdfScale,
          [colors.primary, colors.secondary, colors.tertiary],
        );

        const results = composites.map((composite, i) => {
          const start = i * 3;
          const end = Math.min(start + 3, numPages);
          return {
            image: canvasToDataUrl(composite),
            groupIndex: i,
            pagesInGroup: end - start,
          };
        });

        setResultImages(results);
        setTotalPages(numPages);
        setTotalGroups(results.length);
      } catch (err) {
        console.error("Error processing PDF:", err);
        alert(`Failed to process the PDF: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [pdfScale, colors],
  );

  useEffect(() => {
    if (rawFile) handleFileSelect(rawFile);
  }, [pdfScale, colors]);

  const goToPrevGroup = useCallback(() => {
    setActiveGroupIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNextGroup = useCallback(() => {
    setActiveGroupIndex((prev) => Math.min(totalGroups - 1, prev + 1));
  }, [totalGroups]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handleSave = useCallback(async () => {
    if (resultImages.length === 0) return;

    const { jsPDF } = await import("jspdf");

    const loadImg = (src) =>
      new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.src = src;
      });

    const first = await loadImg(resultImages[0].image);
    const orientation = first.width > first.height ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < resultImages.length; i++) {
      if (i > 0) pdf.addPage();
      const img = await loadImg(resultImages[i].image);
      const ratio = Math.min(pw / img.width, ph / img.height);
      const iw = img.width * ratio;
      const ih = img.height * ratio;
      pdf.addImage(
        resultImages[i].image,
        "PNG",
        (pw - iw) / 2,
        (ph - ih) / 2,
        iw,
        ih,
      );
    }

    pdf.save(`${fileName.replace(/\.pdf$/i, "") || "cheat-sheet"}.pdf`);
  }, [resultImages, fileName]);

  const activeResult = resultImages[activeGroupIndex] || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TopRibbon
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        settingsOpen={settingsOpen}
      />

      <input
        id="pdf-file-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className="flex flex-1 overflow-hidden p-4 pb-8 gap-2"
        onClick={(e) => {
          if (e.target === e.currentTarget)
            document.getElementById("pdf-file-input")?.click();
        }}
      >
        <Sidebar
          colors={colors}
          onColorChange={(key, value) =>
            setColors((prev) => ({ ...prev, [key]: value }))
          }
          pdfScale={pdfScale}
          onPdfScaleChange={setPdfScale}
          overlay={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSelectPdf={() => document.getElementById("pdf-file-input")?.click()}
          onSave={handleSave}
          hasPages={resultImages.length > 0}
          activeGroupIndex={activeGroupIndex}
          totalGroups={totalGroups}
          onPrevGroup={goToPrevGroup}
          onNextGroup={goToNextGroup}
        />

        {settingsOpen && (
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ top: 0 }}
            onClick={() => setSettingsOpen(false)}
          />
        )}

        <div
          className="flex-1 flex overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget)
              document.getElementById("pdf-file-input")?.click();
          }}
        >
          <PreviewCanvas
            resultImage={activeResult?.image || null}
            loading={loading}
            onPrevGroup={goToPrevGroup}
            onNextGroup={goToNextGroup}
            activeGroupIndex={activeGroupIndex}
            totalGroups={totalGroups}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
