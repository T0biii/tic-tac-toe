import React from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n/i18n';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-selector">
      {Object.keys(languages).map((lng) => (
        <button
          key={lng}
          onClick={() => changeLanguage(lng)}
          className={`language-button ${i18n.language === lng ? 'active' : ''}`}
          title={languages[lng as keyof typeof languages].nativeName}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
