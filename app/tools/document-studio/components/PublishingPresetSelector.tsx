import React from "react";
import { PUBLISHING_PRESETS, ALL_PRESET_IDS, type PresetId } from "../utils/publishingPresets";

interface PublishingPresetSelectorProps {
  selectedId: PresetId;
  onChange: (id: PresetId) => void;
}

/**
 * Publishing Preset Foundation — Phase 1 (2026-08-09). A minimal
 * selector that persists the user's choice (via DocumentStudioEditor.tsx's
 * localStorage wiring) — it does NOT currently affect DOCX/PDF export or
 * any editor formatting. This exists solely so the preset foundation has
 * a real, usable entry point; a later phase would read the selected
 * preset to actually configure export output.
 */
export const PublishingPresetSelector: React.FC<PublishingPresetSelectorProps> = ({ selectedId, onChange }) => {
  return (
    <div className="flex items-center gap-2 text-xs" dir="rtl" title="اشاعتی انداز — فی الحال صرف ترجیح محفوظ ہوتی ہے">
      <label htmlFor="publishing-preset-select" className="text-slate-500 whitespace-nowrap">
        اشاعتی انداز:
      </label>
      <select
        id="publishing-preset-select"
        value={selectedId}
        onChange={(e) => onChange(e.target.value as PresetId)}
        className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white text-slate-700"
      >
        {ALL_PRESET_IDS.map((id) => (
          <option key={id} value={id}>
            {PUBLISHING_PRESETS[id].labelUrdu} ({PUBLISHING_PRESETS[id].labelEnglish})
          </option>
        ))}
      </select>
    </div>
  );
};
