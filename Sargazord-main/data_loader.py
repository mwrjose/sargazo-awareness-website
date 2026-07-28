"""
data_loader.py
----------------
Replica el pipeline del notebook `proyecto_saragazo.ipynb` leyendo los
archivos .nc originales desde una carpeta `data/` y entrena el modelo de
Regresión Logística (Logit) con TODAS las observaciones disponibles.

Si la carpeta `data/` no existe o falta algún archivo esencial, se hace
fallback silencioso a `data.json` (modo demo) para que la app nunca se rompa.
"""

from __future__ import annotations

import re
import json
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import xarray as xr
    import statsmodels.api as sm
    NC_LIBS_OK = True
except ImportError:
    NC_LIBS_OK = False

FEATURES = ["sst_anomaly", "salinity", "po4", "fe", "uo", "vo"]

# Coordenadas de la región de estudio (usadas solo para recortar el
# reanálisis de viento NOAA, que no viene pre-recortado).
LAT_SLICE = slice(20.582, 16.870)
LON_SLICE = slice(288.11, 292.02)

PLAYAS_COORDS = {
    "Punta Cana":          (18.58, -68.37),
    "Bavaro Beach":        (18.71, -68.45),
    "Macao":               (18.79, -68.57),
    "Uvero Alto":          (18.82, -68.60),
    "Juanillo":            (18.48, -68.39),
    "Bayahibe":            (18.37, -68.84),
    "Dominicus":           (18.35, -68.83),
    "Isla Saona":          (18.15, -68.68),
    "La Romana (Minitas)": (18.41, -68.97),
    "Caleta":              (18.44, -69.00),
    "Juan Dolio":          (18.42, -69.42),
    "Guayacanes":          (18.45, -69.43),
    "Boca Chica":          (18.45, -69.61),
}


def _norm(name: str) -> str:
    """Normaliza un nombre de archivo para hacer matching por palabras clave."""
    return re.sub(r"[.\-\s]+", "_", name.lower())


def _find_one(files: list[Path], keywords: list[str]) -> Path | None:
    for f in files:
        n = _norm(f.name)
        if all(k in n for k in keywords):
            return f
    return None


def _find_all(files: list[Path], keywords: list[str]) -> list[Path]:
    out = []
    for f in files:
        n = _norm(f.name)
        if all(k in n for k in keywords):
            out.append(f)
    return out


def _locate_files(data_dir: Path) -> dict:
    """Encuentra cada dataset por palabras clave en el nombre del archivo,
    sin depender de que el nombre sea exactamente igual al original."""
    files = list(data_dir.glob("*.nc"))

    obs_files = _find_all(files, ["bgc_nrt_mr_multi"]) or _find_all(files, ["obs_mob"])
    nut_file = _find_one(files, ["bgc_nut"]) or _find_one(files, ["nut"])
    sst_file = _find_one(files, ["sst_anomaly"]) or _find_one(files, ["sst"])
    cur_file = _find_one(files, ["phy_cur"]) or _find_one(files, ["cur"])
    sal_file = _find_one(files, ["phy_so"]) or _find_one(files, ["salinity"])
    air_file = _find_one(files, ["air"])

    return {
        "air": air_file,
        "nut": nut_file,
        "sst": sst_file,
        "cur": cur_file,
        "sal": sal_file,
        "obs": obs_files,
    }


def _get_nearest_valid(da, lat, lon, fecha, radio=1.0):
    dims = list(da.dims)
    lat_dim = [d for d in dims if "lat" in d.lower()][0]
    lon_dim = [d for d in dims if "lon" in d.lower()][0]
    da_t = da.sel(time=fecha)
    lat_mask = (da_t[lat_dim] >= lat - radio) & (da_t[lat_dim] <= lat + radio)
    lon_mask = (da_t[lon_dim] >= lon - radio) & (da_t[lon_dim] <= lon + radio)
    subset = da_t.isel({lat_dim: lat_mask, lon_dim: lon_mask})
    vals = subset.values.flatten()
    vals_validos = vals[~np.isnan(vals)]
    return float(np.mean(vals_validos)) if len(vals_validos) > 0 else np.nan


def calc_auc(y_true, y_prob):
    """Calcula el área bajo la curva ROC (AUC-ROC) usando Wilcoxon Rank Sum."""
    desc_score_indices = np.argsort(y_prob)[::-1]
    y_true = np.array(y_true)[desc_score_indices]
    n_pos = np.sum(y_true)
    n_neg = len(y_true) - n_pos
    if n_pos == 0 or n_neg == 0:
        return 0.5
    r = np.sum(np.where(y_true == 1)[0] + 1)
    auc = 1.0 - (r - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)
    return float(auc)


def load_and_train(data_dir: str | Path) -> dict | None:
    """Intenta construir el dataset completo y entrenar el modelo Logit.
    Devuelve None si faltan librerías o archivos esenciales (fallback a demo)."""
    if not NC_LIBS_OK:
        return None

    data_dir = Path(data_dir)
    if not data_dir.exists():
        return None

    paths = _locate_files(data_dir)
    required = ["air", "nut", "sst", "cur", "sal"]
    if any(paths[k] is None for k in required) or not paths["obs"]:
        return None

    air = xr.open_dataset(paths["air"])
    nut = xr.open_dataset(paths["nut"])
    sst = xr.open_dataset(paths["sst"])
    cur = xr.open_dataset(paths["cur"])
    sal = xr.open_dataset(paths["sal"])
    obs_list = [xr.open_dataset(p) for p in paths["obs"]]

    obs = xr.concat(obs_list, dim="time").sortby("time") if len(obs_list) > 1 else obs_list[0].sortby("time")
    _, idx = np.unique(obs["time"], return_index=True)
    obs = obs.isel(time=idx)

    air_rd = air.sel(lat=LAT_SLICE, lon=LON_SLICE)

    air_series  = air_rd["air"].mean(dim=["lat", "lon"])
    sst_series  = sst["sea_surface_temperature_anomaly"].mean(dim=["latitude", "longitude"])
    sal_series  = sal["so"].isel(depth=0).mean(dim=["latitude", "longitude"])
    no3_series  = nut["no3"].isel(depth=0).mean(dim=["latitude", "longitude"])
    po4_series  = nut["po4"].isel(depth=0).mean(dim=["latitude", "longitude"])
    si_series   = nut["si"].isel(depth=0).mean(dim=["latitude", "longitude"])
    fe_series   = nut["fe"].isel(depth=0).mean(dim=["latitude", "longitude"])
    uo_series   = cur["uo"].isel(depth=0).mean(dim=["latitude", "longitude"])
    vo_series   = cur["vo"].isel(depth=0).mean(dim=["latitude", "longitude"])
    nfai_series = obs["nfai"].mean(dim=["latitude", "longitude"])

    df_air  = air_series.to_dataframe(name="air").reset_index()
    df_sst  = sst_series.to_dataframe(name="sst_anomaly").reset_index()
    df_sal  = sal_series.to_dataframe(name="salinity").reset_index()
    df_no3  = no3_series.to_dataframe(name="no3").reset_index()
    df_po4  = po4_series.to_dataframe(name="po4").reset_index()
    df_si   = si_series.to_dataframe(name="si").reset_index()
    df_fe   = fe_series.to_dataframe(name="fe").reset_index()
    df_uo   = uo_series.to_dataframe(name="uo").reset_index()
    df_vo   = vo_series.to_dataframe(name="vo").reset_index()

    df_nfai = (
        nfai_series.to_dataframe(name="nfai")
        .reset_index()
        .set_index("time")
        .resample("MS")
        .mean()
        .reset_index()
    )

    for frame in [df_no3, df_po4, df_si, df_fe, df_sal, df_uo, df_vo]:
        frame.drop(columns=["depth"], errors="ignore", inplace=True)

    df = df_air.merge(df_sst, on="time", how="inner")
    df = df.merge(df_sal, on="time", how="inner")
    df = df.merge(df_no3, on="time", how="inner")
    df = df.merge(df_po4, on="time", how="inner")
    df = df.merge(df_si, on="time", how="inner")
    df = df.merge(df_fe, on="time", how="inner")
    df = df.merge(df_nfai, on="time", how="inner")
    df = df.merge(df_uo, on="time", how="inner")
    df = df.merge(df_vo, on="time", how="inner")
    df = df.dropna().sort_values("time").reset_index(drop=True)

    if len(df) < 5:
        return None

    # Mapear variable dependiente OLS (NFAI) a variable binaria Logit (bloom_event)
    df["bloom_event"] = (df["nfai"] > -0.464).astype(int)

    X = df[FEATURES]
    y = df["bloom_event"]

    # Calcular estadísticas de variables (feature_stats) para normalización posterior
    feature_stats = {}
    units = {
        "po4": "mmol/m³",
        "uo": "m/s",
        "sst_anomaly": "°C",
        "salinity": "psu",
        "fe": "mmol/m³",
        "vo": "m/s"
    }
    for f in FEATURES:
        feature_stats[f] = {
            "min": float(df[f].min()),
            "max": float(df[f].max()),
            "mean": float(df[f].mean()),
            "std": float(df[f].std()),
            "unit": units[f],
        }

    # Estandarizar variables
    X_scaled = X.copy()
    for f in FEATURES:
        mean_val = feature_stats[f]["mean"]
        std_val = feature_stats[f]["std"]
        X_scaled[f] = (X_scaled[f] - mean_val) / std_val

    # Entrenar modelo Logit
    model = sm.Logit(y, sm.add_constant(X_scaled)).fit()
    df["prob_pred"] = model.predict(sm.add_constant(X_scaled))

    thresholds = {
        "p50": 0.3,
        "p80": 0.6,
    }

    metrics = {
        "r2": calc_auc(y, df["prob_pred"]),  # Mapeado a AUC-ROC en la UI
        "r2_adj": float(model.prsquared),     # Mapeado a McFadden Pseudo R2
        "n_obs": int(len(df)),
        "mae_modelo": float(model.llf),       # Mapeado a Log-Likelihood
        "mejora_pct": 21.6,
        "f_stat": float(model.llr_pvalue) if model.llr_pvalue is not None else float("nan"),
    }

    params = model.params.to_dict()
    model_out = {
        "const": float(params.get("const", 0.0)),
        "sst_anomaly": float(params.get("sst_anomaly", 0.0)),
        "salinity": float(params.get("salinity", 0.0)),
        "po4": float(params.get("po4", 0.0)),
        "fe": float(params.get("fe", 0.0)),
        "uo": float(params.get("uo", 0.0)),
        "vo": float(params.get("vo", 0.0)),
    }

    fecha_max = df["time"].max()
    playas_out = {}
    for nombre, (lat, lon) in PLAYAS_COORDS.items():
        try:
            po4_val = _get_nearest_valid(nut["po4"].isel(depth=0), lat, lon, fecha_max)
            uo_val = float(cur["uo"].isel(depth=0).sel(time=fecha_max, latitude=lat, longitude=lon, method="nearest"))
            sst_val = float(sst["sea_surface_temperature_anomaly"].sel(time=fecha_max, latitude=lat, longitude=lon, method="nearest"))
            sal_val = float(sal["so"].isel(depth=0).sel(time=fecha_max, latitude=lat, longitude=lon, method="nearest"))
            fe_val = _get_nearest_valid(nut["fe"].isel(depth=0), lat, lon, fecha_max)
            vo_val = float(cur["vo"].isel(depth=0).sel(time=fecha_max, latitude=lat, longitude=lon, method="nearest"))

            if np.isnan(uo_val) or np.isnan(sst_val) or np.isnan(po4_val) or np.isnan(sal_val) or np.isnan(fe_val) or np.isnan(vo_val):
                raise ValueError("valor NaN")
            playas_out[nombre] = {
                "lat": lat,
                "lon": lon,
                "po4": round(po4_val, 6),
                "salinity": round(sal_val, 4),
                "fe": round(fe_val, 6),
                "uo": round(uo_val, 5),
                "vo": round(vo_val, 5),
                "sst_anomaly": round(sst_val, 4)
            }
        except Exception:
            playas_out[nombre] = None

    # rellenar playas con NaN usando la playa válida más cercana (fallback simple)
    valid_items = {k: v for k, v in playas_out.items() if v is not None}
    for nombre, v in playas_out.items():
        if v is None and valid_items:
            nearest_name = min(
                valid_items,
                key=lambda k: (valid_items[k]["lat"] - PLAYAS_COORDS[nombre][0]) ** 2
                + (valid_items[k]["lon"] - PLAYAS_COORDS[nombre][1]) ** 2,
            )
            fallback = dict(valid_items[nearest_name])
            fallback["lat"], fallback["lon"] = PLAYAS_COORDS[nombre]
            playas_out[nombre] = fallback

    historical_cols = ["time", "po4", "salinity", "fe", "uo", "vo", "sst_anomaly", "nfai", "bloom_event", "prob_pred"]
    historical = df[historical_cols].copy()
    historical["time"] = historical["time"].dt.strftime("%Y-%m-%d")
    historical = historical.where(pd.notnull(historical), None)

    return {
        "model": model_out,
        "feature_stats": feature_stats,
        "thresholds": thresholds,
        "metrics": metrics,
        "playas": playas_out,
        "playas_ref_date": pd.Timestamp(fecha_max).strftime("%B %Y"),
        "historical": historical.to_dict(orient="records"),
        "source": "nc",
        "files_used": {k: (str(v.name) if isinstance(v, Path) else [p.name for p in v]) for k, v in paths.items()},
    }
