import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, Leaf, Waves, AlertTriangle, TrendingUp,
  TrendingDown, Loader2, MapPin, Activity, Calendar,
  Sliders, Info, RefreshCw,
} from "lucide-react";

import { useTheme } from "next-themes";
import { ThemeToggle } from "./components/ThemeToggle";
import modelData from "./model_data.json";

const RAW_CSV_BASE = "";
const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [activeTab, setActiveTab] = useState<"real" | "predictive">("real");

  // Real-time Data tab states
  const [annualData, setAnnualData] = useState<{ year: string; biomasa: number }[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [hoveredBeach, setHoveredBeach] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);

  // States for interactive cross-component chart filtering
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string | null>(null);
  const [selectedBeachFilter, setSelectedBeachFilter] = useState<string | null>(null);

  // Predictive simulator tab states
  const [selectedBeach, setSelectedBeach] = useState<string>("Punta Cana");
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [po4, setPo4] = useState<number>(modelData.feature_stats.po4.mean);
  const [uo, setUo] = useState<number>(modelData.feature_stats.uo.mean);
  const [sstAnomaly, setSstAnomaly] = useState<number>(modelData.feature_stats.sst_anomaly.mean);
  const [salinity, setSalinity] = useState<number>(modelData.feature_stats.salinity.mean);
  const [fe, setFe] = useState<number>(modelData.feature_stats.fe.mean);
  const [vo, setVo] = useState<number>(modelData.feature_stats.vo.mean);

  // Pre-calculate preset beach predictions to color pins on the simulator map
  const beachPredictions = useMemo(() => {
    const { model, playas, thresholds, feature_stats } = modelData;
    const preds: Record<string, { nfai: number; risk: { label: string; color: string; bg: string; code: string; pinColor: string } }> = {};
    
    Object.entries(playas).forEach(([name, beach]: [string, any]) => {
      if (beach) {
        const sst_scaled = (beach.sst_anomaly - feature_stats.sst_anomaly.mean) / feature_stats.sst_anomaly.std;
        const sal_scaled = (beach.salinity - feature_stats.salinity.mean) / feature_stats.salinity.std;
        const po4_scaled = (beach.po4 - feature_stats.po4.mean) / feature_stats.po4.std;
        const fe_scaled = (beach.fe - feature_stats.fe.mean) / feature_stats.fe.std;
        const uo_scaled = (beach.uo - feature_stats.uo.mean) / feature_stats.uo.std;
        const vo_scaled = (beach.vo - feature_stats.vo.mean) / feature_stats.vo.std;

        const z = model.const + 
                  model.sst_anomaly * sst_scaled + 
                  model.salinity * sal_scaled + 
                  model.po4 * po4_scaled + 
                  model.fe * fe_scaled + 
                  model.uo * uo_scaled + 
                  model.vo * vo_scaled;
        const prob = 1 / (1 + Math.exp(-z));
        let risk;
        if (prob > thresholds.p80) {
          risk = { label: "ALTO", color: "text-red-500", bg: "bg-red-500/20 text-red-400", code: "high", pinColor: "#ef4444" };
        } else if (prob > thresholds.p50) {
          risk = { label: "MODERADO", color: "text-amber-500", bg: "bg-yellow-500/20 text-yellow-400", code: "mid", pinColor: "#eab308" };
        } else {
          risk = { label: "BAJO", color: "text-emerald-500", bg: "bg-green-500/20 text-green-400", code: "low", pinColor: "#22c55e" };
        }
        preds[name] = { nfai: prob, risk };
      }
    });
    return preds;
  }, []);

  // Sync beach presets in simulator
  useEffect(() => {
    if (selectedBeach && !isManualMode) {
      const beachData = (modelData.playas as Record<string, any>)[selectedBeach];
      if (beachData) {
        setPo4(beachData.po4);
        setUo(beachData.uo);
        setSstAnomaly(beachData.sst_anomaly);
        setSalinity(beachData.salinity);
        setFe(beachData.fe);
        setVo(beachData.vo);
      }
    }
  }, [selectedBeach, isManualMode]);

  // Handle manual adjustments
  const handleSliderChange = (type: "po4" | "uo" | "sst" | "salinity" | "fe" | "vo", val: number) => {
    setIsManualMode(true);
    if (type === "po4") setPo4(val);
    else if (type === "uo") setUo(val);
    else if (type === "sst") setSstAnomaly(val);
    else if (type === "salinity") setSalinity(val);
    else if (type === "fe") setFe(val);
    else if (type === "vo") setVo(val);
  };

  // Live model calculation
  const predictedNfai = useMemo(() => {
    const { model, feature_stats } = modelData;
    const sst_scaled = (sstAnomaly - feature_stats.sst_anomaly.mean) / feature_stats.sst_anomaly.std;
    const sal_scaled = (salinity - feature_stats.salinity.mean) / feature_stats.salinity.std;
    const po4_scaled = (po4 - feature_stats.po4.mean) / feature_stats.po4.std;
    const fe_scaled = (fe - feature_stats.fe.mean) / feature_stats.fe.std;
    const uo_scaled = (uo - feature_stats.uo.mean) / feature_stats.uo.std;
    const vo_scaled = (vo - feature_stats.vo.mean) / feature_stats.vo.std;

    const z = model.const + 
              model.sst_anomaly * sst_scaled + 
              model.salinity * sal_scaled + 
              model.po4 * po4_scaled + 
              model.fe * fe_scaled + 
              model.uo * uo_scaled + 
              model.vo * vo_scaled;
    return 1 / (1 + Math.exp(-z));
  }, [po4, uo, sstAnomaly, salinity, fe, vo]);

  // Live risk level assessment
  const riskLevel = useMemo(() => {
    const { thresholds } = modelData;
    if (predictedNfai > thresholds.p80) {
      return { label: "ALTO", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", code: "high", pinColor: "#ef4444" };
    } else if (predictedNfai > thresholds.p50) {
      return { label: "MODERADO", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", code: "mid", pinColor: "#eab308" };
    } else {
      return { label: "BAJO", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", code: "low", pinColor: "#22c55e" };
    }
  }, [predictedNfai]);

  // Normalized prediction score
  const normalizedIndex = useMemo(() => {
    return Math.max(0, Math.min(100, predictedNfai * 100));
  }, [predictedNfai]);

  // Contributions list
  const contributions = useMemo(() => {
    const { model, feature_stats } = modelData;
    const sst_scaled = (sstAnomaly - feature_stats.sst_anomaly.mean) / feature_stats.sst_anomaly.std;
    const sal_scaled = (salinity - feature_stats.salinity.mean) / feature_stats.salinity.std;
    const po4_scaled = (po4 - feature_stats.po4.mean) / feature_stats.po4.std;
    const fe_scaled = (fe - feature_stats.fe.mean) / feature_stats.fe.std;
    const uo_scaled = (uo - feature_stats.uo.mean) / feature_stats.uo.std;
    const vo_scaled = (vo - feature_stats.vo.mean) / feature_stats.vo.std;

    return [
      { name: "Constante (Base)", value: model.const },
      { name: "Fosfato (PO₄)", value: model.po4 * po4_scaled },
      { name: "Salinidad", value: model.salinity * sal_scaled },
      { name: "Hierro (Fe)", value: model.fe * fe_scaled },
      { name: "Corriente Zonal (Uo)", value: model.uo * uo_scaled },
      { name: "Corriente Meridional (Vo)", value: model.vo * vo_scaled },
      { name: "Anomalía de SST", value: model.sst_anomaly * sst_scaled },
    ];
  }, [po4, uo, sstAnomaly, salinity, fe, vo]);

  // Reset to default OLS stats
  const resetToHistory = () => {
    setIsManualMode(true);
    setPo4(modelData.feature_stats.po4.mean);
    setUo(modelData.feature_stats.uo.mean);
    setSstAnomaly(modelData.feature_stats.sst_anomaly.mean);
    setSalinity(modelData.feature_stats.salinity.mean);
    setFe(modelData.feature_stats.fe.mean);
    setVo(modelData.feature_stats.vo.mean);
  };

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

  // Global scale factor calculation based on selected filters
  const activeFilterInfo = useMemo(() => {
    if (selectedProvinceFilter) {
      const prov = PROVINCE_DATA.find(p => p.id === selectedProvinceFilter);
      if (prov) {
        const totalImpact = PROVINCE_DATA.reduce((s, p) => s + p.impact, 0);
        const scale = prov.impact / totalImpact;
        return {
          scale,
          label: `Provincia: ${prov.name}`,
          type: "province",
          name: prov.name
        };
      }
    } else if (selectedBeachFilter) {
      const beach = DR_BEACHES.find(b => b.id === selectedBeachFilter);
      if (beach) {
        const scale = (beach.level / 5) * 0.03; // Beach represents a fraction of regional biomass
        return {
          scale,
          label: `Playa: ${beach.name}`,
          type: "beach",
          name: beach.name
        };
      }
    }
    return { scale: 1.0, label: "Todo el Caribe (Total)", type: "global", name: "Caribe" };
  }, [selectedProvinceFilter, selectedBeachFilter]);

  // Scaled data sets to feed Recharts dynamically
  const scaledAnnualData = useMemo(() => {
    return annualData.map(d => ({
      ...d,
      biomasa: parseFloat((d.biomasa * activeFilterInfo.scale).toFixed(2))
    }));
  }, [annualData, activeFilterInfo.scale]);

  const scaledSeasonalData = useMemo(() => {
    return seasonalData.map(d => ({
      ...d,
      biomasa: parseFloat((d.biomasa * activeFilterInfo.scale).toFixed(3))
    }));
  }, [seasonalData, activeFilterInfo.scale]);

  const scaledRecentData = useMemo(() => {
    return recentData.map(d => ({
      ...d,
      biomasa: parseFloat((d.biomasa * activeFilterInfo.scale).toFixed(3))
    }));
  }, [recentData, activeFilterInfo.scale]);

  // KPI values using scaled data
  const latestYear = scaledAnnualData[scaledAnnualData.length - 1];
  const prevYear = scaledAnnualData[scaledAnnualData.length - 2];
  const peakYear = scaledAnnualData.reduce((p, c) => (c.biomasa > p.biomasa ? c : p), { year: "-", biomasa: 0 });
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
              Datos Históricos
            </span>
            {!loading && (
              <span className="text-xs text-muted-foreground font-mono hidden md:block">
                {activeTab === "real" ? `${annualData.length} años cargados` : `${modelData.metrics.n_obs} observaciones`}
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
          <p className="text-muted-foreground text-sm">República Dominicana · Datos satelitales y modelado predictivo del Atlántico</p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex gap-2 border-b border-border pb-px">
          <button
            onClick={() => setActiveTab("real")}
            className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
              activeTab === "real"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Panel Histórico
          </button>
          <button
            onClick={() => setActiveTab("predictive")}
            className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "predictive"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Simulador de Sargazo (Modelo Predictivo)
          </button>
        </div>

        {/* CONDITIONAL CONTENT */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm font-mono">Cargando datos desde GitHub…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span className="text-sm">No se pudo cargar el dataset.</span>
          </div>
        ) : activeTab === "real" ? (
          <>
            {/* ACTIVE FILTER BANNER */}
            {activeFilterInfo.type !== "global" && (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <MapPin className="w-4.5 h-4.5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">Filtro de Mapa Activo</span>
                    <h3 className="text-sm font-semibold text-foreground">
                      Estimación local para: <strong className="text-primary">{activeFilterInfo.name}</strong> 
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        (Aporte proporcional estimado: {(activeFilterInfo.scale * 100).toFixed(2)}% de la biomasa total)
                      </span>
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedProvinceFilter(null);
                    setSelectedBeachFilter(null);
                  }}
                  className="text-xs bg-background hover:bg-muted text-foreground border border-border px-3 py-1.5 rounded-xl transition-colors font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restablecer al Caribe (Ver Total)
                </button>
              </div>
            )}

            {/* REAL-TIME DATA TAB */}
            {/* KPI CARDS */}
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
                  <h2 className="font-display text-lg font-bold">Biomasa anual — {activeFilterInfo.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Millones de toneladas acumuladas por año (2012–2026)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={scaledAnnualData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                  <h2 className="font-display text-lg font-bold">Patrón estacional promedio — {activeFilterInfo.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Biomasa mensual promedio histórico (2012–2026)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scaledSeasonalData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v} Mt`} width={52} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa prom."]} />
                    <Bar dataKey="biomasa" radius={[5, 5, 0, 0]} fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-4 border-b-2 border-dashed border-accent" />
                  Promedio anual: {scaledSeasonalData.length ? (scaledSeasonalData.reduce((s, d) => s + d.biomasa, 0) / 12).toFixed(3) : "—"} Mt
                </p>
              </div>
            </div>

            {/* MAP + PROVINCE TABLE */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* DR MAP */}
              <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6">
                <div className="mb-5">
                  <h2 className="font-display text-lg font-bold">Mapa de Impacto — República Dominicana</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Haz clic en una provincia o playa para filtrar los gráficos temporales</p>
                </div>

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
                    style={{ background: isDark ? "#061c2e" : "#d5e6e8" }}
                    onMouseLeave={() => { setHoveredProvince(null); setMousePos(null); }}
                  >
                    <defs>
                      <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stopColor={isDark ? "#0d2b3e" : "#eaf4f5"} stopOpacity={1} />
                        <stop offset="100%" stopColor={isDark ? "#061c2e" : "#d5e6e8"} stopOpacity={1} />
                      </radialGradient>
                    </defs>
                    <rect width="480" height="340" fill="url(#oceanGrad)" />

                    <path d={HAITI_PATH} fill={isDark ? "#0c1e2e" : "#b8c4c7"} stroke={isDark ? "#1a3a52" : "#9caeb3"} strokeWidth={0.6} />

                    {geoLoading && (
                      <text x="240" y="175" textAnchor="middle" fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={11} fontFamily="DM Mono">
                        Cargando provincias…
                      </text>
                    )}

                    {!geoLoading && geoFeatures.map((feature, idx) => {
                      const geoName = feature.properties.province_name;
                      const id = GEO_NAME_MAP[geoName] ?? null;
                      const pData = id ? PROVINCE_DATA.find(p => p.id === id) : null;
                      const level = pData?.level ?? 0;
                      const baseColor = level > 0 ? LEVEL_COLORS[level] : (isDark ? "#1d5c72" : "#b0bfc2");
                      
                      const isSelected = selectedProvinceFilter === id;
                      const isHovered = hoveredProvince === (id ?? geoName);
                      const isHighlighted = isHovered || isSelected;
                      
                      const pathStr = featureToPath(feature.geometry);
                      return (
                        <path
                          key={`${geoName}-${idx}`}
                          d={pathStr}
                          fill={isHighlighted ? baseColor : baseColor + (level > 0 ? "70" : "55")}
                          stroke={isHighlighted ? baseColor : (isDark ? "#1a4a5a" : "#f4f1ea")}
                          strokeWidth={isHighlighted ? 1.2 : 0.4}
                          style={{ cursor: "pointer", transition: "fill 0.12s" }}
                          onClick={() => {
                            if (id) {
                              if (selectedProvinceFilter === id) {
                                setSelectedProvinceFilter(null); // Click toggles off
                              } else {
                                setSelectedProvinceFilter(id);
                                setSelectedBeachFilter(null);
                              }
                            }
                          }}
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

                    {!geoLoading && geoFeatures.map((feature, idx) => {
                      const geoName = feature.properties.province_name;
                      const id = GEO_NAME_MAP[geoName] ?? null;
                      
                      const isSelected = selectedProvinceFilter === id;
                      const isHovered = hoveredProvince === (id ?? geoName);
                      const isHighlighted = isHovered || isSelected;
                      
                      if (!isHighlighted) return null;
                      const pathStr = featureToPath(feature.geometry);
                      const pData = id ? PROVINCE_DATA.find(p => p.id === id) : null;
                      const level = pData?.level ?? 0;
                      const color = level > 0 ? LEVEL_COLORS[level] : (isDark ? "#1d8c7a" : "#dfdad0");
                      return (
                        <path key={`h-${geoName}-${idx}`} d={pathStr}
                          fill="none" stroke={color} strokeWidth={2}
                          style={{ pointerEvents: "none" }}
                        />
                      );
                    })}

                    {DR_BEACHES.map(beach => {
                      const [bx, by] = lonLatToXY(beach.lon, beach.lat);
                      const color = LEVEL_COLORS[beach.level];
                      
                      const isH = hoveredBeach === beach.id;
                      const isSelected = selectedBeachFilter === beach.id;
                      
                      return (
                        <g key={beach.id} style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (selectedBeachFilter === beach.id) {
                              setSelectedBeachFilter(null);
                            } else {
                              setSelectedBeachFilter(beach.id);
                              setSelectedProvinceFilter(null);
                            }
                          }}
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
                          {(beach.level >= 4 || isSelected || isH) && (
                            <circle cx={bx} cy={by} r={isSelected ? 14 : isH ? 11 : 9} fill={color} opacity={isSelected ? 0.35 : isH ? 0.25 : 0.12} className={isSelected ? "animate-pulse" : ""} />
                          )}
                          <line x1={bx} y1={by + 3} x2={bx} y2={by + 8} stroke={color} strokeWidth={isSelected ? 1.8 : 1.2} opacity={0.8} />
                          <circle cx={bx} cy={by} r={isSelected ? 5.5 : isH ? 5 : 3.5} fill={color} stroke={isDark ? "#061c2e" : "#ffffff"} strokeWidth={1} opacity={isSelected || isH ? 1 : 0.85} />
                          <circle cx={bx} cy={by} r={1.2} fill={isDark ? "#061c2e" : "#ffffff"} opacity={0.6} />
                        </g>
                      );
                    })}

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
                            fill={isDark ? "#061c2e" : "#ffffff"} stroke={color} strokeWidth={0.9} opacity={0.97} />
                          <rect x={tx + 8} y={ty + 6} width={isBeach ? 34 : 46} height={12} rx={3}
                            fill={color} opacity={0.2} />
                          <text x={tx + 12} y={ty + 15} fill={color} fontSize={8} fontFamily="DM Mono" fontWeight={600}>
                            {isBeach ? "PLAYA" : "PROVINCIA"}
                          </text>
                          <text x={tx + 8} y={ty + 30} fill={isDark ? "#dff0eb" : "#0f172a"} fontSize={10} fontFamily="DM Sans" fontWeight={600}>
                            {displayName}
                          </text>
                          {isBeach && beach && (
                            <text x={tx + 8} y={ty + 43} fill={isDark ? "#6fa9a0" : "#475569"} fontSize={9} fontFamily="DM Mono">
                              Alerta de sargazo activa
                            </text>
                          )}
                          {isBeach && beach && (
                            <>
                              <circle cx={tx + 10} cy={ty + 52} r={3.5} fill={color} opacity={0.85} />
                              <text x={tx + 18} y={ty + 55} fill={color} fontSize={8.5} fontFamily="DM Mono">
                                {LEVEL_LABELS[level]} · Nivel {level}/5
                              </text>
                            </>
                          )}
                          {!isBeach && pData && (
                            <>
                              <text x={tx + 8} y={ty + 43} fill={isDark ? "#6fa9a0" : "#475569"} fontSize={9} fontFamily="DM Mono">
                                {pData.impact},000 ton acumuladas
                              </text>
                              <circle cx={tx + 10} cy={ty + 52} r={3.5} fill={color} opacity={0.85} />
                              <text x={tx + 18} y={ty + 55} fill={color} fontSize={8.5} fontFamily="DM Mono">
                                {LEVEL_LABELS[level]} · Nivel {level}/5
                              </text>
                            </>
                          )}
                          {!isBeach && !pData && (
                            <text x={tx + 8} y={ty + 43} fill={isDark ? "#6fa9a0" : "#475569"} fontSize={9} fontFamily="DM Mono">Sin datos de impacto</text>
                          )}
                        </g>
                      );
                    })()}

                    <text x={240} y={333} textAnchor="middle" fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={7} fontFamily="DM Mono" opacity={0.45}>República Dominicana</text>
                    <text x={16} y={195} textAnchor="middle" fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={7} fontFamily="DM Mono" opacity={0.35} transform="rotate(-90,16,195)">Haití</text>
                  </svg>
                </div>
              </div>

              {/* PROVINCE RANKING */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
                <div className="mb-5">
                  <h2 className="font-display text-lg font-bold">Ranking de Provincias</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Haz clic en una provincia para aislar su tendencia</p>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1" style={{ scrollbarWidth: "none" }}>
                  {[...PROVINCE_DATA].sort((a, b) => b.impact - a.impact).map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                        selectedProvinceFilter === p.id 
                          ? "bg-primary/20 border border-primary/30" 
                          : hoveredProvince === p.id 
                            ? "bg-primary/10" 
                            : "hover:bg-background/60"
                      }`}
                      onClick={() => {
                        if (selectedProvinceFilter === p.id) {
                          setSelectedProvinceFilter(null);
                        } else {
                          setSelectedProvinceFilter(p.id);
                          setSelectedBeachFilter(null);
                        }
                      }}
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
                  <h2 className="font-display text-lg font-bold">Tendencia reciente — {activeFilterInfo.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Biomasa mensual en millones de toneladas métricas (Mt) (Últimos 24 meses)</p>
                </div>
                <span className="text-xs font-mono text-accent border border-accent/30 px-2.5 py-1 rounded-full">{scaledRecentData.length} puntos · datos reales</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scaledRecentData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} interval={3} angle={-20} textAnchor="end" height={36} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v} Mt`} width={52} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} Mt`, "Biomasa"]} />
                  <Line type="monotone" dataKey="biomasa" stroke="var(--color-accent)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "var(--color-accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            {/* PREDICTIVE MODEL SIMULATOR TAB */}
            <div className="space-y-8">
              
              {/* SIMULATOR CONTROLS AND RESULTS ROW */}
              <div className="grid lg:grid-cols-5 gap-6">

                {/* CONTROLS COLUMN (2/5 size) */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sliders className="w-5 h-5 text-accent" />
                      <h2 className="font-display text-lg font-bold text-foreground">Controles del Modelo</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-6">
                      Ajusta las variables predictoras o selecciona una playa costera de referencia (en el selector o haciendo clic en el mapa) para analizar el sargazo.
                    </p>

                    <div className="space-y-5">
                      {/* Beach Selector Preset */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-mono uppercase text-muted-foreground">Playa de análisis</label>
                          {isManualMode && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full animate-pulse">
                              🧪 Modificado
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedBeach}
                          onChange={(e) => {
                            setSelectedBeach(e.target.value);
                            setIsManualMode(false);
                          }}
                          className="w-full bg-background border border-border text-foreground px-3 py-2.5 rounded-xl text-sm outline-none focus:border-primary transition-colors font-semibold"
                        >
                          {Object.keys(modelData.playas).map((beach) => (
                            <option key={beach} value={beach}>📍 {beach}</option>
                          ))}
                        </select>
                        {!isManualMode ? (
                          <span className="text-[10px] text-muted-foreground mt-1.5 block">
                            Cargados datos de referencia de {modelData.playas_ref_date} para esta playa.
                          </span>
                        ) : (
                          <button
                            onClick={() => setIsManualMode(false)}
                            className="text-[10px] text-primary hover:underline mt-1.5 block font-medium"
                          >
                            Revertir a valores de referencia
                          </button>
                        )}
                      </div>

                      <div className="border-t border-border/60 my-4" />

                      {/* PO4 (Phosphate) Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            Fosfato (PO₄) 
                            <span className="text-[10px] font-mono text-muted-foreground">({modelData.feature_stats.po4.unit})</span>
                          </span>
                          <span className="text-xs font-mono font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                            {po4.toFixed(4)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.6000"
                          max="0.7500"
                          step="0.0002"
                          value={po4}
                          onChange={(e) => handleSliderChange("po4", parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                          <span>Min: 0.6000</span>
                          <span>Med: {modelData.feature_stats.po4.mean.toFixed(4)}</span>
                          <span>Max: 0.7500</span>
                        </div>
                      </div>

                      {/* Salinity Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            Salinidad
                            <span className="text-[10px] font-mono text-muted-foreground">({modelData.feature_stats.salinity.unit})</span>
                          </span>
                          <span className="text-xs font-mono font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                            {salinity.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="34.50"
                          max="37.00"
                          step="0.05"
                          value={salinity}
                          onChange={(e) => handleSliderChange("salinity", parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                          <span>Min: 34.50</span>
                          <span>Med: {modelData.feature_stats.salinity.mean.toFixed(2)}</span>
                          <span>Max: 37.00</span>
                        </div>
                      </div>

                      {/* Iron (Fe) Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            Hierro (Fe)
                            <span className="text-[10px] font-mono text-muted-foreground">({modelData.feature_stats.fe.unit})</span>
                          </span>
                          <span className="text-xs font-mono font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                            {fe.toFixed(6)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.00090"
                          max="0.00130"
                          step="0.000005"
                          value={fe}
                          onChange={(e) => handleSliderChange("fe", parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                          <span>Min: 0.0009</span>
                          <span>Med: {modelData.feature_stats.fe.mean.toFixed(6)}</span>
                          <span>Max: 0.0013</span>
                        </div>
                      </div>

                      {/* Uo (East-West Current) Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            Corriente Zonal (Uo)
                            <span className="text-[10px] font-mono text-muted-foreground">({modelData.feature_stats.uo.unit})</span>
                          </span>
                          <span className="text-xs font-mono font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                            {uo.toFixed(3)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-0.250"
                          max="0.150"
                          step="0.005"
                          value={uo}
                          onChange={(e) => handleSliderChange("uo", parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                          <span>Oeste: -0.250</span>
                          <span>Med: {modelData.feature_stats.uo.mean.toFixed(3)}</span>
                          <span>Este: 0.150</span>
                        </div>
                      </div>

                      {/* Vo (North-South Current) Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            Corriente Meridional (Vo)
                            <span className="text-[10px] font-mono text-muted-foreground">({modelData.feature_stats.vo.unit})</span>
                          </span>
                          <span className="text-xs font-mono font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                            {vo.toFixed(3)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-0.150"
                          max="0.200"
                          step="0.005"
                          value={vo}
                          onChange={(e) => handleSliderChange("vo", parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                          <span>Sur: -0.150</span>
                          <span>Med: {modelData.feature_stats.vo.mean.toFixed(3)}</span>
                          <span>Norte: 0.200</span>
                        </div>
                      </div>

                      {/* SST Anomaly Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            Anomalía de SST
                            <span className="text-[10px] font-mono text-muted-foreground">({modelData.feature_stats.sst_anomaly.unit})</span>
                          </span>
                          <span className="text-xs font-mono font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                            {sstAnomaly.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-0.30"
                          max="1.00"
                          step="0.01"
                          value={sstAnomaly}
                          onChange={(e) => handleSliderChange("sst", parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                          <span>Frío: -0.30</span>
                          <span>Med: {modelData.feature_stats.sst_anomaly.mean.toFixed(2)}</span>
                          <span>Cálido: 1.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-border/60">
                    <button
                      onClick={resetToHistory}
                      className="w-full flex items-center justify-center gap-2 border border-border hover:bg-background/80 text-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Restablecer a promedio histórico
                    </button>
                  </div>
                </div>

                {/* RESULT & MAP COLUMN (3/5 size) */}
                <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
                  
                  {/* SVG MAP with Beach Pins */}
                  <div className="bg-card border border-border rounded-2xl p-6 relative">
                    <div className="absolute top-6 left-6 z-10">
                      <h2 className="font-display text-sm font-bold text-foreground">Distribución Geográfica de Playas</h2>
                      <p className="text-[10px] text-muted-foreground">El pin seleccionado reacciona en tiempo real a los sliders</p>
                    </div>

                    <div className="relative w-full" style={{ paddingBottom: "70.83%" }}>
                      <svg
                        viewBox="0 0 480 340"
                        className="absolute inset-0 w-full h-full rounded-xl"
                        style={{ background: isDark ? "#061c2e" : "#d5e6e8" }}
                        onMouseLeave={() => { setHoveredProvince(null); setMousePos(null); }}
                      >
                        <defs>
                          <radialGradient id="oceanGradSim" cx="50%" cy="50%" r="70%">
                            <stop offset="0%" stopColor={isDark ? "#0d2b3e" : "#eaf4f5"} stopOpacity={1} />
                            <stop offset="100%" stopColor={isDark ? "#061c2e" : "#d5e6e8"} stopOpacity={1} />
                          </radialGradient>
                        </defs>
                        <rect width="480" height="340" fill="url(#oceanGradSim)" />

                        <path d={HAITI_PATH} fill={isDark ? "#0c1e2e" : "#b8c4c7"} stroke={isDark ? "#1a3a52" : "#9caeb3"} strokeWidth={0.6} />

                        {geoLoading && (
                          <text x="240" y="175" textAnchor="middle" fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={11} fontFamily="DM Mono">
                            Cargando mapa…
                          </text>
                        )}

                        {!geoLoading && geoFeatures.map((feature, idx) => {
                          const geoName = feature.properties.province_name;
                          const id = GEO_NAME_MAP[geoName] ?? null;
                          const pData = id ? PROVINCE_DATA.find(p => p.id === id) : null;
                          const level = pData?.level ?? 0;
                          const baseColor = level > 0 ? LEVEL_COLORS[level] : (isDark ? "#1d5c72" : "#b0bfc2");
                          const isHovered = hoveredProvince === (id ?? geoName);
                          const pathStr = featureToPath(feature.geometry);
                          return (
                            <path
                              key={`sim-${geoName}-${idx}`}
                              d={pathStr}
                              fill={isHovered ? baseColor : baseColor + (level > 0 ? "55" : "40")}
                              stroke={isDark ? "#1a4a5a" : "#f4f1ea"}
                              strokeWidth={0.4}
                              style={{ transition: "fill 0.12s" }}
                            />
                          );
                        })}

                        {/* Interactive beach pins on the map */}
                        {Object.entries(modelData.playas).map(([name, beach]: [string, any]) => {
                          if (!beach) return null;
                          const [bx, by] = lonLatToXY(beach.lon, beach.lat);
                          const isSelected = selectedBeach === name;
                          
                          // Determine the color of this pin
                          let pinColor;
                          if (isSelected) {
                            pinColor = riskLevel.pinColor;
                          } else {
                            const predInfo = beachPredictions[name];
                            pinColor = predInfo ? predInfo.risk.pinColor : "#6fa9a0";
                          }
                          
                          const isH = hoveredBeach === name;
                          
                          return (
                            <g 
                              key={`pin-${name}`} 
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setSelectedBeach(name);
                                setIsManualMode(false);
                              }}
                              onMouseEnter={(e) => {
                                setHoveredBeach(name);
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
                              {/* Pulse ring for selected beach */}
                              {isSelected && (
                                <circle cx={bx} cy={by} r={14} fill={pinColor} opacity={0.35} className="animate-pulse" />
                              )}
                              {/* Hover ring */}
                              {isH && !isSelected && (
                                <circle cx={bx} cy={by} r={10} fill={pinColor} opacity={0.2} />
                              )}
                              {/* Pin stem */}
                              <line x1={bx} y1={by + 3} x2={bx} y2={by + 8} stroke={pinColor} strokeWidth={isSelected ? 1.8 : 1.2} opacity={0.8} />
                              {/* Pin head */}
                              <circle cx={bx} cy={by} r={isSelected ? 6 : 4} fill={pinColor} stroke={isDark ? "#061c2e" : "#ffffff"} strokeWidth={1} />
                            </g>
                          );
                        })}

                        {/* Map Tooltip */}
                        {(hoveredBeach || hoveredProvince) && mousePos && (() => {
                          const beachData = hoveredBeach ? (modelData.playas as Record<string, any>)[hoveredBeach] : null;
                          const isBeach = !!beachData;
                          const isHoveredActive = hoveredBeach === selectedBeach;
                          
                          // Get prediction info for tooltip
                          let label = "";
                          let val = 0;
                          let levelColor = "#1d8c7a";
                          
                          if (isBeach && hoveredBeach) {
                            if (isHoveredActive) {
                              val = predictedNfai;
                              label = riskLevel.label;
                              levelColor = riskLevel.pinColor;
                            } else {
                              const predInfo = beachPredictions[hoveredBeach];
                              val = predInfo ? predInfo.nfai : 0;
                              label = predInfo ? predInfo.risk.label : "";
                              levelColor = predInfo ? predInfo.risk.pinColor : "#6fa9a0";
                            }
                          }
                          
                          const pData = !beachData ? PROVINCE_DATA.find(p => p.id === hoveredProvince) : null;
                          const geoFeature = !beachData ? geoFeatures.find(f => {
                            const id = GEO_NAME_MAP[f.properties.province_name];
                            return id === hoveredProvince || f.properties.province_name === hoveredProvince;
                          }) : null;

                          const displayName = hoveredBeach ?? pData?.name ?? geoFeature?.properties.province_name ?? hoveredProvince ?? "";
                          if (!isBeach && pData) {
                            levelColor = LEVEL_COLORS[pData.level];
                          }
                          
                          const tw = 178, th = isBeach ? 58 : pData ? 54 : 32;
                          const tx = mousePos.x + tw > 468 ? mousePos.x - tw - 8 : mousePos.x + 10;
                          const ty = mousePos.y + th > 328 ? mousePos.y - th - 8 : mousePos.y + 10;

                          return (
                            <g style={{ pointerEvents: "none" }}>
                              <rect x={tx} y={ty} width={tw} height={th} rx={7}
                                fill={isDark ? "#061c2e" : "#ffffff"} stroke={levelColor} strokeWidth={0.9} opacity={0.97} />
                              <rect x={tx + 8} y={ty + 6} width={isBeach ? (isHoveredActive && isManualMode ? 120 : 86) : 46} height={12} rx={3}
                                fill={levelColor} opacity={0.2} />
                              <text x={tx + 12} y={ty + 15} fill={levelColor} fontSize={8} fontFamily="DM Mono" fontWeight={600}>
                                {isBeach ? (isHoveredActive && isManualMode ? "PREDICCIÓN (SIMULACIÓN)" : "PREDICCIÓN PLAYA") : "PROVINCIA"}
                              </text>
                              <text x={tx + 8} y={ty + 30} fill={isDark ? "#dff0eb" : "#0f172a"} fontSize={10} fontFamily="DM Sans" fontWeight={600}>
                                {displayName}
                              </text>
                              {isBeach && (
                                <text x={tx + 8} y={ty + 43} fill={isDark ? "#6fa9a0" : "#475569"} fontSize={9} fontFamily="DM Mono">
                                  NFAI: {val.toFixed(4)} ({label})
                                </text>
                              )}
                              {!isBeach && pData && (
                                <text x={tx + 8} y={ty + 43} fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={9} fontFamily="DM Mono">
                                  {pData.impact},000 ton acumuladas
                                </text>
                              )}
                            </g>
                          );
                        })()}

                        <text x={240} y={333} textAnchor="middle" fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={7} fontFamily="DM Mono" opacity={0.45}>República Dominicana</text>
                        <text x={16} y={195} textAnchor="middle" fill={isDark ? "#6fa9a0" : "#5e7a6f"} fontSize={7} fontFamily="DM Mono" opacity={0.35} transform="rotate(-90,16,195)">Haití</text>
                      </svg>
                    </div>
                  </div>

                  {/* LIVE PREDICTION CARDS */}
                  <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-accent" />
                        <h2 className="font-display text-sm font-bold text-foreground">
                          {isManualMode ? `Simulación en Vivo: Playa ${selectedBeach} (Personalizado)` : `Análisis de Referencia: Playa ${selectedBeach}`}
                        </h2>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* NFAI Display Card */}
                        <div className="bg-background border border-border rounded-xl p-4 flex flex-col justify-center">
                          <span className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Probabilidad de Arribazón</span>
                          <div className="text-2xl font-display font-black text-foreground">
                            {(predictedNfai * 100).toFixed(1)}%
                          </div>
                        </div>

                        {/* Risk Level Card */}
                        <div className={`border rounded-xl p-4 flex flex-col justify-center ${riskLevel.bg}`}>
                          <span className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Nivel de Riesgo</span>
                          <div className={`text-2xl font-display font-black ${riskLevel.color}`}>
                            {riskLevel.label}
                          </div>
                        </div>
                      </div>

                      {/* Linear Risk Gauge */}
                      <div className="mt-4 bg-background border border-border rounded-xl p-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-semibold text-foreground">Porcentaje de Riesgo Normalizado</span>
                          <span className="text-[10px] font-mono font-bold text-foreground">{normalizedIndex.toFixed(1)}%</span>
                        </div>
                        <div className="h-3 w-full bg-border rounded-full overflow-hidden relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 opacity-20" />
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              riskLevel.code === "low" ? "bg-emerald-500" : riskLevel.code === "mid" ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${normalizedIndex}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1.5">
                          <span>Bajo (0%)</span>
                          <span>30% (Medio)</span>
                          <span>60% (Alto)</span>
                          <span>Crítico (100%)</span>
                        </div>
                      </div>

                      {/* Contribution breakdown */}
                      <div className="mt-4 bg-background/50 border border-border/80 rounded-xl p-4">
                        <span className="text-[9px] font-mono uppercase text-muted-foreground mb-2 block">Desglose de Aportación de Variables</span>
                        <div className="space-y-2.5">
                          {contributions.map((c, i) => {
                            const val = c.value;
                            const isPositive = val >= 0;
                            const widthPct = Math.min(100, (Math.abs(val) / 2.5) * 100);
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-[11px] text-foreground font-medium w-24 flex-shrink-0 truncate">{c.name}</span>
                                <div className="flex-1 h-2 bg-border/40 rounded-full relative overflow-hidden flex items-center">
                                  <div 
                                    className={`h-full rounded-full transition-all ${isPositive ? "bg-red-400 ml-auto left-1/2" : "bg-emerald-400 mr-auto right-1/2"}`}
                                    style={{ 
                                      width: `${widthPct / 2}%`,
                                      position: "absolute",
                                      left: isPositive ? "50%" : "auto",
                                      right: isPositive ? "auto" : "50%"
                                    }}
                                  />
                                  <div className="absolute left-1/2 w-0.5 h-full bg-border" />
                                </div>
                                <span className={`text-[9px] font-mono w-14 text-right ${val >= 0 ? "text-red-400" : "text-emerald-400"}`}>
                                  {val >= 0 ? "+" : ""}{val.toFixed(4)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* OLS FIT CHART */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Ajuste del Modelo OLS — Predicho vs Observado</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Comparación de la predicción del modelo con las observaciones satelitales (Nov 2023 – Feb 2026)</p>
                  </div>
                  <span className="text-xs font-mono text-accent border border-accent/30 px-2.5 py-1 rounded-full">
                    {modelData.metrics.n_obs} meses · fuente {modelData.source === "nc" ? "NetCDF" : "demo"}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={modelData.historical} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => {
                        const d = new Date(v + "T00:00:00");
                        return isNaN(d.getTime()) ? v : `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
                      }}
                    />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(3)} width={52} />
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                      labelFormatter={(v) => {
                        const d = new Date(v + "T00:00:00");
                        return isNaN(d.getTime()) ? v : `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
                      }}
                      formatter={(v: any, name: string) => [v ? v.toFixed(4) : "Sin datos", name === "nfai" ? "NFAI Observado" : "NFAI Predicho"]} 
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px", fontFamily: "var(--font-sans)" }} />
                    <Line name="nfai" type="monotone" dataKey="nfai" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ fill: "var(--color-accent)", r: 3.5, strokeWidth: 0 }} connectNulls={false} activeDot={{ r: 6 }} />
                    <Line name="nfai_pred" type="monotone" dataKey="nfai_pred" stroke="var(--color-primary)" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* METRICS GRID */}
              <div className="grid md:grid-cols-2 gap-6">

                {/* MODEL EQUATION */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-accent" />
                    <h3 className="font-display text-base font-bold text-foreground">Fórmula e Interpretación</h3>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-5 mb-5 text-center">
                    <div className="text-xs font-mono text-muted-foreground mb-2">Ecuación de Regresión Logística (Logit)</div>
                    <div className="text-xs sm:text-xs font-mono font-bold text-primary overflow-x-auto whitespace-nowrap py-1">
                      p = 1 / (1 + e^-z)<br/>
                      z = {modelData.model.const.toFixed(4)} + ({modelData.model.sst_anomaly.toFixed(4)} × SST_anom) + ({modelData.model.salinity.toFixed(4)} × Sal) + ({modelData.model.po4.toFixed(4)} × PO₄) + ({modelData.model.fe.toFixed(4)} × Fe) + ({modelData.model.uo.toFixed(4)} × Uo) + ({modelData.model.vo.toFixed(4)} × Vo)
                    </div>
                  </div>
                  <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="text-foreground">Salinidad ({modelData.model.salinity.toFixed(2)}):</strong> Aporta fuertemente al riesgo. Modula la densidad del agua y la flotabilidad del sargazo, afectando su acumulación.
                    </p>
                    <p>
                      <strong className="text-foreground">Fosfato (PO₄) ({modelData.model.po4.toFixed(2)}):</strong> Indica el efecto fertilizante limitante. En el modelo logit estandarizado actúa como regulador del crecimiento.
                    </p>
                    <p>
                      <strong className="text-foreground">Hierro (Fe) ({modelData.model.fe.toFixed(2)}):</strong> Nutriente secundario que promueve la fotosíntesis del alga y acelera su duplicación.
                    </p>
                    <p>
                      <strong className="text-foreground">Corrientes Zonal y Meridional (Uo/Vo) ({modelData.model.uo.toFixed(2)} / {modelData.model.vo.toFixed(2)}):</strong> Representan las componentes zonal (este-oeste) y meridional (norte-sur) del transporte físico del sargazo.
                    </p>
                    <p>
                      <strong className="text-foreground">Anomalía de SST ({modelData.model.sst_anomaly.toFixed(2)}):</strong> Refleja el impacto de la temperatura del agua sobre la tasa metabólica del alga.
                    </p>
                  </div>
                </div>

                {/* STATISTICAL METRICS */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-accent" />
                    <h3 className="font-display text-base font-bold text-foreground">Métricas de Rendimiento</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-background border border-border rounded-xl p-4">
                      <div className="text-2xl font-display font-black text-foreground">
                        {(modelData.metrics.r2 * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">AUC-ROC (Área bajo Curva)</span>
                      <p className="text-[9px] text-muted-foreground mt-1">Capacidad de discriminación de arribazones</p>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4">
                      <div className="text-2xl font-display font-black text-foreground">
                        {modelData.metrics.mae_modelo.toFixed(2)}
                      </div>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">Log-Likelihood</span>
                      <p className="text-[9px] text-muted-foreground mt-1">Logaritmo de verosimilitud del modelo</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                    <div className="flex justify-between">
                      <span>McFadden Pseudo R²:</span>
                      <span className="font-mono font-bold text-foreground">{modelData.metrics.r2_adj.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LLR p-value (Significancia Global):</span>
                      <span className="font-mono font-bold text-emerald-500">{modelData.metrics.f_stat.toExponential(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Observaciones Diarias (N):</span>
                      <span className="font-mono font-bold text-foreground">{modelData.metrics.n_obs} días (2024-2026)</span>
                    </div>
                  </div>
                </div>

              </div>

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
