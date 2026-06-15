import React from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import PaletteIcon from "@mui/icons-material/Palette";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

function Sidebar({
  colors,
  onColorChange,
  pdfScale,
  onPdfScaleChange,
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

      {/* Colors */}
      <div className="flex flex-col gap-2">
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Tint Colors
        </p>
        {[
          { label: "Page 1 (Normal)", key: "primary", color: colors.primary },
          {
            label: "Page 2 (Rotated)",
            key: "secondary",
            color: colors.secondary,
          },
          {
            label: "Page 3 (Rotated)",
            key: "tertiary",
            color: colors.tertiary,
          },
        ].map(({ label, key, color }) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(key, e.target.value)}
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
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Scale */}
      <FormControl fullWidth size="small">
        <InputLabel
          id="ql"
          sx={{
            color: "var(--text-secondary)",
            fontFamily: "Inter, sans-serif",
            "&.Mui-focused": { color: "#a5b4fc" },
          }}
        >
          Quality (Scale)
        </InputLabel>
        <Select
          labelId="ql"
          value={pdfScale || 2}
          label="Quality (Scale)"
          onChange={(e) => onPdfScaleChange(e.target.value)}
          sx={{
            color: "var(--text-primary)",
            fontFamily: "Inter, sans-serif",
            ".MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--panel-border)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(99,102,241,0.5)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#6366f1",
            },
            ".MuiSvgIcon-root": { color: "var(--text-secondary)" },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "var(--theme-menu-bg)",
                border: "1px solid var(--panel-border)",
                color: "var(--text-primary)",
                fontFamily: "Inter, sans-serif",
              },
            },
          }}
        >
          <MenuItem value={1}>1x (Low - Fast)</MenuItem>
          <MenuItem value={1.5}>1.5x (Medium)</MenuItem>
          <MenuItem value={2}>2x (High - Default)</MenuItem>
          <MenuItem value={3}>3x (Ultra - Slow)</MenuItem>
        </Select>
      </FormControl>

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
          <li>Every 3 pages become 1 stacked sheet</li>
          <li>Pages are tinted & rotated 90°</li>
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
              Arial, size 11
            </strong>{" "}
            for best readability.
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
