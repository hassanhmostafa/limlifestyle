import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "ar";

export interface Translations {
  // Navigation
  nav_findStation: string;
  nav_myHealth: string;
  nav_admin: string;
  nav_signIn: string;
  nav_signOut: string;
  nav_getStarted: string;

  // Homepage Hero
  hero_badge: string;
  hero_title1: string;
  hero_title2: string;
  hero_subtitle: string;
  hero_findStation: string;
  hero_learnMore: string;
  hero_activeStations: string;
  hero_usersScreened: string;

  // Homepage sections
  home_searchTitle: string;
  home_searchSubtitle: string;
  home_searchPlaceholder: string;
  home_searchBtn: string;
  home_whyTitle: string;
  home_whySubtitle: string;
  home_servicesTitle: string;
  home_servicesSubtitle: string;
  home_ctaTitle: string;
  home_ctaSubtitle: string;
  home_ctaBtn: string;

  // Features
  feat_locations: string;
  feat_locationsDesc: string;
  feat_hours: string;
  feat_hoursDesc: string;
  feat_screening: string;
  feat_screeningDesc: string;
  feat_tracking: string;
  feat_trackingDesc: string;
  feat_privacy: string;
  feat_privacyDesc: string;
  feat_instant: string;
  feat_instantDesc: string;

  // Services
  svc_bp: string;
  svc_bpDesc: string;
  svc_weight: string;
  svc_weightDesc: string;
  svc_hr: string;
  svc_hrDesc: string;
  svc_temp: string;
  svc_tempDesc: string;
  svc_assessment: string;
  svc_assessmentDesc: string;
  svc_risk: string;
  svc_riskDesc: string;

  // Find Station
  findStation_title: string;
  findStation_subtitle: string;
  findStation_searchPlaceholder: string;
  findStation_results: string;
  findStation_noResults: string;
  findStation_open: string;
  findStation_closed: string;
  findStation_viewDetails: string;
  findStation_getDirections: string;
  findStation_services: string;
  findStation_hours: string;

  // Health Dashboard
  health_title: string;
  health_welcome: string;
  health_logReading: string;
  health_score: string;
  health_bpLabel: string;
  health_hrLabel: string;
  health_weightLabel: string;
  health_bmiLabel: string;
  health_bpTrend: string;
  health_hrWeight: string;
  health_bmiComparison: string;
  health_history: string;
  health_noReadings: string;
  health_signInPrompt: string;
  health_signInBtn: string;

  // Footer
  footer_tagline: string;
  footer_quickLinks: string;
  footer_services: string;
  footer_contact: string;
  footer_rights: string;
}

const en: Translations = {
  nav_findStation: "Find Station",
  nav_myHealth: "My Health",
  nav_admin: "Admin",
  nav_signIn: "Sign In",
  nav_signOut: "Sign Out",
  nav_getStarted: "Get Started",

  hero_badge: "✨ Your Health, Anytime, Anywhere",
  hero_title1: "Your Health,",
  hero_title2: "Our Priority",
  hero_subtitle:
    "Access advanced health screenings at convenient kiosk locations across Jeddah. Measure your vital signs, track your wellness journey, and get personalized health insights with Tech Care.",
  hero_findStation: "Find a Station",
  hero_learnMore: "Learn More",
  hero_activeStations: "Active Stations",
  hero_usersScreened: "Users Screened",

  home_searchTitle: "Find Your Nearest Station",
  home_searchSubtitle: "Search by location or browse all available kiosks",
  home_searchPlaceholder: "Enter your location or station name...",
  home_searchBtn: "Search",
  home_whyTitle: "Why Choose Tech Care?",
  home_whySubtitle:
    "Experience modern healthcare accessibility with our comprehensive health screening platform",
  home_servicesTitle: "Health Screening Services",
  home_servicesSubtitle: "Our kiosks provide comprehensive health measurements and assessments",
  home_ctaTitle: "Ready to Start Your Wellness Journey?",
  home_ctaSubtitle: "Find your nearest Tech Care station today and take control of your health",
  home_ctaBtn: "Find a Station Near You",

  feat_locations: "Convenient Locations",
  feat_locationsDesc:
    "Find health stations in shopping malls, pharmacies, and community centers across Jeddah",
  feat_hours: "Extended Hours",
  feat_hoursDesc: "Access health screenings during extended hours, from early morning to late evening",
  feat_screening: "Comprehensive Screening",
  feat_screeningDesc:
    "Measure blood pressure, weight, BMI, heart rate, and receive personalized health assessments",
  feat_tracking: "Track Progress",
  feat_trackingDesc:
    "Monitor your health metrics over time and receive insights to improve your wellness",
  feat_privacy: "Privacy Protected",
  feat_privacyDesc:
    "Your health data is encrypted and protected with industry-leading security standards",
  feat_instant: "Instant Results",
  feat_instantDesc: "Get immediate health screening results and recommendations at the kiosk",

  svc_bp: "Blood Pressure",
  svc_bpDesc: "Monitor your cardiovascular health",
  svc_weight: "Weight & BMI",
  svc_weightDesc: "Track your body composition",
  svc_hr: "Heart Rate",
  svc_hrDesc: "Check your pulse and rhythm",
  svc_temp: "Temperature",
  svc_tempDesc: "Measure body temperature",
  svc_assessment: "Health Assessment",
  svc_assessmentDesc: "Get personalized health insights",
  svc_risk: "Risk Screening",
  svc_riskDesc: "Identify potential health risks",

  findStation_title: "Find a Health Station",
  findStation_subtitle: "Locate the nearest Tech Care kiosk in Jeddah",
  findStation_searchPlaceholder: "Search by name or area...",
  findStation_results: "stations found",
  findStation_noResults: "No stations match your search.",
  findStation_open: "Open",
  findStation_closed: "Closed",
  findStation_viewDetails: "View Details",
  findStation_getDirections: "Get Directions",
  findStation_services: "Services",
  findStation_hours: "Hours",

  health_title: "My Health Dashboard",
  health_welcome: "Welcome back",
  health_logReading: "Log Reading",
  health_score: "Overall Health Score",
  health_bpLabel: "Blood Pressure",
  health_hrLabel: "Heart Rate",
  health_weightLabel: "Weight",
  health_bmiLabel: "BMI",
  health_bpTrend: "Blood Pressure Trend",
  health_hrWeight: "Heart Rate & Weight",
  health_bmiComparison: "BMI Comparison",
  health_history: "Reading History",
  health_noReadings: "No readings yet. Log your first health measurement!",
  health_signInPrompt: "Sign in to view your health history and track your wellness trends over time.",
  health_signInBtn: "Sign In to Continue",

  footer_tagline: "Empowering health through accessible technology across Saudi Arabia.",
  footer_quickLinks: "Quick Links",
  footer_services: "Services",
  footer_contact: "Contact",
  footer_rights: "All rights reserved.",
};

const ar: Translations = {
  nav_findStation: "ابحث عن محطة",
  nav_myHealth: "صحتي",
  nav_admin: "الإدارة",
  nav_signIn: "تسجيل الدخول",
  nav_signOut: "تسجيل الخروج",
  nav_getStarted: "ابدأ الآن",

  hero_badge: "✨ صحتك، في أي وقت وأي مكان",
  hero_title1: "صحتك،",
  hero_title2: "أولويتنا",
  hero_subtitle:
    "احصل على فحوصات صحية متقدمة في مواقع الأكشاك المريحة عبر جدة. قِس علاماتك الحيوية، تتبع رحلتك الصحية، واحصل على رؤى صحية شخصية مع تك كير.",
  hero_findStation: "ابحث عن محطة",
  hero_learnMore: "اعرف المزيد",
  hero_activeStations: "محطة نشطة",
  hero_usersScreened: "مستخدم تم فحصه",

  home_searchTitle: "ابحث عن أقرب محطة",
  home_searchSubtitle: "ابحث حسب الموقع أو تصفح جميع الأكشاك المتاحة",
  home_searchPlaceholder: "أدخل موقعك أو اسم المحطة...",
  home_searchBtn: "بحث",
  home_whyTitle: "لماذا تختار تك كير؟",
  home_whySubtitle: "اختبر إمكانية الوصول إلى الرعاية الصحية الحديثة مع منصة الفحص الصحي الشاملة",
  home_servicesTitle: "خدمات الفحص الصحي",
  home_servicesSubtitle: "توفر أكشاكنا قياسات وتقييمات صحية شاملة",
  home_ctaTitle: "هل أنت مستعد لبدء رحلتك الصحية؟",
  home_ctaSubtitle: "ابحث عن أقرب محطة تك كير اليوم وتحكم في صحتك",
  home_ctaBtn: "ابحث عن محطة قريبة منك",

  feat_locations: "مواقع مريحة",
  feat_locationsDesc: "ابحث عن محطات صحية في المراكز التجارية والصيدليات ومراكز المجتمع عبر جدة",
  feat_hours: "ساعات ممتدة",
  feat_hoursDesc: "الوصول إلى الفحوصات الصحية خلال ساعات ممتدة، من الصباح الباكر حتى وقت متأخر من الليل",
  feat_screening: "فحص شامل",
  feat_screeningDesc: "قِس ضغط الدم والوزن ومؤشر كتلة الجسم ومعدل ضربات القلب واحصل على تقييمات صحية شخصية",
  feat_tracking: "تتبع التقدم",
  feat_trackingDesc: "راقب مقاييسك الصحية بمرور الوقت واحصل على رؤى لتحسين صحتك",
  feat_privacy: "خصوصية محمية",
  feat_privacyDesc: "بياناتك الصحية مشفرة ومحمية بأعلى معايير الأمان في الصناعة",
  feat_instant: "نتائج فورية",
  feat_instantDesc: "احصل على نتائج الفحص الصحي والتوصيات فوراً عند الكشك",

  svc_bp: "ضغط الدم",
  svc_bpDesc: "راقب صحتك القلبية الوعائية",
  svc_weight: "الوزن ومؤشر كتلة الجسم",
  svc_weightDesc: "تتبع تركيبة جسمك",
  svc_hr: "معدل ضربات القلب",
  svc_hrDesc: "تحقق من نبضك وإيقاعه",
  svc_temp: "درجة الحرارة",
  svc_tempDesc: "قِس درجة حرارة الجسم",
  svc_assessment: "التقييم الصحي",
  svc_assessmentDesc: "احصل على رؤى صحية شخصية",
  svc_risk: "فحص المخاطر",
  svc_riskDesc: "تحديد المخاطر الصحية المحتملة",

  findStation_title: "ابحث عن محطة صحية",
  findStation_subtitle: "حدد موقع أقرب كشك تك كير في جدة",
  findStation_searchPlaceholder: "ابحث بالاسم أو المنطقة...",
  findStation_results: "محطة موجودة",
  findStation_noResults: "لا توجد محطات تطابق بحثك.",
  findStation_open: "مفتوح",
  findStation_closed: "مغلق",
  findStation_viewDetails: "عرض التفاصيل",
  findStation_getDirections: "الحصول على الاتجاهات",
  findStation_services: "الخدمات",
  findStation_hours: "ساعات العمل",

  health_title: "لوحة تحكم صحتي",
  health_welcome: "مرحباً بعودتك",
  health_logReading: "تسجيل قراءة",
  health_score: "النتيجة الصحية الإجمالية",
  health_bpLabel: "ضغط الدم",
  health_hrLabel: "معدل ضربات القلب",
  health_weightLabel: "الوزن",
  health_bmiLabel: "مؤشر كتلة الجسم",
  health_bpTrend: "اتجاه ضغط الدم",
  health_hrWeight: "معدل ضربات القلب والوزن",
  health_bmiComparison: "مقارنة مؤشر كتلة الجسم",
  health_history: "سجل القراءات",
  health_noReadings: "لا توجد قراءات بعد. سجّل أول قياس صحي!",
  health_signInPrompt: "سجّل الدخول لعرض سجلك الصحي وتتبع اتجاهات صحتك بمرور الوقت.",
  health_signInBtn: "سجّل الدخول للمتابعة",

  footer_tagline: "تمكين الصحة من خلال التكنولوجيا المتاحة في جميع أنحاء المملكة العربية السعودية.",
  footer_quickLinks: "روابط سريعة",
  footer_services: "الخدمات",
  footer_contact: "تواصل معنا",
  footer_rights: "جميع الحقوق محفوظة.",
};

export const translations: Record<Language, Translations> = { en, ar };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("tc_lang") as Language) ?? "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("tc_lang", lang);
  };

  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language], isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
