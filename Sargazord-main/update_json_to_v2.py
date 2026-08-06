import json
import math
import sys
from pathlib import Path

APP_DIR = Path(__file__).parent
REACT_DATA_PATH = APP_DIR.parent / "src" / "app" / "model_data.json"
BACKUP_DATA_PATH = APP_DIR / "data.json"

# Estadísticas descriptivas del nuevo dataset depurado (V2)
NEW_STATS = {
    "sst_anomaly": {"min": -0.190291, "max": 0.818058, "mean": 0.258683, "std": 0.200569, "unit": "°C"},
    "salinity": {"min": 35.149151, "max": 36.445522, "mean": 36.082764, "std": 0.264539, "unit": "psu"},
    "po4": {"min": 0.641761, "max": 0.694784, "mean": 0.662876, "std": 0.012925, "unit": "mmol/m³"},
    "fe": {"min": 0.001026, "max": 0.001207, "mean": 0.001099, "std": 0.000044, "unit": "mmol/m³"},
    "uo": {"min": -0.216033, "max": 0.110600, "mean": -0.087011, "std": 0.057411, "unit": "m/s"},
    "vo": {"min": -0.081166, "max": 0.159142, "mean": 0.062389, "std": 0.035360, "unit": "m/s"}
}

# Coeficientes del nuevo modelo Logit (V2)
NEW_MODEL = {
    "const": -2.2470,
    "sst_anomaly": 0.2751,
    "salinity": 2.3539,
    "po4": -1.5732,
    "fe": 0.5788,
    "uo": 1.7560,
    "vo": 0.5574
}

# Límites de probabilidad del semáforo
NEW_THRESHOLDS = {
    "p50": 0.3, # Límite bajo -> medio (30%)
    "p80": 0.6  # Límite medio -> alto (60%)
}

# Rango de escalado de PO4 anterior para mapeo
OLD_PO4_MIN = 0.00126
OLD_PO4_MAX = 0.02125

def map_old_po4_to_new(old_val):
    if old_val is None:
        return NEW_STATS["po4"]["mean"]
    # Mapeo lineal de la escala antigua [0.00126, 0.02125] a la nueva [0.641761, 0.694784]
    ratio = (old_val - OLD_PO4_MIN) / (OLD_PO4_MAX - OLD_PO4_MIN)
    # Clip ratio to [0, 1]
    ratio = max(0.0, min(1.0, ratio))
    new_val = NEW_STATS["po4"]["min"] + ratio * (NEW_STATS["po4"]["max"] - NEW_STATS["po4"]["min"])
    return new_val

def predict_logit_probability(sst_anomaly, salinity, po4, fe, uo, vo):
    # Estandarizar cada variable
    sst_scaled = (sst_anomaly - NEW_STATS["sst_anomaly"]["mean"]) / NEW_STATS["sst_anomaly"]["std"]
    sal_scaled = (salinity - NEW_STATS["salinity"]["mean"]) / NEW_STATS["salinity"]["std"]
    po4_scaled = (po4 - NEW_STATS["po4"]["mean"]) / NEW_STATS["po4"]["std"]
    fe_scaled = (fe - NEW_STATS["fe"]["mean"]) / NEW_STATS["fe"]["std"]
    uo_scaled = (uo - NEW_STATS["uo"]["mean"]) / NEW_STATS["uo"]["std"]
    vo_scaled = (vo - NEW_STATS["vo"]["mean"]) / NEW_STATS["vo"]["std"]

    # Calcular Z
    z = (NEW_MODEL["const"] + 
         NEW_MODEL["sst_anomaly"] * sst_scaled + 
         NEW_MODEL["salinity"] * sal_scaled + 
         NEW_MODEL["po4"] * po4_scaled + 
         NEW_MODEL["fe"] * fe_scaled + 
         NEW_MODEL["uo"] * uo_scaled + 
         NEW_MODEL["vo"] * vo_scaled)
    
    # Sigmoide
    prob = 1.0 / (1.0 + math.exp(-z))
    return prob

def update_file(file_path):
    print(f"Leyendo: {file_path}")
    if not file_path.exists():
        print(f"Error: {file_path} no existe.")
        return False
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Actualizar modelo, stats, thresholds
    data["model"] = NEW_MODEL
    data["feature_stats"] = NEW_STATS
    data["thresholds"] = NEW_THRESHOLDS

    # 2. Actualizar playas con el nuevo mapeo
    playas = data.get("playas", {})
    for beach, vals in playas.items():
        if vals:
            old_po4 = vals.get("po4")
            vals["po4"] = map_old_po4_to_new(old_po4)
            vals["salinity"] = NEW_STATS["salinity"]["mean"]
            vals["fe"] = NEW_STATS["fe"]["mean"]
            vals["vo"] = NEW_STATS["vo"]["mean"]
            # Conservar sst_anomaly y uo (tienen escalas similares)

    # 3. Actualizar histórico
    historical = data.get("historical", [])
    for h in historical:
        # Mapear po4
        old_po4 = h.get("po4")
        h["po4"] = map_old_po4_to_new(old_po4)
        
        # Añadir las nuevas variables asignando la media histórica (que equivale a scaled=0)
        h["salinity"] = NEW_STATS["salinity"]["mean"]
        h["fe"] = NEW_STATS["fe"]["mean"]
        h["vo"] = NEW_STATS["vo"]["mean"]
        
        # Calcular nueva predicción
        prob = predict_logit_probability(
            h["sst_anomaly"], h["salinity"], h["po4"], h["fe"], h["uo"], h["vo"]
        )
        # Guardamos la probabilidad como prob_pred
        h["prob_pred"] = prob
        
        # Mapear el bloom event real basado en el antiguo NFAI observado (> -0.464 que es el P80 antiguo)
        old_nfai = h.get("nfai")
        if old_nfai is not None:
            h["bloom_event"] = 1 if old_nfai > -0.464 else 0
        else:
            h["bloom_event"] = None

    # Guardar cambios
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Actualizado con éxito: {file_path}")
    return True

def main():
    print("--- INICIANDO CONVERSIÓN DE ARCHIVOS JSON AL MODELO V2 (LOGIT) ---")
    
    ok1 = update_file(BACKUP_DATA_PATH)
    ok2 = update_file(REACT_DATA_PATH)
    
    if ok1 and ok2:
        print("¡Conversión completada con éxito para ambos archivos!")
    else:
        print("Error: Ocurrió un fallo en la conversión.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
