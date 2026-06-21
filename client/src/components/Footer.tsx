import { Heart, MapPin, Phone, Mail, Facebook, Twitter, Instagram } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">Tech Care</span>
            </div>
            <p className="text-sm text-gray-400">
              {t.footer_tagline}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.footer_quickLinks}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/find-station">
                  <span className="text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer">
                    {t.nav_findStation}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer">
                    {isAr ? "من نحن" : "About Us"}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/services">
                  <span className="text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer">
                    {isAr ? "الخدمات" : "Services"}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer">
                    {isAr ? "تواصل معنا" : "Contact"}
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.footer_contact}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-cyan-400 flex-shrink-0" />
                <span className="text-gray-400">+966 12 000 0000</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-cyan-400 flex-shrink-0" />
                <span className="text-gray-400">info@techcare.sa</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-cyan-400 flex-shrink-0" />
                <span className="text-gray-400">{isAr ? "جدة، المملكة العربية السعودية" : "Jeddah, Saudi Arabia"}</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-white mb-4">{isAr ? "تابعنا" : "Follow Us"}</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-600 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-600 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-600 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; 2026 Tech Care. {t.footer_rights}</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-cyan-400 transition-colors">
                {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
              </a>
              <a href="#" className="hover:text-cyan-400 transition-colors">
                {isAr ? "شروط الخدمة" : "Terms of Service"}
              </a>
              <a href="#" className="hover:text-cyan-400 transition-colors">
                {isAr ? "سياسة ملفات تعريف الارتباط" : "Cookie Policy"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
