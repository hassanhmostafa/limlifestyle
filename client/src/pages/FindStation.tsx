import { useState, useEffect } from "react";
import { MapPin, Clock, Phone, Star, Search, Loader2, ClipboardList } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import KioskMap from "@/components/KioskMap";
import { Kiosk, calculateDistance } from "@/lib/kiosks";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FindStation() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  // Simulate user location (Jeddah center) — replace with navigator.geolocation for real use
  const userLocation = { lat: 21.5433, lng: 39.1726 };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch from API — switches between list and search automatically
  const { data: rawKiosks, isLoading, error } = trpc.kiosks.search.useQuery(
    { query: debouncedQuery },
    { staleTime: 30_000 }
  );

  // Attach computed distance to each kiosk
  const kiosks: Kiosk[] = (rawKiosks ?? []).map((k) => ({
    ...k,
    distance: calculateDistance(
      userLocation.lat,
      userLocation.lng,
      parseFloat(k.latitude),
      parseFloat(k.longitude)
    ),
  }));

  // Auto-select first kiosk when data loads
  useEffect(() => {
    if (kiosks.length > 0 && !selectedKiosk) {
      setSelectedKiosk(kiosks[0]);
    }
  }, [kiosks.length]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Header */}
        <section className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-12">
          <div className="container flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t.findStation_title}</h1>
              <p className="text-cyan-50">{t.findStation_subtitle}</p>
            </div>

          </div>
        </section>

        {/* Search Bar */}
        <section className="bg-white border-b border-gray-200 py-6 sticky top-16 z-40">
          <div className="container">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder={t.findStation_searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="bg-cyan-500 hover:bg-cyan-600">{t.home_searchBtn}</Button>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Map */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden border-0 shadow-lg h-[600px]">
                  <KioskMap kiosks={kiosks} selectedKiosk={selectedKiosk} language={language} />
                </Card>
              </div>

              {/* Station List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {isLoading && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                  </div>
                )}

                {error && (
                  <Card className="p-8 text-center">
                    <p className="text-red-500">Failed to load stations. Please try again.</p>
                  </Card>
                )}

                {!isLoading && !error && kiosks.length === 0 && (
                  <Card className="p-8 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">{t.findStation_noResults}</p>
                  </Card>
                )}

                {!isLoading &&
                  kiosks.map((kiosk) => (
                    <Card
                      key={kiosk.id}
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        selectedKiosk?.id === kiosk.id
                          ? "border-cyan-500 bg-cyan-50 shadow-lg"
                          : "border-transparent hover:shadow-md"
                      }`}
                      onClick={() => setSelectedKiosk(kiosk)}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{kiosk.name}</h3>
                          <p className="text-sm text-gray-600">{kiosk.location}</p>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-cyan-600">
                            <MapPin className="w-4 h-4" />
                            <span>{kiosk.distance?.toFixed(1)} km away</span>
                          </div>
                          {kiosk.rating && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-gray-700">{kiosk.rating}</span>
                            </div>
                          )}
                        </div>

                        {kiosk.hours && kiosk.hours.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              {kiosk.hours[0].open} - {kiosk.hours[0].close}
                            </span>
                          </div>
                        )}

                        <Link href={`/station/${kiosk.id}`}>
                          <Button size="sm" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                            {t.findStation_viewDetails}
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Easy to Find</h3>
                <p className="text-gray-600">Located in convenient shopping centers and pharmacies</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Extended Hours</h3>
                <p className="text-gray-600">Open from early morning to late evening, 7 days a week</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Get Support</h3>
                <p className="text-gray-600">Contact us for more information about any station</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
