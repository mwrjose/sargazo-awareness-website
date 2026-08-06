const fs = require('fs');
const path = require('path');

const BACKUP_DATA_PATH = path.join(__dirname, 'data.json');
const REACT_DATA_PATH = path.join(__dirname, '../src/app/model_data.json');

const NEW_STATS = {
  "sst_anomaly": {"min": -0.190291, "max": 0.818058, "mean": 0.258683, "std": 0.200569, "unit": "°C"},
  "salinity": {"min": 35.149151, "max": 36.445522, "mean": 36.082764, "std": 0.264539, "unit": "psu"},
  "po4": {"min": 0.641761, "max": 0.694784, "mean": 0.662876, "std": 0.012925, "unit": "mmol/m³"},
  "fe": {"min": 0.001026, "max": 0.001207, "mean": 0.001099, "std": 0.000044, "unit": "mmol/m³"},
  "uo": {"min": -0.216033, "max": 0.110600, "mean": -0.087011, "std": 0.057411, "unit": "m/s"},
  "vo": {"min": -0.081166, "max": 0.159142, "mean": 0.062389, "std": 0.035360, "unit": "m/s"}
};

const NEW_MODEL = {
  "const": -2.2470,
  "sst_anomaly": 0.2751,
  "salinity": 2.3539,
  "po4": -1.5732,
  "fe": 0.5788,
  "uo": 1.7560,
  "vo": 0.5574
};

const NEW_THRESHOLDS = {
  "p50": 0.3,
  "p80": 0.6
};

const OLD_PO4_MIN = 0.00126;
const OLD_PO4_MAX = 0.02125;

function mapOldPo4ToNew(oldVal) {
  if (oldVal === null || oldVal === undefined) {
    return NEW_STATS.po4.mean;
  }
  let ratio = (oldVal - OLD_PO4_MIN) / (OLD_PO4_MAX - OLD_PO4_MIN);
  ratio = Math.max(0.0, Math.min(1.0, ratio));
  return NEW_STATS.po4.min + ratio * (NEW_STATS.po4.max - NEW_STATS.po4.min);
}

function predictLogitProbability(sst_anomaly, salinity, po4, fe, uo, vo) {
  const sst_scaled = (sst_anomaly - NEW_STATS.sst_anomaly.mean) / NEW_STATS.sst_anomaly.std;
  const sal_scaled = (salinity - NEW_STATS.salinity.mean) / NEW_STATS.salinity.std;
  const po4_scaled = (po4 - NEW_STATS.po4.mean) / NEW_STATS.po4.std;
  const fe_scaled = (fe - NEW_STATS.fe.mean) / NEW_STATS.fe.std;
  const uo_scaled = (uo - NEW_STATS.uo.mean) / NEW_STATS.uo.std;
  const vo_scaled = (vo - NEW_STATS.vo.mean) / NEW_STATS.vo.std;

  const z = (NEW_MODEL.const + 
             NEW_MODEL.sst_anomaly * sst_scaled + 
             NEW_MODEL.salinity * sal_scaled + 
             NEW_MODEL.po4 * po4_scaled + 
             NEW_MODEL.fe * fe_scaled + 
             NEW_MODEL.uo * uo_scaled + 
             NEW_MODEL.vo * vo_scaled);
  
  return 1.0 / (1.0 + Math.exp(-z));
}

function updateFile(filePath) {
  console.log(`Leyendo: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} no existe.`);
    return false;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  data.model = NEW_MODEL;
  data.feature_stats = NEW_STATS;
  data.thresholds = NEW_THRESHOLDS;

  const playas = data.playas || {};
  for (let beach in playas) {
    let vals = playas[beach];
    if (vals) {
      vals.po4 = mapOldPo4ToNew(vals.po4);
      vals.salinity = NEW_STATS.salinity.mean;
      vals.fe = NEW_STATS.fe.mean;
      vals.vo = NEW_STATS.vo.mean;
    }
  }

  const historical = data.historical || [];
  for (let h of historical) {
    h.po4 = mapOldPo4ToNew(h.po4);
    h.salinity = NEW_STATS.salinity.mean;
    h.fe = NEW_STATS.fe.mean;
    h.vo = NEW_STATS.vo.mean;

    const prob = predictLogitProbability(
      h.sst_anomaly, h.salinity, h.po4, h.fe, h.uo, h.vo
    );
    h.prob_pred = prob;

    const oldNfai = h.nfai;
    if (oldNfai !== null && oldNfai !== undefined) {
      h.bloom_event = oldNfai > -0.464 ? 1 : 0;
    } else {
      h.bloom_event = null;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Actualizado con éxito: ${filePath}`);
  return true;
}

console.log("--- INICIANDO CONVERSIÓN DE ARCHIVOS JSON AL MODELO V2 (LOGIT) ---");
const ok1 = updateFile(BACKUP_DATA_PATH);
const ok2 = updateFile(REACT_DATA_PATH);

if (ok1 && ok2) {
  console.log("¡Conversión completada con éxito para ambos archivos!");
} else {
  console.error("Error: Ocurrió un fallo en la conversión.");
  process.exit(1);
}
