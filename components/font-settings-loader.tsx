"use client";

import { useEffect } from "react";

export default function FontSettingsLoader() {
  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        if (window.electron) {
          const settings = await window.electron.getAppearanceSettings();
          if (settings) {
            const { fontFamily, fontSize } = settings;
            document.body.style.fontFamily = fontFamily;
            document.body.style.fontSize = fontSize;
          }
        }
      } catch (error) {
        console.error("Error loading font settings:", error);
      }
    };

    loadFontSettings();
  }, []);

  return null; // This is a utility component that doesn't render anything
} 