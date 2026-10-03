import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  name: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  image,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  }[size];

  // Derive stable pleasant background hue from name
  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  if (image) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800 shrink-0 ${sizeClasses} ${className}`}
      >
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // fallback if corrupt
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-slate-800 text-amber-300 font-bold flex items-center justify-center shrink-0 shadow-inner ${sizeClasses} ${className}`}
      title={name}
    >
      {name ? getInitials(name) : <User className="w-1/2 h-1/2 opacity-60" />}
    </div>
  );
};
