/**
 * LanguageSelector - 언어 선택 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
    console.log('🌐 Language changed to:', langCode);
  };

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="language-selector" ref={selectorRef}>
      <button 
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="language-selector-icon">🌐</span>
        <span className="language-selector-label">
          {languages.find((l) => l.code === i18n.language)?.flag || '🌐'}
        </span>
      </button>
      
      {isOpen && (
        <div className="language-selector-menu">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-label">{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="language-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

