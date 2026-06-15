import React from "react";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

function TopRibbon({ onToggleSettings, settingsOpen }) {
  return (
    <header
      className="glass-panel sticky top-0 z-50 flex items-center gap-2 px-3 m-4 mb-0 h-[56px]"
      style={{ borderRadius: "12px" }}
    >
      <IconButton
        size="small"
        onClick={onToggleSettings}
        sx={{ color: settingsOpen ? "#818cf8" : "#a5b4fc" }}
      >
        <MenuIcon fontSize="small" />
      </IconButton>

      <span className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent shrink-0">
        Cheat Sheet Stacker
      </span>
    </header>
  );
}

export default TopRibbon;
