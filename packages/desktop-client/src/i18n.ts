import { initReactI18next } from 'react-i18next';

import * as Platform from '@actual-app/core/shared/platform';
import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import { languages } from './languages';
import { fr as forkFr } from './locale-fork/fr';

// Les libelles propres a ce fork (les reserves) n'existent pas dans le depot de
// traductions amont, et `locale/` en est un clone non versionne : les ajouter
// la-bas serait perdu au premier `git pull`. On les superpose donc ici.
const forkTranslations: Record<string, Record<string, string>> = { fr: forkFr };

export const availableLanguages = Platform.isPlaywright
  ? []
  : Object.keys(languages).map(path => path.split('/')[2].split('.')[0]);

const isLanguageAvailable = (language: string) =>
  Object.hasOwn(languages, `/locale/${language}.json`);

const loadLanguage = async (language: string) => {
  if (!isLanguageAvailable(language)) {
    throw new Error(`Unknown locale ${language}`);
  }
  // Le glob Vite renvoie un module ; selon la cible, les libelles sont sur
  // `default` ou directement sur l'objet.
  const loaded = (await languages[`/locale/${language}.json`]()) as {
    default?: Record<string, string>;
  };
  const base = (loaded.default ?? loaded) as Record<string, string>;
  const fork = forkTranslations[language];
  return fork ? { ...base, ...fork } : base;
};

void i18n
  .use(initReactI18next)
  .use(resourcesToBackend(loadLanguage))
  .init({
    lng: 'en',

    // allow keys to be phrases having `:`, `.`
    nsSeparator: false,
    keySeparator: false,
    // do not load a fallback
    fallbackLng: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      transSupportBasicHtmlNodes: false,
    },
  });

const resolveLanguage = (language: string) => {
  // English is always available since we use natural-language keys.
  if (language === 'en') return 'en';

  if (isLanguageAvailable(language)) return language;

  const lowercaseLanguage = language.toLowerCase();
  if (lowercaseLanguage !== language) {
    console.info(
      `Unknown locale ${language}, falling back to ${lowercaseLanguage}`,
    );
    return resolveLanguage(lowercaseLanguage);
  }

  if (language.includes('-')) {
    const fallback = language.split('-')[0];
    console.info(`Unknown locale ${language}, falling back to ${fallback}`);
    return resolveLanguage(fallback);
  }

  return undefined;
};

export const setI18NextLanguage = (language: string | null) => {
  const defaultLanguages = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language || 'en'];
  const languagesToTry = language ? [language] : defaultLanguages;

  let resolved: string | undefined;

  for (const lang of languagesToTry) {
    resolved = resolveLanguage(lang);
    if (resolved) break;
  }

  if (!resolved) {
    // Fall back to English
    console.info(
      language
        ? `Unknown locale ${language}, falling back to en`
        : `Unknown locales [${languagesToTry.join(', ')}] falling back to en`,
    );
    resolved = 'en';
  }

  if (resolved === i18n.language) {
    return; // language is already set
  }

  void i18n.changeLanguage(resolved);
};
