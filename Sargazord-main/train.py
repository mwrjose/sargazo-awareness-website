import json
import sys
from pathlib import Path
from data_loader import load_and_train

APP_DIR = Path(__file__).parent
DATA_DIR = APP_DIR / "data"
# Destino en el proyecto React: c:\Users\josel\Desktop\Sargazo Awareness Website\src\app\model_data.json
REACT_DATA_PATH = APP_DIR.parent / "src" / "app" / "model_data.json"

def main():
    print("--- Iniciando entrenamiento del modelo predictivo (Logit v2) ---")
    
    # 1. Intentar entrenar con los archivos .nc locales
    result = None
    try:
        result = load_and_train(DATA_DIR)
    except Exception as e:
        print(f"Error durante el procesamiento de NetCDF: {e}", file=sys.stderr)
        
    # 2. Fallback a data.json (demo) si no hay datos o faltan dependencias
    if result is None:
        print("Aviso: No se encontraron archivos .nc válidos o faltan librerías (xarray/statsmodels).")
        print("Cargando coeficientes precalculados de respaldo desde data.json...")
        backup_path = APP_DIR / "data.json"
        if backup_path.exists():
            try:
                result = json.loads(backup_path.read_text(encoding="utf-8"))
                result["source"] = "demo"
            except Exception as e:
                print(f"Error crítico al leer data.json: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("Error crítico: No se encontró el archivo de respaldo data.json.", file=sys.stderr)
            sys.exit(1)
    else:
        print("¡Modelo entrenado con éxito usando tus archivos .nc locales!")

    # 3. Guardar el archivo JSON final en el directorio de la aplicación React
    try:
        REACT_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        REACT_DATA_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"¡Proceso completado! Archivo de datos exportado a:")
        print(f"-> {REACT_DATA_PATH.resolve()}")
    except Exception as e:
        print(f"Error al escribir el archivo model_data.json: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
