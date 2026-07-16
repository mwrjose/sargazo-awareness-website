# Simulador del Índice de Sargazo (NFAI)

App interactiva en Streamlit que replica el modelo de regresión (OLS) de tu
notebook `proyecto_saragazo.ipynb` y permite explorar cómo cambian la
predicción de NFAI y el nivel de riesgo al mover las variables oceánicas
(PO₄, corriente Uo, anomalía de SST).

## Novedad: entrena con tus datos reales (.nc)

Ahora la app puede leer directamente tus archivos `.nc` originales y
**reentrenar el modelo con todas las observaciones disponibles**, en vez de
usar los coeficientes precalculados.

**Cómo activarlo:** coloca tus archivos `.nc` dentro de la carpeta `data/`
(ya viene creada junto a `app.py`). No importa el nombre exacto del archivo
(puntos, guiones o espacios) — la app los detecta por palabras clave:

- `air...nc` → viento (NOAA)
- `...bgc-nut...nc` → nutrientes (PO₄, NO₃, Si, Fe)
- `...sst-anomaly...nc` → anomalía de temperatura superficial
- `...phy-cur...nc` → corrientes marinas
- `...phy-so...nc` → salinidad
- `...bgc_nrt_mr_multi...nc` → NFAI observado (puedes poner **uno o los dos**
  archivos de observación, ej. "enero 2023-septiembre 2025" y
  "septiembre 2025-junio 2026"; la app los concatena automáticamente)

Si la carpeta `data/` está vacía o algún archivo esencial falta, la app cae
automáticamente en modo demo (usa `data.json`, con los coeficientes ya
calculados de tu notebook) — nunca se rompe por falta de datos.

Puedes ver qué modo está activo (📡 datos completos vs 🧪 demo) abriendo el
panel **"ℹ️ Sobre el modelo"** en la barra lateral. Ahí también hay un botón
**"🔄 Reentrenar con archivos actuales de /data"** por si agregas o cambias
archivos sin reiniciar la app.

## Cómo ejecutarla

```bash
pip install -r requirements.txt
streamlit run app.py
```

Si `streamlit` no se reconoce como comando en Windows, usa:

```powershell
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Se abrirá en `http://localhost:8501`.

## Estructura de archivos

```
sargazo_app/
├── app.py            # aplicación Streamlit (diseño verde minimalista)
├── data_loader.py     # lee los .nc de data/ y entrena el modelo OLS
├── data.json          # datos de respaldo (modo demo, ya calculados)
├── requirements.txt
├── README.md
└── data/               # ← coloca aquí tus archivos .nc
```

## Qué incluye la app

- **Sliders** para PO₄, Uo y anomalía de SST, con rangos calibrados sobre
  los datos reales.
- Selector de **playa real** (13 playas de la costa este/sureste de RD) como
  punto de partida, o modo de **valores manuales**.
- Predicción de **NFAI**, **nivel de riesgo** (BAJO / MODERADO / ALTO según
  percentiles p50/p80 históricos) e **índice normalizado 0-100**.
- Pestaña de **contexto histórico**: serie reconstruida con tu simulación
  marcada como estrella.
- Pestaña de **contribución de variables**: cuánto aporta cada predictor
  al resultado final.
- Pestaña de **comparación entre playas** con mapa y ranking de riesgo.
- Pestaña con **métricas del modelo** (R², MAE, ecuación, rangos de datos).

## Modelo (modo demo, con los 27 meses del notebook original)

```
NFAI = -0.5436 + 4.9590·PO₄ + 0.1477·Uo + 0.0642·SST_anomalía
```

R² = 0.461, R² ajustado = 0.390, N = 27 observaciones mensuales.

Al cargar tus `.nc` completos (incluyendo ambos archivos de observación),
estos coeficientes y métricas se recalculan automáticamente con todas las
observaciones disponibles.
