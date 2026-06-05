import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import th from './locales/th.json';
import ptBR from './locales/pt-BR.json';
import pt from './locales/pt.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  th: { translation: th },
  'pt-BR': { translation: ptBR },
  pt: { translation: pt },
};

const LANGUAGE_KEY = 'user-language';

const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        const primaryLocale = locales[0];
        const { languageTag, languageCode } = primaryLocale;
        
        // Check if we have a direct match for the full tag (e.g., pt-BR)
        if (resources.hasOwnProperty(languageTag)) {
          return callback(languageTag);
        }
        
        // Check if we have a match for the base language code (e.g., pt, en, hi)
        if (languageCode && resources.hasOwnProperty(languageCode)) {
          return callback(languageCode);
        }
      }
      
      callback('en');
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error caching language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
