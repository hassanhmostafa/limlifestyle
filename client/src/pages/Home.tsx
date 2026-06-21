import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Heart, MapPin, Clock, Zap, TrendingUp, Shield } from "lucide-react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden pt-20 pb-20">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "url('https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/hero-saudi-men-v2-hoJqY6wbb2nWcn7TZn8r3k.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-6">
              <div className="inline-block bg-cyan-500/20 border border-cyan-400/50 rounded-full px-4 py-2 text-sm font-medium text-cyan-300">
                {t.hero_badge}
              </div>

              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                {t.hero_title1} {t.hero_title2}
              </h1>

              <p className="text-lg text-gray-200 leading-relaxed">
                {t.hero_subtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/find-station">
                  <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white w-full sm:w-auto">
                    <MapPin className="w-4 h-4 mr-2" />
                    {t.hero_findStation}
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  {t.hero_learnMore}
                </Button>
              </div>

              <div className="flex gap-8 pt-8 text-sm">
                <div>
                  <div className="text-3xl font-bold text-cyan-400">8+</div>
                  <div className="text-gray-300">{t.hero_activeStations}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-400">50K+</div>
                  <div className="text-gray-300">{t.hero_usersScreened}</div>
                </div>
              </div>
            </div>

            {/* Metrics Visual */}
            <div className="hidden md:block">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/metrics-saudi-men-v2-ic8MSPfMaYeSjUHa7b2D8s.webp"
                alt="Saudi man in white thobe viewing health metrics at a kiosk"
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-gradient-to-b from-slate-50 to-white">
        <div className="container max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{t.home_searchTitle}</h2>
            <p className="text-gray-600">{t.home_searchSubtitle}</p>
          </div>

          <div className="flex gap-2">
            <Input placeholder={t.home_searchPlaceholder} className="flex-1" />
            <Button className="bg-cyan-500 hover:bg-cyan-600">{t.home_searchBtn}</Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.home_whyTitle}</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.home_whySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow card-hover">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.feat_locations}</h3>
              <p className="text-gray-600">{t.feat_locationsDesc}</p>
            </Card>

            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow card-hover">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.feat_hours}</h3>
              <p className="text-gray-600">{t.feat_hoursDesc}</p>
            </Card>

            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow card-hover">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.feat_screening}</h3>
              <p className="text-gray-600">{t.feat_screeningDesc}</p>
            </Card>

            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow card-hover">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.feat_tracking}</h3>
              <p className="text-gray-600">{t.feat_trackingDesc}</p>
            </Card>

            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow card-hover">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.feat_privacy}</h3>
              <p className="text-gray-600">{t.feat_privacyDesc}</p>
            </Card>

            <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow card-hover">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.feat_instant}</h3>
              <p className="text-gray-600">{t.feat_instantDesc}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.home_servicesTitle}</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.home_servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🩸", name: t.svc_bp, desc: t.svc_bpDesc },
              { icon: "⚖️", name: t.svc_weight, desc: t.svc_weightDesc },
              { icon: "❤️", name: t.svc_hr, desc: t.svc_hrDesc },
              { icon: "🌡️", name: t.svc_temp, desc: t.svc_tempDesc },
              { icon: "📊", name: t.svc_assessment, desc: t.svc_assessmentDesc },
              { icon: "⚠️", name: t.svc_risk, desc: t.svc_riskDesc },
            ].map((service, idx) => (
              <Card key={idx} className="p-6 border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                <p className="text-gray-600 text-sm">{service.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "url('https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/cta-saudi-men-v2-Qy3xfGFUMCqJaGHmMUBqxT.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/80 to-blue-900/80"></div>
        </div>
        <div className="relative z-10 container text-center text-white">
          <h2 className="text-4xl font-bold mb-6">{t.home_ctaTitle}</h2>
          <p className="text-xl mb-8 text-cyan-50 max-w-2xl mx-auto">
            {t.home_ctaSubtitle}
          </p>
          <Link href="/find-station">
            <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
              <MapPin className="w-4 h-4 mr-2" />
              {t.home_ctaBtn}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
