"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface LicensePlateProps {
  plateNumber: string;
}

export default function LicensePlate({ plateNumber }: LicensePlateProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plateNumber.toUpperCase().trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fehler beim Kopieren des Kennzeichens:", err);
    }
  };

  // Helper to parse plate number and insert realistic German plate stickers
  // Format: "DD OH 8989" -> City Initials ("DD"), stickers, and Registration Numbers ("OH 8989")
  const renderPlateContent = () => {
    const rawPlate = plateNumber.toUpperCase().trim();
    const parts = rawPlate.split(/\s+/);

    if (parts.length >= 2) {
      const city = parts[0];
      const rest = parts.slice(1).join(" ");

      return (
        <div className="flex flex-row items-center gap-3 px-3 py-1 font-mono font-bold text-slate-900 tracking-wider text-2xl md:text-3xl select-all whitespace-nowrap flex-nowrap min-w-max">
          {/* City code (e.g., DD, HN, HH) */}
          <span className="whitespace-nowrap">{city}</span>
          
          {/* German HU-Plakette (TÜV) and City Seal sticker stack */}
          <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 select-none">
            {/* Top: HU/TÜV Badge (Green circle with mock date dial) */}
            <div className="w-4 h-4 rounded-full bg-emerald-500 border border-slate-950/20 relative flex items-center justify-center shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <div className="absolute top-0 w-0.5 h-1.5 bg-slate-900 origin-bottom" />
            </div>
            {/* Bottom: Zulassungsstempel (Greyish circle with coat of arms details) */}
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 relative flex items-center justify-center shadow-sm">
              {/* Inner seal pattern */}
              <div className="w-3.5 h-3.5 rounded-full border border-dashed border-sky-600/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded bg-sky-700/60 rotate-45" />
              </div>
            </div>
          </div>

          {/* Registration letters and numbers (e.g., OH 8989) */}
          <span className="whitespace-nowrap">{rest}</span>
        </div>
      );
    }

    // Fallback if no spaces exist in the plate number
    return (
      <div className="px-5 py-1 font-mono font-bold text-slate-900 tracking-wider text-2xl md:text-3xl select-all whitespace-nowrap min-w-max">
        {rawPlate}
      </div>
    );
  };

  return (
    <div className="flex flex-row items-center gap-3 whitespace-nowrap flex-nowrap min-w-max">
      {/* The License Plate */}
      <div className="flex flex-row bg-white border-4 border-slate-950 rounded-lg shadow-sm overflow-hidden min-h-[48px] select-none whitespace-nowrap flex-nowrap min-w-max">
        
        {/* Euroband (Far Left Blue Strip) */}
        <div className="bg-blue-700 text-white flex flex-col items-center justify-between py-1 px-1.5 rounded-l-[2px] w-7 shrink-0 whitespace-nowrap flex-nowrap">
          
          {/* EU Stars Ring SVG */}
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-300 fill-current" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(12, 12)">
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const x = 7 * Math.cos(angle);
                const y = 7 * Math.sin(angle);
                return (
                  <polygon
                      key={i}
                      points="0,-1.5 0.4,-0.4 1.5,-0.4 0.6,0.2 1,1.2 0,0.6 -1,1.2 -0.6,0.2 -1.5,-0.4 -0.4,-0.4"
                      transform={`translate(${x}, ${y}) scale(0.55)`}
                    />
                  );
                })}
              </g>
            </svg>
  
            {/* Country code "D" */}
            <span className="text-[10px] font-black tracking-tighter leading-none mb-0.5">D</span>
          </div>
  
          {/* License Plate Text & Badges */}
          <div className="flex flex-row items-center justify-center bg-white whitespace-nowrap flex-nowrap min-w-max">
            {renderPlateContent()}
          </div>
        </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white p-2.5 rounded-xl shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
        title="Kennzeichen kopieren"
      >
        {copied ? (
          <Check className="w-4.5 h-4.5 text-slate-950" />
        ) : (
          <Copy className="w-4.5 h-4.5" />
        )}
      </button>
    </div>
  );
}
