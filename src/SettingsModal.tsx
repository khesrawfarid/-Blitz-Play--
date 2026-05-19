import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, MousePointer2, Monitor, Info } from 'lucide-react';
import { useSettings } from './SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export default function SettingsModal({ isOpen, onClose, lang }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ mouseSensitivity: parseFloat(e.target.value) });
  };

  const handleGraphicsChange = (quality: 'low' | 'high') => {
    updateSettings({ graphicsQuality: quality });
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ audioLevel: parseFloat(e.target.value) });
  };

  // Translations for settings explicitly inside modal or passing t
  const texts: any = {
    de: { settings: "Einstellungen", ok: "Schließen", sensitivity: "Mausempfindlichkeit", graphics: "Grafikqualität", low: "Niedrig", high: "Hoch", audio: "Lautstärke", infoScale: "Skaliert die UI-Empfindlichkeit" },
    en: { settings: "Settings", ok: "Close", sensitivity: "Mouse Sensitivity", graphics: "Graphics Quality", low: "Low", high: "High", audio: "Audio Level", infoScale: "Scales the UI sensitivity" },
    es: { settings: "Ajustes", ok: "Cerrar", sensitivity: "Sensibilidad del Ratón", graphics: "Calidad Gráfica", low: "Baja", high: "Alta", audio: "Volumen", infoScale: "Escala la sensibilidad de la UI" },
    da: { settings: "Indstillinger", ok: "Luk", sensitivity: "Musefølsomhed", graphics: "Grafikkvalitet", low: "Lav", high: "Høj", audio: "Lydstyrke", infoScale: "Skalerer UI-følsomheden" },
  };

  const t = texts[lang] || texts['en'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-bg-dark border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Monitor size={20} /> {t.settings}
              </h2>
              <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <X size={18} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Graphics Quality */}
              <div>
                <label className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Monitor size={16} /> {t.graphics}
                </label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                      settings.graphicsQuality === 'low'
                        ? 'bg-play-blue text-white shadow-lg shadow-play-blue/20'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                    onClick={() => handleGraphicsChange('low')}
                  >
                    {t.low}
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                      settings.graphicsQuality === 'high'
                        ? 'bg-play-blue text-white shadow-lg shadow-play-blue/20'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                    onClick={() => handleGraphicsChange('high')}
                  >
                    {t.high}
                  </button>
                </div>
                {settings.graphicsQuality === 'low' && (
                  <p className="text-xs text-white/50 mt-2 flex items-start gap-1">
                    <Info size={14} className="shrink-0 mt-0.5"/> Performance mode enabled (disables VFX).
                  </p>
                )}
              </div>

              {/* Mouse Sensitivity */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <MousePointer2 size={16} /> {t.sensitivity}
                  </label>
                  <span className="text-play-blue font-bold">{settings.mouseSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={settings.mouseSensitivity}
                  onChange={handleSensitivityChange}
                  className="w-full accent-play-blue h-2 bg-white/10 rounded-full appearance-none outline-none"
                />
              </div>

              {/* Audio Level */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Volume2 size={16} /> {t.audio}
                  </label>
                  <span className="text-play-blue font-bold">{Math.round(settings.audioLevel * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.audioLevel}
                  onChange={handleAudioChange}
                  className="w-full accent-play-blue h-2 bg-white/10 rounded-full appearance-none outline-none"
                />
              </div>

              {/* API Key */}
              <div>
                <div className="flex justify-between items-end mb-2">
                   <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                     Gemini API Key
                   </label>
                </div>
                <input
                   type="password"
                   placeholder="AIzaSy..."
                   value={settings.geminiApiKey || ''}
                   onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-play-blue/50"
                />
                <p className="text-xs text-white/50 mt-2">
                  Only required if the server API fails or you are running this statically.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
