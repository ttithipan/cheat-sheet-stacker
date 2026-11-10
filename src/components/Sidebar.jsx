import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import PaletteIcon from "@mui/icons-material/Palette";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const FIELD_SX = {
  "& .MuiInputLabel-root": {
    color: "var(--text-secondary)",
    fontFamily: "Inter, sans-serif",
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#a5b4fc" },
  "& .MuiInputBase-input": {
    color: "var(--text-primary)",
    fontFamily: "Inter, sans-serif",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--panel-border)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(99,102,241,0.5)",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#6366f1",
  },
  "& .MuiFormHelperText-root": {
    color: "var(--text-secondary)",
    fontFamily: "Inter, sans-serif",
  },
};

/**
 * Free-form numeric input. Typing stays local to the field and the value is
 * committed once the user stops typing (or presses Enter / blurs), so a
 * half-typed number never triggers a re-render of the whole PDF.
 */
function NumberField({ label, value, min, max, step = 1, onChange, helperText }) {
  const [draft, setDraft] = useState(String(value));

  const clamp = (n) => {
    let result = n;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };

  // Keep the field in sync when the value is changed from outside the field.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = Number(draft);
    if (draft.trim() === "" || Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = clamp(parsed);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  // Also commit after a pause, so the spinner arrows and arrow keys work
  // without needing to blur the field.
  useEffect(() => {
    if (draft.trim() === "" || Number(draft) === value) return;
    const timer = setTimeout(() => {
      const parsed = Number(draft);
      if (Number.isNaN(parsed)) return;
      const clamped = clamp(parsed);
      setDraft(String(clamped));
      if (clamped !== value) onChange(clamped);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, value, min, max, onChange]);

  return (
    <TextField
      size="small"
      fullWidth
      label={label}
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitDraft}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commitDraft();
          e.currentTarget.blur();
        }
      }}
      helperText={helperText}
      slotProps={{
        htmlInput: {
          min: min ?? undefined,
          max: max ?? undefined,
          step,
        },
      }}
      sx={FIELD_SX}
    />
  );
}

function Sidebar({
  colors,
  onColorChange,
  pdfScale,
  onPdfScaleChange,
  pagesPerSheet,
  onPagesPerSheetChange,
  offsetPercent,
  onOffsetPercentChange,
  overlay,
  onClose,
  onSelectPdf,
  onSave,
  hasPages,
  activeGroupIndex,
  totalGroups,
  onPrevGroup,
  onNextGroup,
}) {
  if (!overlay) return null;

  const base =
    "glass-panel flex flex-col gap-5 p-5 m-2 shrink-0 overflow-y-auto";
  const cls = `${base} fixed left-0 z-40 w-72 shadow-2xl top-[80px] bottom-8 ml-4 mb-0 lg:ml-0 lg:static lg:z-auto lg:shadow-none lg:m-0 lg:w-56 xl:w-64`;

  return (
    <aside className={cls} style={{ borderRadius: "12px" }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <PaletteIcon sx={{ color: "#a5b4fc", fontSize: "1.2rem" }} />
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h3>
        <button
          onClick={onClose}
          className="ml-auto text-sm lg:hidden"
          style={{ color: "var(--text-secondary)" }}
        >
          ✕
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          size="small"
          variant="outlined"
          fullWidth
          onClick={onSelectPdf}
          sx={{
            textTransform: "none",
            color: "#a5b4fc",
            borderColor: "rgba(99,102,241,0.4)",
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: "0.8rem",
            "&:hover": {
              borderColor: "#6366f1",
              backgroundColor: "rgba(99,102,241,0.08)",
            },
          }}
        >
          Select PDF
        </Button>

        {hasPages && (
          <>
            <Button
              size="small"
              variant="contained"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={onSave}
              sx={{
                textTransform: "none",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: "0.8rem",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                borderRadius: "8px",
                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                },
              }}
            >
              Save PDF
            </Button>

            {totalGroups > 1 && (
              <div className="flex items-center justify-center gap-1">
                <IconButton
                  size="small"
                  onClick={onPrevGroup}
                  disabled={activeGroupIndex === 0}
                  sx={{
                    color: "#a5b4fc",
                    "&.Mui-disabled": { color: "rgba(165,180,252,0.2)" },
                  }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {activeGroupIndex + 1}/{totalGroups}
                </span>
                <IconButton
                  size="small"
                  onClick={onNextGroup}
                  disabled={activeGroupIndex === totalGroups - 1}
                  sx={{
                    color: "#a5b4fc",
                    "&.Mui-disabled": { color: "rgba(165,180,252,0.2)" },
                  }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--panel-border)" }} />

      {/* Layout */}
      <div className="flex flex-col gap-3">
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Sheet Layout
        </p>
        <NumberField
          label="Pages per sheet"
          value={pagesPerSheet}
          min={1}
          onChange={onPagesPerSheetChange}
        />
        <NumberField
          label="Offset (%)"
          value={offsetPercent}
          min={0}
          step={0.1}
          onChange={onOffsetPercentChange}
          helperText="diagonal shift per page"
        />
        <NumberField
          label="Quality (scale)"
          value={pdfScale}
          min={0.1}
          step={0.25}
          onChange={onPdfScaleChange}
          helperText="higher is sharper but slower"
        />
      </div>

      <div style={{ borderTop: "1px solid var(--panel-border)" }} />

      {/* Colors */}
      <div className="flex flex-col gap-2">
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Tint Colors
        </p>
        {Array.from({ length: pagesPerSheet }, (_, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="color"
              value={colors[index] || "#000000"}
              onChange={(e) => onColorChange(index, e.target.value)}
              style={{
                width: 28,
                height: 28,
                border: "2px solid var(--panel-border)",
                borderRadius: 6,
                cursor: "pointer",
                backgroundColor: "transparent",
                padding: 0,
              }}
            />
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>
              Page {index + 1}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--panel-border)" }} />

      {/* How it works */}
      <div
        className="text-xs leading-relaxed space-y-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          How it works:
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select a multi-page PDF</li>
          <li>
            Every {pagesPerSheet} page{pagesPerSheet === 1 ? "" : "s"} become 1
            stacked sheet
          </li>
          <li>Each page is tinted &amp; offset diagonally</li>
          <li>Layers are multiply-blended</li>
        </ol>
        <div
          className="mt-2 p-2 rounded"
          style={{
            backgroundColor: "rgba(99,102,241,0.08)",
            border: "1px solid var(--panel-border)",
          }}
        >
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            💡 Tip
          </p>
          <p className="mt-1">
            Use{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              Arial, size 12
            </strong>{" "}
            for best readability.
          </p>
          <p className="mt-1">
            <strong style={{ color: "var(--text-primary)" }}>
              Lighter tint colours
            </strong>{" "}
            work best — stacked pages already darken each other.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--panel-border)" }} />

      {/* Privacy & Disclaimer */}
      <div
        className="text-xs leading-relaxed space-y-2"
        style={{ color: "var(--text-secondary)" }}
      >
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
          🔒 Privacy
        </p>
        <p>
          All processing happens entirely in your browser. No files are ever
          uploaded to a server.
        </p>
        <p
          className="font-semibold mt-2"
          style={{ color: "var(--text-primary)" }}
        >
          ⚠️ Disclaimer
        </p>
        <p>
          This service is provided{" "}
          <strong style={{ color: "var(--text-primary)" }}>as-is</strong> with
          no guarantees.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
