import json
import math
import sys
from datetime import datetime
from pathlib import Path
import urllib.request

APP_DIR = Path(__file__).parent
REACT_DATA_PATH = APP_DIR.parent / "src" / "app" / "model_data.json"
BACKUP_DATA_PATH = APP_DIR / "data.json"

# Coordenada del Caribe Dominicano para consulta (cercano a Punta Cana/Bávaro)
LAT = 18.5
LON = -68.4

def fetch_sst_anomaly():
    """Obtiene la anomalía de SST más reciente de la NOAA via ERDDAP.
    Si falla, cae en un valor climatológico o fallback."""
    url = f"https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.json?anom[(latest)][({LAT})][({LON})]"
    print(f"Consultando NOAA ERDDAP para anomalía de SST: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            # Estructura ERDDAP: data["table"]["rows"][0] = [time, lat, lon, value]
            rows = data.get("table", {}).get("rows", [])
            if rows and len(rows[0]) >= 4:
                val = rows[0][3]
                if val is not None and not math.isnan(val):
                    print(f"-> Anomalía de SST NOAA obtenida: {val:.4f} °C")
                    return float(val)
    except Exception as e:
        print(f"Aviso: Falló consulta a NOAA: {e}. Usando fallback de Open-Meteo...")
    
    # Fallback usando Open-Meteo Marine API
    try:
        url_om = f"https://marine-api.open-meteo.com/v1/marine?latitude={LAT}&longitude={LON}&hourly=sst&forecast_days=1"
        req = urllib.request.Request(url_om, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            sst_list = data.get("hourly", {}).get("sst", [])
            if sst_list:
                valid_sst = [s for s in sst_list if s is not None]
                if valid_sst:
                    avg_sst = sum(valid_sst) / len(valid_sst)
                    # Climatología típica del Caribe para el mes actual
                    month = datetime.now().month
                    climatology = [26.8, 26.5, 26.7, 27.2, 27.8, 28.2, 28.5, 28.8, 28.9, 28.7, 28.1, 27.3]
                    clim_val = climatology[month - 1]
                    anom = avg_sst - clim_val
                    print(f"-> Anomalía de SST calculada (Open-Meteo): {anom:.4f} °C (SST: {avg_sst:.1f}°C, Clim: {clim_val:.1f}°C)")
                    return float(anom)
    except Exception as e:
        print(f"Error al obtener SST de Open-Meteo: {e}", file=sys.stderr)
        
    return 0.73  # Media histórica por defecto

def fetch_ocean_currents():
    """Obtiene corrientes Uo y Vo desde Open-Meteo Marine API y calcula la componente zonal."""
    url = f"https://marine-api.open-meteo.com/v1/marine?latitude={LAT}&longitude={LON}&hourly=ocean_current_velocity,ocean_current_direction&forecast_days=1"
    print(f"Consultando Open-Meteo Marine para corrientes: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            hourly = data.get("hourly", {})
            vels = hourly.get("ocean_current_velocity", [])
            dirs = hourly.get("ocean_current_direction", [])
            
            uo_vals = []
            for v, d in zip(vels, dirs):
                if v is not None and d is not None:
                    # uo = velocidad * sin(direccion * pi / 180) (componente Zonal Este-Oeste)
                    rad = math.radians(d)
                    uo = v * math.sin(rad)
                    uo_vals.append(uo)
            
            if uo_vals:
                avg_uo = sum(uo_vals) / len(uo_vals)
                print(f"-> Corriente Uo promedio obtenida: {avg_uo:.4f} m/s")
                return float(avg_uo)
    except Exception as e:
        print(f"Error al obtener corrientes de Open-Meteo: {e}", file=sys.stderr)
        
    return -0.091  # Media histórica por defecto (corriente al Oeste)

def get_climatological_po4(month, historical_data):
    """Calcula el promedio histórico (climatología) de PO4 para el mes actual."""
    po4_vals = []
    for h in historical_data:
        t_str = h.get("time")
        po4 = h.get("po4")
        if t_str and po4 is not None:
            try:
                m = datetime.strptime(t_str, "%Y-%m-%d").month
                if m == month:
                    po4_vals.append(po4)
            except ValueError:
                continue
    if po4_vals:
        return sum(po4_vals) / len(po4_vals)
    # Fallback general si no hay datos
    climatology_po4 = [0.003, 0.0035, 0.004, 0.0045, 0.007, 0.015, 0.018, 0.014, 0.008, 0.003, 0.0025, 0.0028]
    return climatology_po4[month - 1]

def main():
    print("=== INICIANDO ACTUALIZACIÓN DE DATOS OCEANOGRÁFICOS EN VIVO ===")
    
    # 1. Cargar datos existentes en React o backup
    json_path = REACT_DATA_PATH if REACT_DATA_PATH.exists() else BACKUP_DATA_PATH
    if not json_path.exists():
        print("Error: No se encontró ningún archivo de datos (model_data.json o data.json).", file=sys.stderr)
        sys.exit(1)
        
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error al leer JSON existente: {e}", file=sys.stderr)
        sys.exit(1)

    # 2. Consultar APIs en vivo
    sst_anom = fetch_sst_anomaly()
    uo = fetch_ocean_currents()
    
    # Obtener el mes actual
    now = datetime.now()
    month = now.month
    year = now.year
    date_str = f"{year}-{month:02d}-01" # Registrar como primer día del mes

    po4 = get_climatological_po4(month, data.get("historical", []))
    print(f"-> Climatología de PO4 asignada para el mes {month:02d}: {po4:.6f} mmol/m³")

    # 3. Calcular predicción NFAI
    coef = data["model"]
    nfai_pred = coef["const"] + (po4 * coef["po4"]) + (uo * coef["uo"]) + (sst_anom * coef["sst_anomaly"])
    print(f"-> NFAI Predicho calculado: {nfai_pred:.6f}")

    # 4. Actualizar histórico en el JSON
    historical = data.get("historical", [])
    
    # Buscar si ya existe el registro de este mes para actualizarlo, o añadirlo
    record_index = -1
    for idx, h in enumerate(historical):
        if h.get("time") == date_str:
            record_index = idx
            break
            
    new_record = {
        "time": date_str,
        "po4": round(po4, 6),
        "uo": round(uo, 5),
        "sst_anomaly": round(sst_anom, 4),
        "nfai_pred": round(nfai_pred, 5),
        "nfai": None # No hay observación satelital directa aún para el mes actual
    }

    if record_index != -1:
        print(f"Actualizando registro existente para {date_str}...")
        historical[record_index] = new_record
    else:
        print(f"Añadiendo nuevo registro para {date_str}...")
        historical.append(new_record)
        
    # Ordenar histórico por fecha
    historical.sort(key=lambda x: x["time"])
    data["historical"] = historical
    
    # Actualizar la fecha de referencia general
    months_names_es = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    data["playas_ref_date"] = f"{months_names_es[month - 1]} {year}"
    
    # 5. Guardar en los destinos correspondientes
    for path in [REACT_DATA_PATH, BACKUP_DATA_PATH]:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"Archivo actualizado guardado con éxito en: {path}")
        except Exception as e:
            print(f"Error al escribir en {path}: {e}", file=sys.stderr)

    print("=== PROCESO DE ACTUALIZACIÓN CONCLUIDO CON ÉXITO ===")

if __name__ == "__main__":
    main()
