import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown, ArrowRight, BarChart2, Waves, Leaf,
  AlertTriangle, Fish, Globe, ExternalLink, Menu, X, Loader2,
  Zap, Thermometer, FlaskConical, Turtle, Wind, Sprout,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";

const RAW_CSV_BASE = "";
const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

interface AnnualPoint { year: string; biomasa: number }
interface MonthlyPoint { label: string; biomasa: number; year: number; month: number }

async function fetchCSV(filename: string): Promise<Record<string, string>[]> {
  const res = await fetch(`/${filename}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

const curiosidades = [
  { icon: Turtle, color: "text-emerald-400", bg: "bg-emerald-400/10", titulo: "Hogar de tortugas marinas", dato: "Las crías de tortuga laúd y carey usan las balsas de sargazo como guardería natural durante sus primeros años de vida, escondiéndose de depredadores entre sus ramas.", numero: "01" },
  { icon: Thermometer, color: "text-amber-400", bg: "bg-amber-400/10", titulo: "Termómetro del océano", dato: "Las explosiones masivas de sargazo están directamente vinculadas a anomalías de temperatura superficial del mar. Un aumento de solo 0.5 °C puede duplicar su tasa de reproducción.", numero: "02" },
  { icon: FlaskConical, color: "text-violet-400", bg: "bg-violet-400/10", titulo: "Fuente de compuestos únicos", dato: "El sargazo produce más de 50 metabolitos secundarios con propiedades antivirales, antitumorales y antibacterianas que la industria farmacéutica está investigando activamente.", numero: "03" },
  { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", titulo: "Biogás y energía", dato: "Una tonelada de sargazo seco puede producir hasta 300 m³ de biogás mediante digestión anaerobia, suficiente para abastecer de energía a un hogar durante 3 semanas.", numero: "04" },
  { icon: Wind, color: "text-sky-400", bg: "bg-sky-400/10", titulo: "Sensor de corrientes", dato: "Los científicos usan imágenes satelitales del sargazo como trazador natural para mapear corrientes oceánicas superficiales con una precisión que los instrumentos convencionales no alcanzan.", numero: "05" },
  { icon: Sprout, color: "text-lime-400", bg: "bg-lime-400/10", titulo: "Fertilizante del futuro", dato: "El sargazo compostado mejora la retención de agua en suelos tropicales hasta un 40% y aporta nitrógeno, potasio y fósforo, rivalizando con fertilizantes sintéticos en ensayos agrícolas.", numero: "06" },
  { icon: Fish, color: "text-teal-400", bg: "bg-teal-400/10", titulo: "El mayor ecosistema flotante", dato: "El Gran Cinturón de Sargazo del Atlántico puede extenderse más de 8,000 km de largo, siendo el ecosistema marino flotante más grande del planeta, visible desde el espacio.", numero: "07" },
  { icon: Waves, color: "text-blue-400", bg: "bg-blue-400/10", titulo: "Bomba de carbono", dato: "Cuando el sargazo se hunde al fondo oceánico sin descomponerse en la superficie, actúa como secuestrador de carbono, transportando CO₂ atmosférico a las profundidades marinas.", numero: "08" },
];

const faqItems = [
  { q: "¿Por qué llega tanto sargazo a la República Dominicana?", a: "La corriente del Atlántico Norte y el aumento de nutrientes en el océano —producto de la deforestación en el Amazonas y el escurrimiento agrícola— han creado el Gran Cinturón de Sargazo del Atlántico (GASB). Este genera masas flotantes de millones de toneladas que las corrientes caribeñas arrastran hacia las costas dominicanas entre marzo y octubre." },
  { q: "¿Es peligroso el sargazo para la salud?", a: "Al descomponerse, el sargazo libera sulfuro de hidrógeno (H₂S) y amoníaco, gases que irritan las vías respiratorias y pueden causar dolor de cabeza, náuseas y problemas oculares. Las personas con asma u otras condiciones respiratorias son las más vulnerables a exposiciones prolongadas en zonas de alta acumulación." },
  { q: "¿Qué impacto económico tiene sobre el turismo?", a: "Se estima que las provincias más afectadas han perdido entre 15% y 35% de su ocupación hotelera durante los picos de sargazo. El costo de limpieza en playas públicas superó los RD$800 millones en 2023, según cifras del CESTUR." },
  { q: "¿Tiene algún uso o aprovechamiento posible?", a: "Sí. El sargazo se está estudiando como fertilizante orgánico, fuente de biogás, material de construcción y suplemento para ganado. Empresas locales y proyectos universitarios dominicanos exploran su aprovechamiento industrial para reducir el impacto ambiental y generar valor económico." },
  { q: "¿Qué hace el gobierno dominicano al respecto?", a: "El Ministerio de Medio Ambiente coordina el Plan Nacional de Manejo del Sargazo, con brigadas de limpieza en 14 provincias costeras, barreras flotantes experimentales y alianzas con organismos internacionales como la NOAA y la FAO para el monitoreo satelital del fenómeno." },
];

const navLinks = [
  { label: "¿Qué es?", href: "#que-es" },
  { label: "Impacto", href: "#impacto" },
  { label: "Datos", href: "#datos" },
  { label: "Galería", href: "#galeria" },
  { label: "Info", href: "#info" },
];

const galleryImages = [
  { id: "1725286982432-7177221ea6fa", alt: "Sargazo de cerca en la playa caribeña", h: "h-52" },
  { id: "1679266352183-e9026ca3ba57", alt: "Acumulación masiva de sargazo en la orilla", h: "h-52" },
  { id: "1697839374552-fbfad5f9f1cb", alt: "Sargazo flotando en el mar Caribe", h: "h-52" },
  { id: "1639387130096-7737fc425ec8", alt: "Playa dominicana con aguas cristalinas", h: "h-48" },
  { id: "1558981135-566092f8520b", alt: "Vegetación marina cerca del océano", h: "h-48" },
  { id: "1611915458524-e79e11828001", alt: "Costa del Caribe con palmeras", h: "h-48" },
];

const dashboardLinks = [
  { label: "Dashboard Principal", desc: "Mapa interactivo y alertas en tiempo real", icon: BarChart2, to: "/dashboard" },
  { label: "Reporte Mensual", desc: "Estadísticas detalladas por zona costera", icon: Globe, to: "/dashboard" },
  { label: "Alerta Temprana", desc: "Notificaciones por provincia y municipio", icon: AlertTriangle, to: "/dashboard" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"anual" | "mensual">("anual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [annualData, setAnnualData] = useState<AnnualPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll horizontal del carrete
  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Navegación de Lightbox
  const prevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? galleryImages.length - 1 : (prev as number) - 1
      );
    }
  };

  const nextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => 
        prev === galleryImages.length - 1 ? 0 : (prev as number) + 1
      );
    }
  };

  // Atajos de teclado para el Lightbox
  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImageIndex(null);
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetchCSV("satsum_caribe_mensual.csv")
      .then(rows => {
        const byYear: Record<number, number> = {};
        rows.forEach(r => {
          const y = parseInt(r.year);
          const b = parseFloat(r.biomasa_mt) || 0;
          if (!isNaN(y)) byYear[y] = (byYear[y] || 0) + b;
        });
        const annual: AnnualPoint[] = Object.entries(byYear)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .map(([year, biomasa]) => ({ year, biomasa: parseFloat(biomasa.toFixed(2)) }));
        setAnnualData(annual);
        const cutoff = Math.max(...Object.keys(byYear).map(Number)) - 3;
        const monthly: MonthlyPoint[] = rows
          .filter(r => parseInt(r.year) >= cutoff)
          .map(r => ({
            label: `${MONTH_NAMES[parseInt(r.month) - 1]} ${r.year}`,
            biomasa: parseFloat(parseFloat(r.biomasa_mt || "0").toFixed(3)),
            year: parseInt(r.year),
            month: parseInt(r.month),
          }));
        setMonthlyData(monthly);
        setLoadingData(false);
      })
      .catch(() => { setDataError(true); setLoadingData(false); });
  }, []);

  const tooltipStyle = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "16px",
    color: "var(--color-foreground)",
    fontFamily: "var(--font-sans)",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2 group">
            <Leaf className="w-5 h-5 text-accent transition-transform group-hover:rotate-12" />
            <span className="font-display font-bold text-lg tracking-tight">SargazoRD</span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
            ))}
            <div className="flex items-center gap-4 border-l border-border pl-8">
              <ThemeToggle />
              <Link to="/dashboard" className="bg-primary text-primary-foreground text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 font-medium">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button className="text-foreground p-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-background/98 backdrop-blur-md border-b border-border px-6 py-5 flex flex-col gap-4">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</a>
            ))}
            <Link to="/dashboard" className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg text-center font-medium">Dashboard</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-end pb-28">
        <div
          onClick={() => setSelectedImageIndex(0)}
          className="absolute inset-0 bg-background cursor-pointer group/hero-bg"
        >
          <img
            src="https://images.unsplash.com/photo-1725286982432-7177221ea6fa?w=1920&h=1080&fit=crop&auto=format"
            alt="Sargazo acumulado en la orilla de una playa caribeña"
            className="w-full h-full object-cover opacity-60 dark:opacity-40 dark:mix-blend-luminosity group-hover/hero-bg:scale-[1.02] group-hover/hero-bg:opacity-75 dark:group-hover/hero-bg:opacity-45 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-accent text-xs font-mono tracking-widest uppercase mb-8 border border-accent/30 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              República Dominicana · Monitoreo 2024
            </span>
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold leading-[1.05] mb-6 text-foreground">
              El Sargazo<br /><span className="text-primary italic">nos afecta</span><br />a todos
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10">
              Una crisis ambiental silenciosa que transforma nuestras costas, nuestra economía y nuestra salud. Conoce el fenómeno que define el Caribe del siglo XXI.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#que-es" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2">
                Descubrir más <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#datos" className="border border-border text-foreground px-6 py-3 rounded-lg font-medium hover:bg-card transition flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-accent" /> Ver Datos
              </a>
            </div>
          </div>
        </div>
        <a href="#que-es" className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground hover:text-foreground transition-colors" aria-label="Bajar">
          <ChevronDown className="w-6 h-6" />
        </a>
      </section>

      {/* QUÉ ES */}
      <section id="que-es" className="py-28 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">01 — Definición</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">¿Qué es el<br />Sargazo?</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>El <strong className="text-foreground">sargazo</strong> (<em>Sargassum fluitans</em> y <em>S. natans</em>) es un alga marina parda que flota libremente en la superficie del Océano Atlántico. A diferencia de otros tipos de algas, no necesita suelo ni roca para crecer: sus vesículas llenas de aire le permiten mantenerse a flote indefinidamente.</p>
              <p>Históricamente, el Mar de los Sargazos en el Atlántico Norte era su hogar natural, un ecosistema único que alberga tortugas, cangrejos y cientos de especies de peces. Sin embargo, desde <strong className="text-foreground">2011</strong>, el fenómeno se transformó radicalmente.</p>
              <p>El aumento de temperaturas oceánicas y la mayor concentración de nutrientes —provocados por la deforestación amazónica y el uso intensivo de fertilizantes en Brasil y África Occidental— desencadenaron un crecimiento explosivo. Hoy, el <strong className="text-foreground">Gran Cinturón de Sargazo del Atlántico (GASB)</strong> puede superar en masa a todos los bosques tropicales del planeta.</p>
            </div>
          </div>
          <div className="relative">
            <div
              onClick={() => setSelectedImageIndex(1)}
              className="aspect-[4/5] rounded-2xl overflow-hidden bg-card cursor-pointer group/que-es-img"
            >
              <img
                src="https://images.unsplash.com/photo-1679266352183-e9026ca3ba57?w=800&h=1000&fit=crop&auto=format"
                alt="Acumulación de sargazo en la playa"
                className="w-full h-full object-cover group-hover/que-es-img:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-xl p-5 shadow-2xl">
              <div className="text-3xl font-display font-bold text-accent">+2,000 km</div>
              <div className="text-sm text-muted-foreground mt-1">de costa dominicana afectada</div>
            </div>
            <div className="absolute -top-6 -right-6 bg-primary text-primary-foreground rounded-xl p-4 shadow-xl hidden md:block">
              <div className="text-2xl font-display font-bold">2011</div>
              <div className="text-xs opacity-80 mt-0.5">Inicio del fenómeno masivo</div>
            </div>
          </div>
        </div>
      </section>

      {/* SPREAD */}
      <section className="py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-4 relative">
              <div
                onClick={() => setSelectedImageIndex(2)}
                className="rounded-2xl overflow-hidden bg-background h-80 md:h-[500px] cursor-pointer group/fenomeno-img"
              >
                <img
                  src="https://images.unsplash.com/photo-1697839374552-fbfad5f9f1cb?w=600&h=700&fit=crop&auto=format"
                  alt="Masa de sargazo flotando en el mar Caribe"
                  className="w-full h-full object-cover group-hover/fenomeno-img:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
            <div className="md:col-span-8 space-y-6">
              <span className="text-accent font-mono text-xs tracking-widest uppercase">02 — El Fenómeno</span>
              <blockquote className="font-display text-2xl md:text-3xl font-semibold leading-snug text-foreground border-l-4 border-primary pl-6 italic">
                "Las playas del Caribe que antes eran paraíso se convierten cada verano en paisajes cubiertos de toneladas de algas doradas que huelen a huevo podrido."
              </blockquote>
              <p className="text-muted-foreground leading-relaxed">Cada año entre marzo y octubre, la corriente Norrecuatorial transporta enormes masas de sargazo desde el Atlántico ecuatorial hacia el Mar Caribe. Al llegar a las costas dominicanas, el alga se acumula en franjas de hasta <strong className="text-foreground">tres metros de altura</strong>, bloqueando el acceso a las playas, dañando ecosistemas de arrecifes de coral y manglares, y afectando gravemente la actividad turística y pesquera.</p>
              <p className="text-muted-foreground leading-relaxed">La descomposición libera <strong className="text-foreground">sulfuro de hidrógeno (H₂S)</strong>, un gas tóxico con olor a azufre que puede alcanzar concentraciones peligrosas en zonas de alta acumulación.</p>
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[{ label: "Temporada alta", value: "Mar–Oct" }, { label: "Gas emitido", value: "H₂S + NH₃" }, { label: "Velocidad de avance", value: "15 km/día" }].map((s) => (
                  <div key={s.label} className="border border-border rounded-xl p-4 text-center bg-background/40 hover:border-primary/50 transition-colors">
                    <div className="font-display font-bold text-xl text-accent">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impacto" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">03 — Impacto</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold">El costo real</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Waves, value: "1.2M", unit: "toneladas", label: "Acumulación récord en 2023 en costas dominicanas", color: "text-primary", bg: "bg-primary/10" },
              { icon: AlertTriangle, value: "RD$800M", unit: "pérdidas anuales", label: "Costo estimado de limpieza y pérdidas turísticas", color: "text-amber-400", bg: "bg-amber-400/10" },
              { icon: Fish, value: "60%", unit: "reducción", label: "Caída en capturas de pesca artesanal en zonas afectadas", color: "text-red-400", bg: "bg-red-400/10" },
              { icon: Globe, value: "14", unit: "provincias", label: "Con planes activos de manejo y brigadas de limpieza", color: "text-accent", bg: "bg-accent/10" },
            ].map((stat, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all hover:-translate-y-0.5">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-5`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`font-display text-4xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">{stat.unit}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHARTS */}
      <section id="datos" className="py-28 px-6 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">04 — Datos</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-3">Tendencias del Sargazo</h2>
            <p className="text-muted-foreground max-w-xl">Datos de acumulación registrados por el Ministerio de Medio Ambiente y CESTUR entre 2018 y 2024.</p>
          </div>
          <div className="flex gap-2 mb-8">
            {(["anual", "mensual"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground shadow-lg" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}>
                {tab === "anual" ? "Biomasa Anual" : "Tendencia Mensual"}
              </button>
            ))}
          </div>
          <div className="bg-background border border-border rounded-2xl p-6 md:p-10 min-h-[420px] flex flex-col">
            {loadingData ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm font-mono">Cargando datos desde GitHub…</span>
              </div>
            ) : dataError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <span className="text-sm">No se pudo cargar el dataset. Verifica la conectividad.</span>
              </div>
            ) : activeTab === "anual" ? (
              <>
                <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold">Biomasa anual — Caribe (2012–2026)</h3>
                    <p className="text-sm text-muted-foreground mt-1">Biomasa acumulada por año en millones de toneladas. Fuente: <a href="https://github.com/Cipre-Holding/sargazo" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">Cipre-Holding/sargazo</a></p>
                  </div>
                  <span className="text-xs font-mono text-accent border border-accent/30 px-2 py-1 rounded-full">{annualData.length} años · datos reales</span>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={annualData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="year" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} Mt`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa"]} />
                    <Area type="monotone" dataKey="biomasa" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: "var(--color-primary)", r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: "var(--color-accent)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            ) : (
              <>
                <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold">Tendencia mensual — últimos 4 años</h3>
                    <p className="text-sm text-muted-foreground mt-1">Biomasa mensual en millones de toneladas. Fuente: <a href="https://github.com/Cipre-Holding/sargazo" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">Cipre-Holding/sargazo</a></p>
                  </div>
                  <span className="text-xs font-mono text-accent border border-accent/30 px-2 py-1 rounded-full">{monthlyData.length} meses · datos reales</span>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} interval={5} angle={-30} textAnchor="end" height={48} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} Mt`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa"]} />
                    <Line type="monotone" dataKey="biomasa" stroke="var(--color-accent)" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: "var(--color-accent)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="galeria" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">05 — Galería</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold">El sargazo en imágenes</h2>
          </div>
          
          <div className="relative group/gallery">
            {/* Botón Izquierdo del Carrete */}
            <button
              onClick={() => scrollCarousel("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border text-foreground p-3 rounded-full shadow-lg backdrop-blur-sm opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300 pointer-events-auto"
              aria-label="Desplazar a la izquierda"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Carrusel Horizontal (Carrete) */}
            <div
              ref={carouselRef}
              className="flex overflow-x-auto gap-6 scroll-smooth pb-6 snap-x snap-mandatory scrollbar-none"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {galleryImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className="snap-start flex-shrink-0 w-80 sm:w-96 aspect-[4/3] rounded-2xl overflow-hidden bg-card group/item cursor-pointer border border-border/50 hover:border-primary/50 shadow-md hover:shadow-xl transition-all duration-500"
                >
                  <img
                    src={`https://images.unsplash.com/photo-${img.id}?w=800&h=600&fit=crop&auto=format`}
                    alt={img.alt}
                    className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>

            {/* Botón Derecho del Carrete */}
            <button
              onClick={() => scrollCarousel("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border text-foreground p-3 rounded-full shadow-lg backdrop-blur-sm opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300 pointer-events-auto"
              aria-label="Desplazar a la derecha"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* LIGHTBOX MODAL */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all duration-300"
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Botón cerrar */}
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-sm transition-colors z-[110]"
            aria-label="Cerrar pantalla completa"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Botón Izquierda */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-sm transition-colors z-[110]"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Imagen y Pie de foto */}
          <div
            className="relative max-w-5xl max-h-[80vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`https://images.unsplash.com/photo-${galleryImages[selectedImageIndex].id}?w=1600&h=1200&fit=max&auto=format`}
              alt={galleryImages[selectedImageIndex].alt}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            
            {/* Pie de foto */}
            <div className="absolute bottom-[-60px] left-0 right-0 text-center px-4">
              <p className="text-white text-base font-medium drop-shadow-md">
                {galleryImages[selectedImageIndex].alt}
              </p>
              <p className="text-white/60 text-xs font-mono mt-1">
                {selectedImageIndex + 1} de {galleryImages.length}
              </p>
            </div>
          </div>

          {/* Botón Derecha */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-sm transition-colors z-[110]"
            aria-label="Siguiente imagen"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* CURIOSIDADES */}
      <section className="py-28 px-6 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">06 — Curiosidades</span>
            <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
              <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">Lo que quizás<br />no sabías del sargazo</h2>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">Más allá del problema ambiental, el sargazo esconde propiedades fascinantes que la ciencia apenas comienza a revelar.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {curiosidades.map((c) => (
              <div key={c.numero} className="group relative bg-background border border-border rounded-2xl p-6 hover:border-primary/40 transition-all hover:-translate-y-1 cursor-default overflow-hidden">
                <span className="absolute top-3 right-4 font-display text-6xl font-bold text-border/40 select-none leading-none">{c.numero}</span>
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-2 leading-snug pr-8">{c.titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.dato}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD CTA */}
      <section id="dashboard" className="py-28 px-6 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <img src="https://images.unsplash.com/photo-1601322211222-3fb35f4dd3fe?w=1920&h=600&fit=crop&auto=format" alt="" aria-hidden="true" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-[#0d3347]/90" />
        <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-mono text-xs tracking-widest uppercase text-primary-foreground/60 mb-4 block">07 — Dashboard</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground leading-tight mb-5">Monitoreo en<br />tiempo real del sargazo</h2>
            <p className="text-primary-foreground/70 text-lg leading-relaxed">Accede al panel de datos interactivo con mapas de distribución, alertas por provincia y proyecciones de acumulación para las próximas semanas.</p>
          </div>
          <div className="flex flex-col gap-3">
            {dashboardLinks.map((item, i) => (
              <Link key={i} to={item.to} className="flex items-center gap-4 bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20 rounded-xl p-4 group">
                <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-primary-foreground">{item.label}</div>
                  <div className="text-sm text-primary-foreground/60">{item.desc}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-primary-foreground/40 group-hover:text-primary-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="info" className="py-28 px-6 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <span className="text-accent font-mono text-xs tracking-widest uppercase mb-4 block">08 — Información Adicional</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className={`border rounded-xl overflow-hidden transition-colors ${openFaq === i ? "border-primary/50 bg-background/40" : "border-border hover:border-border/80"}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-medium text-foreground pr-4 leading-snug">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-primary" : ""}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm border-t border-border pt-4">{item.a}</div>}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-16">
            {[
              { title: "Recursos científicos", desc: "Accede a estudios y publicaciones académicas sobre el sargazo en el Caribe.", cta: "Ver publicaciones" },
              { title: "Reporte tu playa", desc: "Ayuda al monitoreo nacional reportando acumulaciones en tu comunidad costera.", cta: "Enviar reporte" },
              { title: "Voluntariado", desc: "Únete a las brigadas de limpieza y conservación de costas en tu provincia.", cta: "Participar" },
            ].map((card, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-display font-bold text-lg">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{card.desc}</p>
                <a href="#" className="text-sm text-primary font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all">{card.cta} <ArrowRight className="w-3.5 h-3.5" /></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-4 h-4 text-accent" />
              <span className="font-display font-bold text-lg">SargazoRD</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Información actualizada sobre el fenómeno del sargazo en la República Dominicana. Datos del Ministerio de Medio Ambiente y el CESTUR.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-muted-foreground">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="text-xs text-muted-foreground font-mono">© 2024 SargazoRD<br />República Dominicana</div>
        </div>
      </footer>
    </div>
  );
}
