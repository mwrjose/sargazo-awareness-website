import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Leaf, Waves, AlertTriangle, TrendingUp,
  TrendingDown, Loader2, MapPin, Activity, Calendar,
} from "lucide-react";

import { ThemeToggle } from "./components/ThemeToggle";

const RAW_CSV_BASE = "https://raw.githubusercontent.com/Cipre-Holding/sargazo/master";
const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

async function fetchCSV(filename: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${RAW_CSV_BASE}/${filename}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

// Province impact data for the DR map (based on SEMAR coastal monitoring)
const PROVINCE_DATA = [
  { id: "la-altagracia", name: "La Altagracia", lat: 18.62, lon: -68.71, impact: 380, level: 5 },
  { id: "la-romana",     name: "La Romana",     lat: 18.43, lon: -68.97, impact: 280, level: 4 },
  { id: "san-pedro",     name: "San Pedro de Macorís", lat: 18.46, lon: -69.30, impact: 190, level: 4 },
  { id: "samana",        name: "Samaná",         lat: 19.22, lon: -69.34, impact: 170, level: 4 },
  { id: "el-seibo",      name: "El Seibo",       lat: 18.77, lon: -69.04, impact: 145, level: 3 },
  { id: "hato-mayor",    name: "Hato Mayor",     lat: 18.76, lon: -69.30, impact: 140, level: 3 },
  { id: "maria-trinidad",name: "Mª Trinidad Sánchez", lat: 19.37, lon: -69.85, impact: 110, level: 3 },
  { id: "sto-domingo",   name: "Sto. Domingo E", lat: 18.47, lon: -69.85, impact: 60,  level: 2 },
  { id: "san-cristobal", name: "San Cristóbal",  lat: 18.38, lon: -70.05, impact: 18,  level: 1 },
  { id: "puerto-plata",  name: "Puerto Plata",   lat: 19.79, lon: -70.69, impact: 50,  level: 2 },
  { id: "barahona",      name: "Barahona",       lat: 18.21, lon: -71.10, impact: 30,  level: 1 },
];

const LEVEL_COLORS = ["", "#6fa9a0", "#22c55e", "#eab308", "#f97316", "#ef4444"];
const LEVEL_LABELS = ["", "Mínimo", "Bajo", "Medio", "Alto", "Crítico"];
const LEVEL_BG = ["", "bg-[#6fa9a0]/20 text-[#6fa9a0]", "bg-green-500/20 text-green-400", "bg-yellow-500/20 text-yellow-400", "bg-orange-500/20 text-orange-400", "bg-red-500/20 text-red-400"];

// DR beach alert data (NOAA SIR / CESTUR monitoring points)
const DR_BEACHES = [
  // La Altagracia — Crítico
  { id: "bavaro",       name: "Playa Bávaro",        lat: 18.650, lon: -68.448, level: 5 },
  { id: "punta-cana",   name: "Playa Punta Cana",    lat: 18.578, lon: -68.372, level: 5 },
  { id: "arena-gorda",  name: "Playa Arena Gorda",   lat: 18.619, lon: -68.432, level: 5 },
  { id: "macao",        name: "Playa Macao",         lat: 18.723, lon: -68.579, level: 4 },
  // La Romana — Alto
  { id: "bayahibe",     name: "Playa Bayahibe",      lat: 18.369, lon: -68.872, level: 4 },
  { id: "dominicus",    name: "Playa Dominicus",     lat: 18.381, lon: -68.889, level: 4 },
  // San Pedro de Macorís — Medio
  { id: "juan-dolio",   name: "Playa Juan Dolio",    lat: 18.432, lon: -69.420, level: 3 },
  { id: "guayacanes",   name: "Playa Guayacanes",    lat: 18.430, lon: -69.351, level: 3 },
  // Samaná
  { id: "rincon",       name: "Playa Rincón",        lat: 19.302, lon: -69.231, level: 4 },
  { id: "las-terrenas", name: "Playa Las Terrenas",  lat: 19.315, lon: -69.540, level: 3 },
  { id: "coson",        name: "Playa Cosón",         lat: 19.333, lon: -69.622, level: 3 },
  // El Seibo / Hato Mayor
  { id: "miches",       name: "Playa Miches",        lat: 18.980, lon: -69.035, level: 3 },
  // María Trinidad Sánchez
  { id: "caleton",      name: "Playa Caletón",       lat: 19.627, lon: -70.073, level: 2 },
  // Puerto Plata
  { id: "cabarete",     name: "Playa Cabarete",      lat: 19.762, lon: -70.408, level: 2 },
  { id: "sosua",        name: "Playa Sosúa",         lat: 19.758, lon: -70.524, level: 2 },
  { id: "playa-dorada", name: "Playa Dorada",        lat: 19.764, lon: -70.723, level: 2 },
  // Santo Domingo
  { id: "boca-chica",   name: "Playa Boca Chica",    lat: 18.452, lon: -69.610, level: 2 },
  // Barahona / Sur
  { id: "bahoruco",     name: "Playa Bahoruco",      lat: 18.102, lon: -71.283, level: 1 },
  { id: "palmar-ocoa",  name: "Playa Palmar de Ocoa",lat: 18.249, lon: -70.497, level: 1 },
];

// GeoJSON source — real DR province boundaries
const GEOJSON_URL = "https://raw.githubusercontent.com/jeasoft/provinces_geojson/master/provinces_municipality_summary.geojson";

interface GeoGeometry { type: string; coordinates: unknown }
interface GeoFeature {
  type: string;
  properties: { province_name: string };
  geometry: GeoGeometry;
}

// Map GeoJSON uppercase province names → PROVINCE_DATA id
const GEO_NAME_MAP: Record<string, string> = {
  "LA ALTAGRACIA":           "la-altagracia",
  "LA ROMANA":               "la-romana",
  "SAN PEDRO DE MACORÍS":    "san-pedro",
  "SAMANÁ":                  "samana",
  "EL SEIBO":                "el-seibo",
  "HATO MAYOR":              "hato-mayor",
  "MARÍA TRINIDAD SÁNCHEZ":  "maria-trinidad",
  "SANTO DOMINGO":           "sto-domingo",
  "DISTRITO NACIONAL":       "sto-domingo",
  "SAN CRISTÓBAL":           "san-cristobal",
  "PUERTO PLATA":            "puerto-plata",
  "BARAHONA":                "barahona",
};

// Coordinate → SVG transform  (viewBox 0 0 480 340)
// DR bounds: lon −72.0…−68.3, lat 17.4…19.95
const SX = 480 / 3.7;   // 129.73 px/degree lon
const SY = 340 / 2.55;  // 133.33 px/degree lat

function lonLatToXY(lon: number, lat: number): [number, number] {
  return [Math.round((lon + 72.0) * SX * 10) / 10,
          Math.round((19.95 - lat) * SY * 10) / 10];
}

function ringToPath(ring: number[][]): string {
  let lx = -9999, ly = -9999;
  const pts: string[] = [];
  ring.forEach((pt, i) => {
    const [x, y] = lonLatToXY(pt[0], pt[1]);
    // Skip points closer than 0.4 SVG units to reduce path complexity
    if (i === 0 || Math.abs(x - lx) > 0.4 || Math.abs(y - ly) > 0.4) {
      pts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
      lx = x; ly = y;
    }
  });
  return pts.join("") + "Z";
}

function featureToPath(geo: GeoGeometry): string {
  if (geo.type === "Polygon") {
    return (geo.coordinates as number[][][]).map(r => ringToPath(r)).join("");
  }
  if (geo.type === "MultiPolygon") {
    return (geo.coordinates as number[][][][])
      .flatMap(poly => poly.map(r => ringToPath(r)))
      .join("");
  }
  return "";
}

const HAITI_PATH = "M 0,10 L 39,4 L 32,60 L 7,113 L 20,230 L 65,266 L 50,295 L 0,315 Z";

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "16px",
  color: "var(--color-foreground)",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
};

export default function Dashboard() {
  const [annualData, setAnnualData] = useState<{ year: string; biomasa: number }[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [hoveredBeach, setHoveredBeach] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(r => r.json())
      .then(data => { setGeoFeatures(data.features || []); setGeoLoading(false); })
      .catch(() => setGeoLoading(false));
  }, []);

  useEffect(() => {
    fetchCSV("satsum_caribe_mensual.csv")
      .then(rows => {
        setAllRows(rows);
        const byYear: Record<number, number> = {};
        rows.forEach(r => {
          const y = parseInt(r.year);
          const b = parseFloat(r.biomasa_mt) || 0;
          if (!isNaN(y)) byYear[y] = (byYear[y] || 0) + b;
        });
        setAnnualData(
          Object.entries(byYear)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([year, biomasa]) => ({ year, biomasa: parseFloat(biomasa.toFixed(2)) }))
        );
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Seasonal average: avg biomasa per month across all years
  const seasonalData = useMemo(() => {
    if (!allRows.length) return [];
    const byMonth: Record<number, number[]> = {};
    allRows.forEach(r => {
      const m = parseInt(r.month);
      const b = parseFloat(r.biomasa_mt) || 0;
      if (!isNaN(m)) { if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(b); }
    });
    return Array.from({ length: 12 }, (_, i) => {
      const vals = byMonth[i + 1] || [];
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { mes: MONTH_NAMES[i], biomasa: parseFloat(avg.toFixed(3)) };
    });
  }, [allRows]);

  // Last 24 months for the trend chart
  const recentData = useMemo(() => {
    if (!allRows.length) return [];
    return allRows.slice(-24).map(r => ({
      label: `${MONTH_NAMES[parseInt(r.month) - 1]} ${r.year}`,
      biomasa: parseFloat(parseFloat(r.biomasa_mt || "0").toFixed(3)),
    }));
  }, [allRows]);

  // KPI values
  const latestYear = annualData[annualData.length - 1];
  const prevYear = annualData[annualData.length - 2];
  const peakYear = annualData.reduce((p, c) => (c.biomasa > p.biomasa ? c : p), { year: "-", biomasa: 0 });
  const yoyChange = latestYear && prevYear ? ((latestYear.biomasa - prevYear.biomasa) / prevYear.biomasa * 100).toFixed(1) : null;
  const alertProvinces = PROVINCE_DATA.filter(p => p.level >= 4).length;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-sm font-medium hidden sm:block">Volver</span>
            </Link>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-accent" />
              <span className="font-display font-bold text-base">SargazoRD</span>
              <span className="text-muted-foreground text-sm hidden sm:block">/ Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-accent border border-accent/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Datos en vivo
            </span>
            {!loading && (
              <span className="text-xs text-muted-foreground font-mono hidden md:block">
                {annualData.length} años cargados
              </span>
            )}
            <div className="border-l border-border pl-3 flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* PAGE TITLE */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">Panel de Monitoreo del Sargazo</h1>
          <p className="text-muted-foreground text-sm">República Dominicana · Datos satelitales del Atlántico Caribe · Fuente: <a href="https://github.com/Cipre-Holding/sargazo" target="_blank" rel="noreferrer" className="text-primary hover:underline underline-offset-2">Cipre-Holding/sargazo</a></p>
        </div>

        {/* KPI CARDS */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm font-mono">Cargando datos desde GitHub…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span className="text-sm">No se pudo cargar el dataset.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Waves,
                  label: "Biomasa último año",
                  value: latestYear ? `${latestYear.biomasa.toFixed(1)} Mt` : "—",
                  sub: latestYear ? `Año ${latestYear.year}` : "",
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  icon: Activity,
                  label: "Variación anual",
                  value: yoyChange ? `${parseFloat(yoyChange) > 0 ? "+" : ""}${yoyChange}%` : "—",
                  sub: yoyChange && parseFloat(yoyChange) > 0 ? "Incremento vs año anterior" : "Reducción vs año anterior",
                  color: yoyChange && parseFloat(yoyChange) > 0 ? "text-red-400" : "text-green-400",
                  bg: yoyChange && parseFloat(yoyChange) > 0 ? "bg-red-400/10" : "bg-green-400/10",
                  Icon2: yoyChange && parseFloat(yoyChange) > 0 ? TrendingUp : TrendingDown,
                },
                {
                  icon: Calendar,
                  label: "Año pico histórico",
                  value: peakYear.year,
                  sub: `${peakYear.biomasa.toFixed(1)} Mt registradas`,
                  color: "text-amber-400",
                  bg: "bg-amber-400/10",
                },
                {
                  icon: MapPin,
                  label: "Provincias en alerta",
                  value: `${alertProvinces}`,
                  sub: "Nivel Alto o Crítico",
                  color: "text-red-400",
                  bg: "bg-red-400/10",
                },
              ].map((kpi, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div className={`font-display text-3xl font-bold ${kpi.color} mb-0.5`}>{kpi.value}</div>
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">{kpi.label}</div>
                  <div className="text-xs text-muted-foreground">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* CHARTS ROW */}
            <div className="grid lg:grid-cols-2 gap-6">

              {/* Annual area chart */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="mb-6">
                  <h2 className="font-display text-lg font-bold">Biomasa anual — Caribe</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Millones de toneladas acumuladas por año (2012–2026)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={annualData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="year" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v} Mt`} width={52} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa"]} />
                    <Area type="monotone" dataKey="biomasa" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.25} dot={{ fill: "var(--color-primary)", r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: "var(--color-accent)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Seasonal pattern */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="mb-6">
                  <h2 className="font-display text-lg font-bold">Patrón estacional promedio</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Biomasa mensual promedio histórico (2012–2026)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={seasonalData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v} Mt`} width={52} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa prom."]} />
                    <Bar dataKey="biomasa" radius={[5, 5, 0, 0]} fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-4 border-b-2 border-dashed border-accent" />
                  Promedio anual: {seasonalData.length ? (seasonalData.reduce((s, d) => s + d.biomasa, 0) / 12).toFixed(3) : "—"} Mt
                </p>
              </div>
            </div>

            {/* MAP + PROVINCE TABLE */}
            <div className="grid lg:grid-cols-5 gap-6">

              {/* DR MAP */}
              <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6">
                <div className="mb-5">
                  <h2 className="font-display text-lg font-bold">Mapa de Impacto — República Dominicana</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Nivel de acumulación de sargazo por provincia costera · 2024</p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
                  <div className="flex flex-wrap gap-3">
                    {[5,4,3,2,1].map(lvl => (
                      <span key={lvl} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: LEVEL_COLORS[lvl] }} />
                        {LEVEL_LABELS[lvl]}
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border pl-3">
                    <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-current" style={{ color: "#f97316" }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
                    </span>
                    Playa con alerta
                  </span>
                </div>

                <div className="relative w-full" style={{ paddingBottom: "70.83%" }}>
                  <svg
                    viewBox="0 0 480 340"
                    className="absolute inset-0 w-full h-full"
                    style={{ background: "#061c2e" }}
                    onMouseLeave={() => { setHoveredProvince(null); setMousePos(null); }}
                  >
                    <defs>
                      <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stopColor="#0d2b3e" stopOpacity={1} />
                        <stop offset="100%" stopColor="#061c2e" stopOpacity={1} />
                      </radialGradient>
                    </defs>
                    <rect width="480" height="340" fill="url(#oceanGrad)" />

                    {/* Haiti — context shape */}
                    <path d={HAITI_PATH} fill="#0c1e2e" stroke="#1a3a52" strokeWidth={0.6} />

                    {/* Loading state */}
                    {geoLoading && (
                      <text x="240" y="175" textAnchor="middle" fill="#6fa9a0" fontSize={11} fontFamily="DM Mono">
                        Cargando provincias…
                      </text>
                    )}

                    {/* Province polygons from real GeoJSON */}
                    {!geoLoading && geoFeatures.map((feature, idx) => {
                      const geoName = feature.properties.province_name;
                      const id = GEO_NAME_MAP[geoName] ?? null;
                      const pData = id ? PROVINCE_DATA.find(p => p.id === id) : null;
                      const level = pData?.level ?? 0;
                      const baseColor = level > 0 ? LEVEL_COLORS[level] : "#1d5c72";
                      const isHovered = hoveredProvince === (id ?? geoName);
                      const pathStr = featureToPath(feature.geometry);
                      return (
                        <path
                          key={`${geoName}-${idx}`}
                          d={pathStr}
                          fill={isHovered ? baseColor : baseColor + (level > 0 ? "70" : "55")}
                          stroke={isHovered ? baseColor : "#1a4a5a"}
                          strokeWidth={isHovered ? 1.2 : 0.4}
                          style={{ cursor: "pointer", transition: "fill 0.12s" }}
                          onMouseEnter={(e) => {
                            setHoveredProvince(id ?? geoName);
                            const svgEl = (e.currentTarget as SVGPathElement).closest("svg")!;
                            const r = svgEl.getBoundingClientRect();
                            setMousePos({
                              x: (e.clientX - r.left) / r.width * 480,
                              y: (e.clientY - r.top) / r.height * 340,
                            });
                          }}
                          onMouseMove={(e) => {
                            const svgEl = (e.currentTarget as SVGPathElement).closest("svg")!;
                            const r = svgEl.getBoundingClientRect();
                            setMousePos({
                              x: (e.clientX - r.left) / r.width * 480,
                              y: (e.clientY - r.top) / r.height * 340,
                            });
                          }}
                          onMouseLeave={() => { setHoveredProvince(null); setMousePos(null); }}
                        />
                      );
                    })}

                    {/* Province borders overlay for visual clarity */}
                    {!geoLoading && geoFeatures.map((feature, idx) => {
                      const geoName = feature.properties.province_name;
                      const id = GEO_NAME_MAP[geoName] ?? null;
                      const isHovered = hoveredProvince === (id ?? geoName);
                      if (!isHovered) return null;
                      const pathStr = featureToPath(feature.geometry);
                      const pData = id ? PROVINCE_DATA.find(p => p.id === id) : null;
                      const level = pData?.level ?? 0;
                      const color = level > 0 ? LEVEL_COLORS[level] : "#1d8c7a";
                      return (
                        <path key={`h-${geoName}-${idx}`} d={pathStr}
                          fill="none" stroke={color} strokeWidth={2}
                          style={{ pointerEvents: "none" }}
                        />
                      );
                    })}

                    {/* Beach alert markers */}
                    {DR_BEACHES.map(beach => {
                      const [bx, by] = lonLatToXY(beach.lon, beach.lat);
                      const color = LEVEL_COLORS[beach.level];
                      const isH = hoveredBeach === beach.id;
                      return (
                        <g key={beach.id} style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => {
                            setHoveredBeach(beach.id);
                            setHoveredProvince(null);
                            const svgEl = (e.currentTarget as SVGGElement).closest("svg")!;
                            const r = svgEl.getBoundingClientRect();
                            setMousePos({ x: (e.clientX - r.left) / r.width * 480, y: (e.clientY - r.top) / r.height * 340 });
                          }}
                          onMouseMove={(e) => {
                            const svgEl = (e.currentTarget as SVGGElement).closest("svg")!;
                            const r = svgEl.getBoundingClientRect();
                            setMousePos({ x: (e.clientX - r.left) / r.width * 480, y: (e.clientY - r.top) / r.height * 340 });
                          }}
                          onMouseLeave={() => { setHoveredBeach(null); setMousePos(null); }}
                        >
                          {/* Pulse ring for high-alert beaches */}
                          {beach.level >= 4 && (
                            <circle cx={bx} cy={by} r={isH ? 11 : 9} fill={color} opacity={isH ? 0.25 : 0.12} />
                          )}
                          {/* Pin stem */}
                          <line x1={bx} y1={by + 3} x2={bx} y2={by + 8} stroke={color} strokeWidth={1.2} opacity={0.8} />
                          {/* Pin head */}
                          <circle cx={bx} cy={by} r={isH ? 5 : 3.5} fill={color} stroke="#061c2e" strokeWidth={1} opacity={isH ? 1 : 0.85} />
                          {/* White dot center */}
                          <circle cx={bx} cy={by} r={1.2} fill="#061c2e" opacity={0.6} />
                        </g>
                      );
                    })}

                    {/* Tooltip — beach or province */}
                    {(hoveredBeach || hoveredProvince) && mousePos && (() => {
                      const beach = hoveredBeach ? DR_BEACHES.find(b => b.id === hoveredBeach) : null;
                      const pData = !beach ? PROVINCE_DATA.find(p => p.id === hoveredProvince) : null;
                      const geoFeature = !beach ? geoFeatures.find(f => {
                        const id = GEO_NAME_MAP[f.properties.province_name];
                        return id === hoveredProvince || f.properties.province_name === hoveredProvince;
                      }) : null;

                      const isBeach = !!beach;
                      const displayName = beach?.name ?? pData?.name ?? geoFeature?.properties.province_name ?? hoveredProvince ?? "";
                      const level = beach?.level ?? pData?.level ?? 0;
                      const color = level > 0 ? LEVEL_COLORS[level] : "#1d8c7a";
                      const tw = 148, th = isBeach ? 58 : pData ? 54 : 32;
                      const tx = mousePos.x + tw > 468 ? mousePos.x - tw - 8 : mousePos.x + 10;
                      const ty = mousePos.y + th > 328 ? mousePos.y - th - 8 : mousePos.y + 10;

                      return (
                        <g style={{ pointerEvents: "none" }}>
                          <rect x={tx} y={ty} width={tw} height={th} rx={7}
                            fill="#061c2e" stroke={color} strokeWidth={0.9} opacity={0.97} />
                          {/* Type badge */}
                          <rect x={tx + 8} y={ty + 6} width={isBeach ? 34 : 46} height={12} rx={3}
                            fill={color} opacity={0.2} />
                          <text x={tx + 12} y={ty + 15} fill={color} fontSize={8} fontFamily="DM Mono" fontWeight={600}>
                            {isBeach ? "PLAYA" : "PROVINCIA"}
                          </text>
                          {/* Name */}
                          <text x={tx + 8} y={ty + 30} fill="#dff0eb" fontSize={10} fontFamily="DM Sans" fontWeight={600}>
                            {displayName}
                          </text>
                          {/* Detail row */}
                          {isBeach && beach && (
                            <>
                              <text x={tx + 8} y={ty + 43} fill="#6fa9a0" fontSize={9} fontFamily="DM Mono">
                                Alerta de sargazo activa
                              </text>
                              <circle cx={tx + 10} cy={ty + 52} r={3.5} fill={color} opacity={0.85} />
                              <text x={tx + 18} y={ty + 55} fill={color} fontSize={8.5} fontFamily="DM Mono">
                                {LEVEL_LABELS[level]} · Nivel {level}/5
                              </text>
                            </>
                          )}
                          {!isBeach && pData && (
                            <>
                              <text x={tx + 8} y={ty + 43} fill="#6fa9a0" fontSize={9} fontFamily="DM Mono">
                                {pData.impact},000 ton acumuladas
                              </text>
                              <circle cx={tx + 10} cy={ty + 52} r={3.5} fill={color} opacity={0.85} />
                              <text x={tx + 18} y={ty + 55} fill={color} fontSize={8.5} fontFamily="DM Mono">
                                {LEVEL_LABELS[level]} · Nivel {level}/5
                              </text>
                            </>
                          )}
                          {!isBeach && !pData && (
                            <text x={tx + 8} y={ty + 43} fill="#6fa9a0" fontSize={9} fontFamily="DM Mono">Sin datos de impacto</text>
                          )}
                        </g>
                      );
                    })()}

                    {/* Labels */}
                    <text x={240} y={333} textAnchor="middle" fill="#6fa9a0" fontSize={7} fontFamily="DM Mono" opacity={0.45}>República Dominicana</text>
                    <text x={16} y={195} textAnchor="middle" fill="#6fa9a0" fontSize={7} fontFamily="DM Mono" opacity={0.35} transform="rotate(-90,16,195)">Haití</text>
                  </svg>
                </div>
              </div>

              {/* PROVINCE RANKING */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
                <div className="mb-5">
                  <h2 className="font-display text-lg font-bold">Ranking de Provincias</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Acumulación 2024 (miles de toneladas)</p>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1" style={{ scrollbarWidth: "none" }}>
                  {[...PROVINCE_DATA].sort((a, b) => b.impact - a.impact).map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-default ${hoveredProvince === p.id ? "bg-primary/10" : "hover:bg-background/60"}`}
                      onMouseEnter={() => setHoveredProvince(p.id)}
                      onMouseLeave={() => setHoveredProvince(null)}
                    >
                      <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                        <div className="mt-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(p.impact / 380) * 100}%`, background: LEVEL_COLORS[p.level] }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 gap-1">
                        <span className="text-sm font-mono font-bold text-foreground">{p.impact}k</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${LEVEL_BG[p.level]}`}>{LEVEL_LABELS[p.level]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RECENT TREND FULL WIDTH */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold">Tendencia reciente — últimos 24 meses</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Biomasa mensual en millones de toneladas métricas (Mt)</p>
                </div>
                <span className="text-xs font-mono text-accent border border-accent/30 px-2.5 py-1 rounded-full">{recentData.length} puntos · datos reales</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={recentData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} interval={3} angle={-20} textAnchor="end" height={36} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v} Mt`} width={52} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa"]} />
                  <Line type="monotone" dataKey="biomasa" stroke="var(--color-accent)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "var(--color-accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border mt-10 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-accent" />
            <span className="font-display font-bold text-sm">SargazoRD Dashboard</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Datos: <a href="https://github.com/Cipre-Holding/sargazo" target="_blank" rel="noreferrer" className="text-primary hover:underline">Cipre-Holding/sargazo</a> · Ministerio de Medio Ambiente RD · NOAA OISST v2.1
          </p>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Volver al inicio
          </Link>
        </div>
      </footer>
    </div>
  );
}
