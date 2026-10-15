import React, { useMemo, useState, useRef } from 'react';
import { CharacterMood } from '../../data/models/types';
import { audio } from '../sound/audioService';

interface MascotCharacterProps {
  mood?: CharacterMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDialogue?: boolean;
  dialogueOverride?: string;
  className?: string;
  interactive?: boolean;
}

// Witty & humorous Algerian dialogue lines
const WITTY_QUIPS = [
  'واش راك تقرص فيا؟ راني نركّز مش نلعب الغميضة! 😂',
  'أيا حرك روحك شوية، عرافة بدون سرعة ما تصلحش!',
  'ما تقوليش نسيت اسمو وبديت تزهر في الإجابات؟ 🤔',
  'راك حاب تديرلي فخ؟ الحكيم شكون فايق ليك من أول سؤال! 😉',
  'شكون هذا؟ لوكان يطلع صاحبك راني نحسبلك فنجان قهوة عليه!',
  'راك تضغط عليا زعما باش ندوخ؟ حاشا، الذاكرة فولاذية صلبة!',
  'إذا ما جبتوش قبل السؤال العاشر، نعتزل الفراسة ونروح نبيع التاي!',
  'شوف... راني قريب نجيبو وحدي، ارتاح انت برك!',
  'أكرمنا بإجابة صحيحة ومضبوطة، راك دوّخت النجوم معايا! 🌟',
];

// Mysterious & divinatory poetic lines
const MYSTERIOUS_QUIPS = [
  'أسمع صدى ذكرياتك تهمس في رمال الذاكرة...',
  'هناك ملمح خفي بدأ يتشكل بين تفاصيل إجاباتك...',
  'النجوم لا تكذب، لكن ترددك أحدث تموجاً في الرؤيا.',
  'أشعر بهالة هذا الشخص... له حضور يسبق اسمه في وعيك.',
  'بين الصمت والكلمات، تنكشف لي خيوط لم تذكرها بعد.',
  'حكايته محفورة في سجلات الزمن... تكاد تتجلى بالكامل.',
  'كل جواب خطوة نحو المجهول... والمجهول لم يعد بعيداً.',
  'البصيرة تلتقط وميض الحقيقة في ثنايا إجابتك الأخيرة.',
];

export const MascotCharacter: React.FC<MascotCharacterProps> = ({
  mood = 'IDLE',
  size = 'lg',
  showDialogue = true,
  dialogueOverride,
  className = '',
  interactive = true,
}) => {
  const [isTapped, setIsTapped] = useState(false);
  const [activeQuip, setActiveQuip] = useState<{ text: string; mode: 'witty' | 'mysterious' } | null>(null);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // Dimensions scale
  const sizeMap = {
    sm: { width: 110, height: 120 },
    md: { width: 150, height: 165 },
    lg: { width: 200, height: 220 },
    xl: { width: 250, height: 275 },
  }[size];

  // Default whisper based on game state
  const defaultWhisper = useMemo(() => {
    switch (mood) {
      case 'CURIOUS':
        return 'أنا أستمع بكل حواسي... ركّز في الشخص جيداً';
      case 'THINKING':
        return 'دعني أراجع مسارات الصفات والأثر...';
      case 'FOCUSED':
        return 'بدأت الدائرة تضيق... لم يتبق سوى القليل!';
      case 'UNCERTAIN':
        return 'هممم... إجابة محيّرة، سأتحقق من زاوية أعمق';
      case 'SURPRISED':
        return 'أوه! معلومة حاسمة تغيّر كل التوقعات!';
      case 'CONFIDENT':
        return 'تكاد تتضح الملامح بالكامل... النتيجة قريبة!';
      case 'REVEAL':
        return 'عرفتُه! حان وقت كشف المستور!';
      case 'IDLE':
      default:
        return 'فكر في أي شخص... واضغط عليّ إن أردت استشارتي';
    }
  }, [mood]);

  const displayedText = activeQuip?.text || dialogueOverride || defaultWhisper;
  const quoteTag = activeQuip
    ? activeQuip.mode === 'witty'
      ? 'طرفة العرّاف'
      : 'بصيرة الحكيم'
    : null;

  // Eye and posture visual variations
  const isBlinking = mood === 'IDLE';
  const isNarrowed = mood === 'FOCUSED';
  const isWide = mood === 'SURPRISED' || mood === 'REVEAL';
  const isThinking = mood === 'THINKING';
  const isConfident = mood === 'CONFIDENT';
  const isUncertain = mood === 'UNCERTAIN';

  const handleMascotTap = () => {
    if (!interactive) return;

    const now = Date.now();
    const isRapidTap = now - lastTapTimeRef.current < 450;
    lastTapTimeRef.current = now;
    tapCountRef.current = isRapidTap ? tapCountRef.current + 1 : 1;

    setIsTapped(true);
    audio.playChirp();

    if (tapCountRef.current >= 4) {
      // Rapid tap overload funny quip
      setActiveQuip({
        text: 'يا خويا راك دوّختني! خلي الفحمات يبردو شوية! 😵‍💫',
        mode: 'witty',
      });
      tapCountRef.current = 0;
    } else {
      // Alternate between witty and mysterious
      const isWittyTurn = Math.random() > 0.45;
      if (isWittyTurn) {
        const text = WITTY_QUIPS[Math.floor(Math.random() * WITTY_QUIPS.length)];
        setActiveQuip({ text, mode: 'witty' });
      } else {
        const text = MYSTERIOUS_QUIPS[Math.floor(Math.random() * MYSTERIOUS_QUIPS.length)];
        setActiveQuip({ text, mode: 'mysterious' });
      }
    }

    setTimeout(() => {
      setIsTapped(false);
    }, 450);

    // Keep active quip visible for 3.2 seconds
    setTimeout(() => {
      setActiveQuip(null);
    }, 3200);
  };

  return (
    <div
      onClick={handleMascotTap}
      className={`flex flex-col items-center select-none cursor-pointer group ${className}`}
      title={interactive ? 'المس الحكيم لتسمع طرفة أو بصيرة غامضة' : undefined}
    >
      {/* Character Aura & Silhouette Container */}
      <div
        className={`relative flex items-center justify-center transition-transform duration-200 ${
          isTapped ? 'animate-mascot-tap' : ''
        }`}
        style={{
          width: sizeMap.width,
          height: sizeMap.height,
        }}
      >
        {/* Soft, tasteful atmospheric backdrop halo (anti-neon) */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
            mood === 'REVEAL'
              ? 'bg-amber-500/20 scale-105 blur-xl'
              : mood === 'CONFIDENT'
              ? 'bg-amber-600/15 scale-100 blur-lg'
              : isTapped
              ? 'bg-amber-500/25 scale-105 blur-lg'
              : 'bg-amber-900/10 scale-90 blur-md'
          }`}
        />

        {/* Vector Mascot Silhouette */}
        <svg
          viewBox="0 0 200 220"
          className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Rich Obsidian Mantle */}
            <linearGradient id="mantleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#252f40" />
              <stop offset="40%" stopColor="#171e2b" />
              <stop offset="100%" stopColor="#0d121c" />
            </linearGradient>

            {/* Inner Hood Shadow */}
            <linearGradient id="hoodInnerGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#080c14" />
              <stop offset="70%" stopColor="#0d1320" />
              <stop offset="100%" stopColor="#070a10" />
            </linearGradient>

            {/* Antique Burnished Brass Trim */}
            <linearGradient id="trimBrass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3d08a" />
              <stop offset="30%" stopColor="#d49b45" />
              <stop offset="70%" stopColor="#b47b2c" />
              <stop offset="100%" stopColor="#7a4e15" />
            </linearGradient>

            {/* Soft Warm Amber Eye Glow */}
            <linearGradient id="eyeAmber" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <filter id="eyeSoftBloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Group with mood transform animation */}
          <g
            className={`transition-transform duration-300 origin-bottom ${
              isTapped
                ? ''
                : mood === 'CURIOUS'
                ? 'rotate-[2.5deg] translate-y-[-2px]'
                : mood === 'UNCERTAIN'
                ? 'rotate-[-3deg] translate-y-[1px]'
                : mood === 'THINKING'
                ? 'translate-y-[2px] rotate-[1.5deg]'
                : mood === 'SURPRISED'
                ? 'scale-[1.03] translate-y-[-4px]'
                : mood === 'CONFIDENT'
                ? 'scale-[1.02] translate-y-[-2px]'
                : mood === 'REVEAL'
                ? 'scale-[1.04] translate-y-[-5px]'
                : 'animate-[mascotBreath_4.5s_ease-in-out_infinite]'
            }`}
          >
            {/* Mantle / Shoulders */}
            <path
              d="M28 200 C28 152, 60 144, 100 144 C140 144, 172 152, 172 200 C155 214, 130 218, 100 218 C70 218, 45 214, 28 200 Z"
              fill="url(#mantleGrad)"
              stroke="#2c3647"
              strokeWidth="1.2"
            />

            {/* Mantle Fabric Folds */}
            <path
              d="M48 165 C64 185, 75 210, 80 216"
              stroke="#101622"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M152 165 C136 185, 125 210, 120 216"
              stroke="#101622"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />

            {/* Celestial Astrolabe / Talisman of Deduction */}
            <g transform="translate(100, 185)">
              <path
                d="M-22 -35 Q 0 -10, 22 -35"
                fill="none"
                stroke="url(#trimBrass)"
                strokeWidth="1.6"
                opacity="0.85"
              />
              <circle
                cx="0"
                cy="0"
                r="12"
                fill="#161f2e"
                stroke="url(#trimBrass)"
                strokeWidth="1.8"
                className="animate-talisman-glow"
              />
              <circle
                cx="0"
                cy="0"
                r="7"
                fill="none"
                stroke="url(#trimBrass)"
                strokeWidth="1"
                strokeDasharray="2 1.5"
              />
              {/* Inner core jewel */}
              <circle
                cx="0"
                cy="0"
                r="3.2"
                className={`transition-colors duration-300 ${
                  mood === 'REVEAL' || mood === 'CONFIDENT' || isTapped
                    ? 'fill-amber-300'
                    : 'fill-amber-600'
                }`}
              />
            </g>

            {/* Desert Cowl / Hood Outer */}
            <path
              d="M46 135 C36 88, 46 32, 100 22 C154 32, 164 88, 154 135 C140 149, 120 153, 100 153 C80 153, 60 149, 46 135 Z"
              fill="url(#mantleGrad)"
              stroke="#313d50"
              strokeWidth="1.2"
            />

            {/* Hood Embroidery Trim */}
            <path
              d="M50 133 C42 93, 50 40, 100 30 C150 40, 158 93, 150 133"
              fill="none"
              stroke="url(#trimBrass)"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Deep Shrouded Cavity */}
            <path
              d="M60 132 C52 88, 60 52, 100 45 C140 52, 148 88, 140 132 C125 143, 112 145, 100 145 C88 145, 75 143, 60 132 Z"
              fill="url(#hoodInnerGrad)"
            />

            {/* Expressive Warm Amber Eyes */}
            <g filter="url(#eyeSoftBloom)">
              {/* Left Eye */}
              <path
                d={
                  isNarrowed
                    ? 'M75 96 Q87 92, 95 95 Q87 97, 75 96 Z'
                    : isWide || isTapped
                    ? 'M73 95 Q86 86, 96 95 Q86 103, 73 95 Z'
                    : isThinking
                    ? 'M75 93 Q86 89, 95 93 Q86 97, 75 93 Z'
                    : isConfident
                    ? 'M75 95 Q87 90, 95 95 Q87 99, 75 95 Z'
                    : isUncertain
                    ? 'M75 96 Q86 92, 95 96 Q86 99, 75 96 Z'
                    : 'M75 95 Q86 89, 95 95 Q86 99, 75 95 Z'
                }
                fill="url(#eyeAmber)"
                className={isBlinking && !isTapped ? 'animate-[mascotBlink_4.5s_infinite]' : ''}
              />

              {/* Right Eye */}
              <path
                d={
                  isNarrowed
                    ? 'M105 95 Q113 92, 125 96 Q113 97, 105 95 Z'
                    : isWide || isTapped
                    ? 'M104 95 Q114 86, 127 95 Q114 103, 104 95 Z'
                    : isThinking
                    ? 'M105 93 Q114 89, 125 93 Q114 97, 105 93 Z'
                    : isConfident
                    ? 'M105 95 Q113 90, 125 95 Q113 99, 105 95 Z'
                    : isUncertain
                    ? 'M105 93 Q114 87, 125 93 Q114 97, 105 93 Z'
                    : 'M105 95 Q114 89, 125 95 Q114 99, 105 95 Z'
                }
                fill="url(#eyeAmber)"
                className={isBlinking && !isTapped ? 'animate-[mascotBlink_4.5s_infinite]' : ''}
              />

              {/* Focus Point Sparkle */}
              <circle
                cx={isThinking ? '88' : '85'}
                cy={isThinking ? '91' : '94'}
                r={isNarrowed ? '0.8' : '1.3'}
                fill="#ffffff"
                opacity="0.9"
              />
              <circle
                cx={isThinking ? '118' : '115'}
                cy={isThinking ? '91' : '94'}
                r={isNarrowed ? '0.8' : '1.3'}
                fill="#ffffff"
                opacity="0.9"
              />
            </g>
          </g>
        </svg>
      </div>

      {/* Speech / Thought Bubble (Clean tactile parchment styling, no gaudy pills) */}
      {showDialogue && (
        <div className="relative mt-2 px-4 py-2.5 rounded-xl bg-[#141b26] border border-[#2d3748] text-center shadow-lg transition-all duration-200 max-w-[320px] animate-bubble-in">
          {/* Bubble pointer */}
          <div className="absolute -top-1.5 right-1/2 translate-x-1/2 w-3 h-3 bg-[#141b26] border-t border-l border-[#2d3748] rotate-45" />

          {quoteTag && (
            <span className="text-[10px] font-semibold text-[#d49b45] block mb-0.5 tracking-wider">
              ـ {quoteTag} ـ
            </span>
          )}
          <p className="relative text-xs sm:text-[13px] font-medium text-slate-200 leading-relaxed font-body">
            {displayedText}
          </p>
        </div>
      )}
    </div>
  );
};
