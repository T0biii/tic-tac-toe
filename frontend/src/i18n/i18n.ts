import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importiere die Übersetzungsdateien
import translationDE from './translations/de.json';
import translationEN from './translations/en.json';

// Die verfügbaren Sprachen
export const languages = {
  de: { nativeName: 'Deutsch' },
  en: { nativeName: 'English' }
};

// Konfiguriere i18next
i18n
  // Erkennt die Browsersprache
  .use(LanguageDetector)
  // Bindet i18n an React
  .use(initReactI18next)
  // Initialisiere i18next
  .init({
    resources: {
      de: {
        translation: translationDE
      },
      en: {
        translation: translationEN
      }
    },
    fallbackLng: 'de',
    debug: false,

    // Gemeinsame Namespaces für alle Sprachen
    ns: ['translation'],
    defaultNS: 'translation',

    keySeparator: '.',

    interpolation: {
      escapeValue: false // React escaped bereits
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
