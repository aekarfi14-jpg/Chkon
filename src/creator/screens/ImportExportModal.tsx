import React, { useState } from 'react';
import { Group, ExportDataV1 } from '../../data/models/types';
import { db } from '../../data/repository/database';
import { Modal } from '../../shared/ui/Modal';
import { Download, Upload, FileCheck, AlertTriangle } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group;
  onDataChanged: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  onDataChanged,
}) => {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [previewData, setPreviewData] = useState<ExportDataV1 | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Handle Export
  const handleExport = () => {
    try {
      const data = db.exportGroup(activeGroup.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shkoun_${activeGroup.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      audio.playVictory();
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', message: 'تعذر تصدير البيانات.' });
    }
  };

  // Handle File Selection for Import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.app !== 'shkoun' || !parsed.group || !Array.isArray(parsed.people)) {
          setImportStatus({
            type: 'error',
            message: 'الملف غير متطابق مع بنية بيانات لعبة شكون (Shkoun).',
          });
          setPreviewData(null);
          return;
        }
        setPreviewData(parsed as ExportDataV1);
        setImportStatus({ type: null, message: '' });
        audio.playClick();
      } catch (err) {
        setImportStatus({
          type: 'error',
          message: 'فشل في قراءة ملف JSON. تأكد من سلامة الملف.',
        });
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  // Perform Final Import
  const handleConfirmImport = () => {
    if (!previewData) return;

    const res = db.importData(previewData, importMode);
    if (res.success) {
      audio.playVictory();
      setImportStatus({ type: 'success', message: res.message });
      setPreviewData(null);
      onDataChanged();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setImportStatus({ type: 'error', message: res.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصدير واستيراد البيانات (Import / Export)"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Status Notification */}
        {importStatus.message && (
          <div
            className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
              importStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {importStatus.type === 'success' ? (
              <FileCheck className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* Export Box */}
        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-100">تصدير المجموعة الحالية</h4>
              <p className="text-xs text-slate-400">
                تحميل نسخة احتياطية من مجموعة &quot;{activeGroup.name}&quot; كملف JSON
              </p>
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير JSON</span>
            </button>
          </div>
        </div>

        {/* Import Box */}
        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100">استيراد مجموعة من ملف</h4>
            <p className="text-xs text-slate-400">
              اختر ملف JSON متوافق سبق تصديره من اللعبة
            </p>
          </div>

          <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40">
            <Upload className="w-6 h-6 text-amber-400 mb-1" />
            <span className="text-xs font-semibold text-slate-300">انقر لاختيار ملف JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {/* Import Preview */}
          {previewData && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">معاينة الملف المختار:</span>
                <span className="text-slate-400">
                  {previewData.people.length} أشخاص
                </span>
              </div>
              <p className="text-slate-300">
                اسم المجموعة: <strong className="text-slate-100">{previewData.group.name}</strong>
              </p>

              {/* Mode Selection */}
              <div className="space-y-1.5 pt-2 border-t border-amber-500/20">
                <span className="font-semibold text-slate-300 block">طريقة الاستيراد:</span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-amber-500"
                    />
                    <span>إنشاء مجموعة جديدة مستقلة (Merge)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-amber-500"
                    />
                    <span>استبدال البيانات القديمة (Replace)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleConfirmImport}
                className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                تأكيد وبدء الاستيراد
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
