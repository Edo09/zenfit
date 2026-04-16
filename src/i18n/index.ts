import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import es from "./es";

const LANGUAGE_KEY = "app_language";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Load saved language preference
AsyncStorage.getItem(LANGUAGE_KEY).then((lang) => {
  if (lang && (lang === "en" || lang === "es")) {
    i18n.changeLanguage(lang);
  }
});

export async function setLanguage(lang: "en" | "es") {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
