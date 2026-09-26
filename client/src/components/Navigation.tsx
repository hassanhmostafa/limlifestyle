import { Link, useLocation } from "wouter";
import { Heart, Menu, X, LayoutDashboard, LogIn, LogOut, UserCircle2, Globe, Sparkles, Building2, CalendarDays, Stethoscope, MessageCircle, Download, Share, QrCode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInstallApp, IOSInstallModal } from "@/components/PWAInstallPrompt";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { canInstall, isIOS, install } = useInstallApp();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleNavInstall = async () => {
    if (isIOS) { setShowIOSModal(true); return; }
    await install();
  };

  const navLinks = [
    { href: "/find-station", label: t.nav_findStation },
    { href: "/health", label: t.nav_myHealth },
    ...(isAuthenticated ? [{ href: "/ai-plan", label: language === "ar" ? "خطة الذكاء الاصطناعي" : "AI Plan" }] : []),
  ];

  const toggleLanguage = () => setLanguage(language === "en" ? "ar" : "en");

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#dfe9e1] bg-white/95 shadow-[0_4px_18px_rgba(7,63,53,0.06)] backdrop-blur-md">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff45a] shadow-[0_8px_18px_rgba(130,166,40,0.25)]">
              <Heart className="h-6 w-6 text-[#073f35]" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#073f35]">LIM</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}>
              <span
                className={`transition-colors cursor-pointer font-medium ${
                  location === href ? "text-[#075847]" : "text-[#49665c] hover:text-[#075847]"
                }`}
              >
                {label}
              </span>
            </Link>
          ))}

          {isAuthenticated && (
            <Link href="/my-bookings">
              <span
                className={`transition-colors cursor-pointer font-medium flex items-center gap-1 ${
                  location === "/my-bookings" ? "text-[#075847]" : "text-[#49665c] hover:text-[#075847]"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                {language === "ar" ? "حجوزاتي" : "My Bookings"}
              </span>
            </Link>
          )}

          {isAuthenticated && (
            <Link href="/kiosk-qr">
              <span
                className={`transition-colors cursor-pointer font-medium flex items-center gap-1 ${
                  location === "/kiosk-qr" ? "text-[#075847]" : "text-[#49665c] hover:text-[#075847]"
                }`}
              >
                <QrCode className="w-4 h-4" />
                {language === "ar" ? "رمز QR الخاص بي" : "My QR Code"}
              </span>
            </Link>
          )}
          {isAuthenticated && (
            <Link href="/experts">
              <span
                className={`transition-colors cursor-pointer font-medium flex items-center gap-1 ${
                  location === "/experts" ? "text-[#075847]" : "text-[#49665c] hover:text-[#075847]"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                {language === "ar" ? "خبراء الصحة" : "Experts"}
              </span>
            </Link>
          )}
          {user?.role === "expert" && (
            <Link href="/expert-inbox">
              <span
                className={`transition-colors cursor-pointer font-medium flex items-center gap-1 ${
                  location === "/expert-inbox" ? "text-[#075847]" : "text-[#49665c] hover:text-[#075847]"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                {language === "ar" ? "صندوق الوارد" : "Expert Inbox"}
              </span>
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin">
              <span
                className={`transition-colors cursor-pointer font-medium flex items-center gap-1 ${
                  location === "/admin" ? "text-[#075847]" : "text-[#49665c] hover:text-[#075847]"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                {t.nav_admin}
              </span>
            </Link>
          )}
        </div>

        {/* Desktop Auth + Language */}
        <div className="hidden md:flex items-center gap-3">
          {/* Install App Button — desktop */}
          {canInstall && (
            <button
              onClick={handleNavInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors text-sm font-medium text-emerald-700"
              title={language === "ar" ? "تثبيت التطبيق" : "Install App"}
            >
              {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {language === "ar" ? "تثبيت" : "Install"}
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm font-medium text-gray-600 hover:text-emerald-600"
            title={language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
          >
            <Globe className="w-4 h-4" />
            {language === "en" ? "عربي" : "EN"}
          </button>

          {isAuthenticated ? (
            <>
              <Link href="/profile">
                <span className={`text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  location === "/profile" ? "text-emerald-600" : "text-gray-600 hover:text-emerald-600"
                }`}>
                  <UserCircle2 className="w-4 h-4" />
                  {user?.name?.split(" ")[0]}
                </span>
              </Link>
              <Button
                variant="ghost"
                className="text-gray-700 hover:text-red-600"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4 mr-1" />
                {t.nav_signOut}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-emerald-600">
                  <LogIn className="w-4 h-4 mr-1" />
                  {t.nav_signIn}
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">{t.nav_getStarted}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === "en" ? "عربي" : "EN"}
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="container py-4 space-y-2">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}>
                <div
                  className="text-gray-700 hover:text-emerald-600 py-2 cursor-pointer font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {label}
                </div>
              </Link>
            ))}

            {isAuthenticated && (
              <Link href="/kiosk-qr">
                <div
                  className="text-gray-700 hover:text-emerald-600 py-2 cursor-pointer font-medium flex items-center gap-1"
                  onClick={() => setIsOpen(false)}
                >
                  <QrCode className="w-4 h-4" />
                  {language === "ar" ? "رمز QR الخاص بي" : "My QR Code"}
                </div>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/my-bookings">
                <div
                  className="text-gray-700 hover:text-emerald-600 py-2 cursor-pointer font-medium flex items-center gap-1"
                  onClick={() => setIsOpen(false)}
                >
                  <CalendarDays className="w-4 h-4" />
                  {language === "ar" ? "حجوزاتي" : "My Bookings"}
                </div>
              </Link>
            )}

            {isAuthenticated && (
              <Link href="/experts">
                <div
                  className="text-gray-700 hover:text-teal-600 py-2 cursor-pointer font-medium flex items-center gap-1"
                  onClick={() => setIsOpen(false)}
                >
                  <Stethoscope className="w-4 h-4" />
                  {language === "ar" ? "خبراء الصحة" : "Experts"}
                </div>
              </Link>
            )}
            {user?.role === "expert" && (
              <Link href="/expert-inbox">
                <div
                  className="text-gray-700 hover:text-teal-600 py-2 cursor-pointer font-medium flex items-center gap-1"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle className="w-4 h-4" />
                  {language === "ar" ? "صندوق الوارد" : "Expert Inbox"}
                </div>
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin">
                <div
                  className="text-gray-700 hover:text-emerald-600 py-2 cursor-pointer font-medium flex items-center gap-1"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t.nav_admin}
                </div>
              </Link>
            )}
            {/* Install App — mobile menu */}
            {canInstall && (
              <button
                onClick={() => { handleNavInstall(); setIsOpen(false); }}
                className="flex items-center gap-2 py-2 text-emerald-700 font-medium w-full"
              >
                {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {language === "ar" ? "تثبيت التطبيق" : "Install App"}
              </button>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-100">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  className="flex-1 text-red-600"
                  onClick={() => { logout(); setIsOpen(false); }}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  {t.nav_signOut}
                </Button>
              ) : (
                <>
                  <Link href="/login" className="flex-1">
                    <Button variant="ghost" className="w-full">{t.nav_signIn}</Button>
                  </Link>
                  <Link href="/login" className="flex-1">
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600">{t.nav_getStarted}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>

    {/* iOS install modal triggered from nav button */}
    {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}
