import React from 'react';
import { Person, DataHealthReport } from '../../data/models/types';
import { Modal } from '../../shared/ui/Modal';
import { calculateDataHealth } from '../../core/validation/dataHealth';
import { ShieldAlert, CheckCircle2, AlertTriangle, Users, HeartHandshake, Sparkles, Edit3 } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface DataHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  onEditPerson: (person: Person) => void;
}

export const DataHealthModal: React.FC<DataHealthModalProps> = ({
  isOpen,
  onClose,
  people,
  onEditPerson,
}) => {
  const report: DataHealthReport = calculateDataHealth(people);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="صحة قاعدة البيانات (Data Health)"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Score & Health Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">مستوى جودة البيانات</span>
            <h4 className="text-base font-bold text-slate-100">
              {report.healthScore >= 85
                ? 'البيانات ممتازة وجاهزة للعب'
                : report.healthScore >= 60
                ? 'البيانات جيدة وتحتاج تحسينات بسيطة'
                : 'يوجد تعارضات أو نقص يحتاج للمعالجة'}
            </h4>
          </div>
          <div
            className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center font-black ${getScoreColor(
              report.healthScore
            )}`}
          >
            <span className="text-xl tabular-nums">{report.healthScore}%</span>
            <span className="text-[10px] opacity-80">صحة</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>الأشخاص</span>
            </div>
            <span className="text-xl font-bold text-slate-100 tabular-nums">
              {report.totalPeople}
            </span>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>التعارضات</span>
            </div>
            <span
              className={`text-xl font-bold tabular-nums ${
                report.conflictsCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {report.conflictsCount}
            </span>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
              <span>العلاقات</span>
            </div>
            <span className="text-xl font-bold text-slate-100 tabular-nums">
              {report.totalRelationships}
            </span>
            <span className="text-[10px] text-slate-500 block">
              ({report.inferredRelationships} مستنتجة)
            </span>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>خصائص مخصصة</span>
            </div>
            <span className="text-xl font-bold text-slate-100 tabular-nums">
              {report.totalCustomFacts}
            </span>
          </div>
        </div>

        {/* Completeness Summary */}
        <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-slate-300">الملفات الشخصية المكتملة:</span>
          <span className="font-bold text-amber-400 tabular-nums">
            {report.completeProfiles} من {report.totalPeople}
          </span>
        </div>

        {/* Detailed Issues List */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-300">الملاحظات والتعارضات المرصودة:</h5>
          {report.issues.length === 0 ? (
            <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>رائع! لا توجد أي تعارضات أو أخطاء في شجرة العلاقات والبيانات.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {report.issues.map((issue) => {
                const targetPerson = people.find((p) => p.id === issue.personId);
                return (
                  <div
                    key={`${issue.id}_${issue.personId}`}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                      issue.type === 'error'
                        ? 'bg-rose-950/30 border-rose-900/60 text-rose-200'
                        : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          issue.type === 'error' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      />
                      <div>
                        {issue.personName && (
                          <span className="font-bold ml-1">[{issue.personName}]:</span>
                        )}
                        <span>{issue.message}</span>
                      </div>
                    </div>

                    {targetPerson && (
                      <button
                        onClick={() => {
                          audio.playClick();
                          onClose();
                          onEditPerson(targetPerson);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors shrink-0 flex items-center gap-1"
                        title="إصلاح الآن"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">إصلاح</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
