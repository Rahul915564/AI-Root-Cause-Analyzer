import React, { createContext, useContext, useState } from "react";

type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.title": "Root Cause Analyzer",
    "nav.analyzer": "Analyzer",
    "nav.history": "History",
    "nav.stats": "Stats",
    "analyzer.tabs.paste": "Paste Log/Trace",
    "analyzer.tabs.upload": "Upload File (.txt/.log)",
    "analyzer.tabs.message": "Type Error Message",
    "analyzer.input.placeholder": "Paste your stack trace or error log here...",
    "analyzer.message.placeholder": "Type your error message...",
    "analyzer.upload.drag": "Drag & drop a file here, or click to select",
    "analyzer.analyze_button": "Analyze Error",
    "analyzer.analyzing": "Analyzing...",
    "analyzer.results.title": "Analysis Results",
    "analyzer.results.confidence": "Confidence",
    "analyzer.results.root_cause": "Root Cause",
    "analyzer.results.explanation": "Step-by-step Explanation",
    "analyzer.results.fixes": "Suggested Fixes",
    "analyzer.results.stackoverflow": "Stack Overflow References",
    "history.title": "Analysis History",
    "history.export": "Export PDF",
    "history.filter.all": "All",
    "history.table.error_type": "Error Type",
    "history.table.language": "Language",
    "history.table.confidence": "Confidence",
    "history.table.priority": "Priority",
    "history.table.date": "Date",
    "stats.title": "Analytics Dashboard",
    "stats.total": "Total Analyses",
    "stats.avg_confidence": "Avg. Confidence",
    "stats.critical": "Critical Issues",
  },
  hi: {
    "app.title": "मूल कारण विश्लेषक",
    "nav.analyzer": "विश्लेषक",
    "nav.history": "इतिहास",
    "nav.stats": "आंकड़े",
    "analyzer.tabs.paste": "लॉग/ट्रेस पेस्ट करें",
    "analyzer.tabs.upload": "फ़ाइल अपलोड करें (.txt/.log)",
    "analyzer.tabs.message": "त्रुटि संदेश टाइप करें",
    "analyzer.input.placeholder": "अपना स्टैक ट्रेस या त्रुटि लॉग यहां पेस्ट करें...",
    "analyzer.message.placeholder": "अपना त्रुटि संदेश टाइप करें...",
    "analyzer.upload.drag": "फ़ाइल यहां खींचें और छोड़ें, या चुनने के लिए क्लिक करें",
    "analyzer.analyze_button": "त्रुटि का विश्लेषण करें",
    "analyzer.analyzing": "विश्लेषण कर रहा है...",
    "analyzer.results.title": "विश्लेषण परिणाम",
    "analyzer.results.confidence": "आत्मविश्वास",
    "analyzer.results.root_cause": "मूल कारण",
    "analyzer.results.explanation": "चरण-दर-चरण व्याख्या",
    "analyzer.results.fixes": "सुझाए गए सुधार",
    "analyzer.results.stackoverflow": "स्टैक ओवरफ़्लो संदर्भ",
    "history.title": "विश्लेषण इतिहास",
    "history.export": "पीडीएफ निर्यात करें",
    "history.filter.all": "सभी",
    "history.table.error_type": "त्रुटि प्रकार",
    "history.table.language": "भाषा",
    "history.table.confidence": "आत्मविश्वास",
    "history.table.priority": "प्राथमिकता",
    "history.table.date": "तारीख",
    "stats.title": "एनालिटिक्स डैशबोर्ड",
    "stats.total": "कुल विश्लेषण",
    "stats.avg_confidence": "औसत आत्मविश्वास",
    "stats.critical": "महत्वपूर्ण मुद्दे",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
