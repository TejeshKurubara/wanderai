import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
        onChange(options[focusedIndex].value);
        setIsOpen(false);
      } else {
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('li');
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-2 bg-surface-alt border border-border rounded-xl px-3.5 py-2.5 text-xs text-text hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-left shadow-sm"
      >
        <div className="truncate">
          {selectedOption ? (
            <span className="font-semibold text-text">{selectedOption.label}</span>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
          {selectedOption?.subLabel && (
            <span className="text-[11px] text-muted ml-2">{selectedOption.subLabel}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 left-0 right-0 mt-1.5 bg-surface border border-border/90 rounded-2xl shadow-2xl py-1.5 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-border animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((option, idx) => {
            const isSelected = String(option.value) === String(value);
            const isFocused = idx === focusedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`flex items-center justify-between px-3.5 py-2.5 text-xs cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-bold'
                    : isFocused
                    ? 'bg-surface-hover text-text'
                    : 'text-text hover:bg-surface-hover'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-medium text-text">{option.label}</div>
                  {option.subLabel && (
                    <div className="text-[10px] text-muted truncate">{option.subLabel}</div>
                  )}
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
