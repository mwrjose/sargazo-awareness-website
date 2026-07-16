import json
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from data_loader import load_and_train

# ──────────────────────────────────────────────────────────────────────────
# Configuración de página
# ──────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Simulador de Sargazo · NFAI",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

APP_DIR = Path(__file__).parent
DATA_JSON_PATH = APP_DIR / "data.json"
DATA_DIR = APP_DIR / "data"


@st.cache_resource(show_spinner="Cargando datos oceánicos (.nc) y entrenando el modelo…")
def _load_data(data_dir_str: str, _cache_key: str):
    """Entrena con los .nc de /data si existen; si no, usa data.json (demo)."""
    result = load_and_train(data_dir_str)
    if result is not None:
        return result
    demo = json.loads(DATA_JSON_PATH.read_text())
    demo["source"] = "demo"
    return demo


def _data_dir_signature(data_dir: Path) -> str:
    """Firma basada en los archivos .nc presentes, para invalidar el caché
    automáticamente si el usuario agrega, quita o reemplaza archivos."""
    if not data_dir.exists():
        return "no-data-dir"
    parts = []
    for f in sorted(data_dir.glob("*.nc")):
        stat = f.stat()
        parts.append(f"{f.name}:{stat.st_size}:{int(stat.st_mtime)}")
    return "|".join(parts) or "empty-data-dir"


DATA = _load_data(str(DATA_DIR), _data_dir_signature(DATA_DIR))

MODEL = DATA["model"]
FSTATS = DATA["feature_stats"]
THRESH = DATA["thresholds"]
METRICS = DATA["metrics"]
PLAYAS = DATA["playas"]
HIST = pd.DataFrame(DATA["historical"])
HIST["time"] = pd.to_datetime(HIST["time"])
hist_start = HIST["time"].min().strftime("%b %Y")
hist_end = HIST["time"].max().strftime("%b %Y")

FEATURES = ["po4", "uo", "sst_anomaly"]
FEATURE_LABELS = {
    "po4": "Fosfato (PO₄)",
    "uo": "Corriente este-oeste (Uo)",
    "sst_anomaly": "Anomalía de SST",
}
FEATURE_HELP = {
    "po4": "Concentración de fosfato disuelto en el agua. Nutriente clave para el crecimiento del sargazo.",
    "uo": "Velocidad de la corriente marina hacia el este (m/s). Valores negativos indican flujo hacia el oeste.",
    "sst_anomaly": "Diferencia de temperatura superficial del mar respecto al promedio histórico (°C).",
}

# ──────────────────────────────────────────────────────────────────────────
# Paleta verde minimalista
# ──────────────────────────────────────────────────────────────────────────
C_BG = "#F4F8F3"
C_CARD = "#FFFFFF"
C_INK = "#1E2B1F"
C_MUTE = "#6B7A6C"
C_LINE = "#E1EADE"
C_50 = "#EAF4E7"
C_100 = "#D3E8CE"
C_300 = "#9BCB93"
C_500 = "#5A9E52"
C_600 = "#437B3E"
C_700 = "#31602D"
C_900 = "#173417"
C_AMBER = "#C98A3A"
C_RUST = "#B4562E"

RISK_LOW = C_500
RISK_MID = C_AMBER
RISK_HIGH = C_RUST

# ──────────────────────────────────────────────────────────────────────────
# CSS minimalista
# ──────────────────────────────────────────────────────────────────────────
st.markdown(
    f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

    html, body, [class*="css"] {{
        font-family: 'Manrope', -apple-system, sans-serif;
    }}
    .stApp {{
        background: {C_BG};
    }}
    #MainMenu, footer, header {{visibility: hidden;}}
    .block-container {{
        padding-top: 2.2rem;
        padding-bottom: 3rem;
        max-width: 1180px;
    }}

    /* Sidebar */
    section[data-testid="stSidebar"] {{
        background: {C_CARD};
        border-right: 1px solid {C_LINE};
    }}
    section[data-testid="stSidebar"] .block-container {{
        padding-top: 1.6rem;
    }}

    /* Headings */
    h1, h2, h3, h4 {{
        color: {C_900} !important;
        font-weight: 800 !important;
        letter-spacing: -0.01em;
    }}
    p, span, label, div {{
        color: {C_INK};
    }}
    .subtitle {{
        color: {C_MUTE};
        font-size: 0.95rem;
        margin-top: -0.6rem;
        margin-bottom: 1.6rem;
    }}

    /* Cards */
    .g-card {{
        background: {C_CARD};
        border: 1px solid {C_LINE};
        border-radius: 16px;
        padding: 1.3rem 1.5rem;
        box-shadow: 0 1px 2px rgba(23,52,23,0.04);
    }}
    .g-card + .g-card {{ margin-top: 0.9rem; }}

    .eyebrow {{
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        font-weight: 700;
        color: {C_600};
        margin-bottom: 0.3rem;
    }}

    .metric-value {{
        font-size: 2.1rem;
        font-weight: 800;
        color: {C_900};
        line-height: 1.1;
    }}
    .metric-sub {{
        font-size: 0.82rem;
        color: {C_MUTE};
        margin-top: 0.15rem;
    }}

    .risk-pill {{
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.9rem;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: 0.01em;
    }}
    .dot {{
        width: 8px; height: 8px; border-radius: 50%;
        display: inline-block;
    }}

    /* Sliders */
    div[data-testid="stSlider"] label p {{
        font-weight: 600;
        color: {C_700} !important;
        font-size: 0.88rem;
    }}
    div[data-baseweb="slider"] > div > div {{
        background: {C_100} !important;
    }}
    div[data-baseweb="slider"] div[role="slider"] {{
        background: {C_600} !important;
        border: 3px solid {C_CARD} !important;
        box-shadow: 0 0 0 1px {C_600};
    }}

    /* Buttons */
    .stButton button {{
        background: {C_600};
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        padding: 0.5rem 1.1rem;
    }}
    .stButton button:hover {{
        background: {C_700};
        color: white;
    }}

    /* Tabs */
    button[data-baseweb="tab"] {{
        font-weight: 600;
        color: {C_MUTE};
    }}
    button[data-baseweb="tab"][aria-selected="true"] {{
        color: {C_700};
    }}
    div[data-baseweb="tab-highlight"] {{
        background-color: {C_600} !important;
    }}

    hr {{ border-color: {C_LINE}; }}

    div[data-testid="stMetricValue"] {{ color: {C_900}; }}

    /* Selectbox / radio */
    div[data-baseweb="select"] > div {{
        border-radius: 10px;
        border-color: {C_LINE};
    }}
    </style>
    """,
    unsafe_allow_html=True,
)


# ──────────────────────────────────────────────────────────────────────────
# Modelo
# ──────────────────────────────────────────────────────────────────────────
def predict_nfai(po4, uo, sst_anomaly):
    return (
        MODEL["const"]
        + MODEL["po4"] * po4
        + MODEL["uo"] * uo
        + MODEL["sst_anomaly"] * sst_anomaly
    )


def risk_level(nfai_pred):
    if nfai_pred > THRESH["p80"]:
        return "ALTO", RISK_HIGH
    elif nfai_pred > THRESH["p50"]:
        return "MODERADO", RISK_MID
    else:
        return "BAJO", RISK_LOW


def risk_index_norm(nfai_pred):
    """Normaliza sobre el rango histórico observado de predicciones para dar un 0-100 legible."""
    lo, hi = HIST["nfai_pred"].min(), HIST["nfai_pred"].max()
    # margen para permitir que sliders extremos salgan un poco del rango histórico
    lo_ext, hi_ext = lo - 0.03, hi + 0.03
    val = (nfai_pred - lo_ext) / (hi_ext - lo_ext)
    return float(np.clip(val, 0, 1)) * 100


def contribution_breakdown(po4, uo, sst_anomaly):
    return {
        "PO₄": MODEL["po4"] * po4,
        "Uo": MODEL["uo"] * uo,
        "SST anomaly": MODEL["sst_anomaly"] * sst_anomaly,
        "Base (const)": MODEL["const"],
    }


# ──────────────────────────────────────────────────────────────────────────
# Sidebar — controles
# ──────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 🌿 Controles del modelo")
    st.caption("Ajusta las variables oceánicas y observa cómo cambia la predicción del índice de sargazo (NFAI).")

    fecha_ref = DATA.get("playas_ref_date", "última fecha disponible")

    st.markdown("---")
    modo = st.radio("Punto de partida", ["Playa real", "Valores manuales"], index=0)

    if modo == "Playa real":
        playa_sel = st.selectbox("Selecciona una playa", list(PLAYAS.keys()), index=0)
        base = PLAYAS[playa_sel]
        base_po4, base_uo, base_sst = base["po4"], base["uo"], base["sst_anomaly"]
        st.caption(f"📍 Valores base de referencia ({fecha_ref}) para **{playa_sel}**.")
    else:
        base_po4 = FSTATS["po4"]["mean"]
        base_uo = FSTATS["uo"]["mean"]
        base_sst = FSTATS["sst_anomaly"]["mean"]

    st.markdown("---")
    st.markdown("**Variables predictoras**")

    po4 = st.slider(
        FEATURE_LABELS["po4"],
        min_value=float(round(FSTATS["po4"]["min"] * 0.5, 5)),
        max_value=float(round(FSTATS["po4"]["max"] * 1.3, 5)),
        value=float(base_po4),
        step=0.0002,
        format="%.4f",
        help=FEATURE_HELP["po4"],
    )
    uo = st.slider(
        FEATURE_LABELS["uo"],
        min_value=float(round(FSTATS["uo"]["min"] * 1.4, 4)),
        max_value=float(round(FSTATS["uo"]["max"] * 3, 4)),
        value=float(base_uo),
        step=0.001,
        format="%.3f",
        help=FEATURE_HELP["uo"],
    )
    sst_anomaly = st.slider(
        FEATURE_LABELS["sst_anomaly"],
        min_value=float(round(FSTATS["sst_anomaly"]["min"] * 1.2, 3)),
        max_value=float(round(FSTATS["sst_anomaly"]["max"] * 1.25, 3)),
        value=float(base_sst),
        step=0.01,
        format="%.2f",
        help=FEATURE_HELP["sst_anomaly"],
    )

    st.markdown("---")
    if st.button("↺ Restablecer a promedio histórico", use_container_width=True):
        st.session_state.clear()
        st.rerun()

    st.markdown("---")
    with st.expander("ℹ️ Sobre el modelo"):
        fuente_txt = (
            "📡 Modelo entrenado con tus archivos **.nc** de la carpeta `data/`"
            if DATA.get("source") == "nc"
            else "🧪 Modo demo — coloca tus archivos `.nc` en una carpeta `data/` junto a `app.py` para reentrenar con datos completos."
        )
        st.caption(fuente_txt)
        st.markdown(
            f"""
            Regresión lineal (OLS) entrenada con **{METRICS['n_obs']} observaciones**
            mensuales.

            **R²** = {METRICS['r2']:.3f} · **R² ajustado** = {METRICS['r2_adj']:.3f}
            **MAE modelo** = {METRICS['mae_modelo']:.5f} ({METRICS['mejora_pct']:.1f}% mejor que el baseline)

            `NFAI = {MODEL['const']:.4f} + {MODEL['po4']:.3f}·PO₄ + {MODEL['uo']:.3f}·Uo + {MODEL['sst_anomaly']:.3f}·SST_anom`
            """
        )
        if st.button("🔄 Reentrenar con archivos actuales de /data", use_container_width=True):
            _load_data.clear()
            st.rerun()

# ──────────────────────────────────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────────────────────────────────
st.markdown("## 🌿 Simulador del Índice de Sargazo (NFAI)")
st.markdown(
    '<div class="subtitle">Explora cómo el fosfato, las corrientes marinas y la anomalía de temperatura '
    'superficial mueven la predicción del modelo — entrenado sobre datos de Copernicus Marine y NOAA para el Caribe dominicano.</div>',
    unsafe_allow_html=True,
)

pred = predict_nfai(po4, uo, sst_anomaly)
level, level_color = risk_level(pred)
idx_norm = risk_index_norm(pred)
contrib = contribution_breakdown(po4, uo, sst_anomaly)

# ──────────────────────────────────────────────────────────────────────────
# Fila de métricas principales
# ──────────────────────────────────────────────────────────────────────────
col1, col2, col3 = st.columns([1.1, 1.1, 1.4])

with col1:
    st.markdown(
        f"""
        <div class="g-card">
            <div class="eyebrow">NFAI predicho</div>
            <div class="metric-value">{pred:.4f}</div>
            <div class="metric-sub">Índice de algas flotantes estimado</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col2:
    st.markdown(
        f"""
        <div class="g-card">
            <div class="eyebrow">Nivel de riesgo</div>
            <div style="margin-top: 0.35rem;">
                <span class="risk-pill" style="background:{level_color}22; color:{level_color};">
                    <span class="dot" style="background:{level_color};"></span>{level}
                </span>
            </div>
            <div class="metric-sub" style="margin-top:0.6rem;">
                Umbral moderado: {THRESH['p50']:.3f} · Umbral alto: {THRESH['p80']:.3f}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col3:
    st.markdown(
        f"""
        <div class="g-card">
            <div class="eyebrow">Índice de riesgo normalizado</div>
            <div class="metric-value">{idx_norm:.0f}<span style="font-size:1rem; color:{C_MUTE};">/100</span></div>
        """,
        unsafe_allow_html=True,
    )
    st.progress(int(idx_norm))
    st.markdown("</div>", unsafe_allow_html=True)

st.write("")

# ──────────────────────────────────────────────────────────────────────────
# Tabs de visualización
# ──────────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs(
    ["📈 Contexto histórico", "🧩 Contribución de variables", "🗺️ Comparar playas", "📊 Sobre el modelo"]
)

# --- TAB 1: histórico + punto simulado ---
with tab1:
    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=HIST["time"], y=HIST["nfai_pred"],
            mode="lines", name="NFAI modelo (histórico)",
            line=dict(color=C_300, width=2.2, dash="dot"),
        )
    )
    obs = HIST.dropna(subset=["nfai"])
    fig.add_trace(
        go.Scatter(
            x=obs["time"], y=obs["nfai"],
            mode="lines+markers", name="NFAI observado",
            line=dict(color=C_600, width=2.6),
            marker=dict(size=6, color=C_600),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=[HIST["time"].max()], y=[pred],
            mode="markers", name="Tu simulación",
            marker=dict(size=15, color=level_color, symbol="star", line=dict(width=1.5, color="white")),
        )
    )
    fig.add_hline(y=THRESH["p80"], line_dash="dash", line_color=RISK_HIGH, opacity=0.5,
                  annotation_text="Umbral ALTO (p80)", annotation_font_color=RISK_HIGH, annotation_font_size=11)
    fig.add_hline(y=THRESH["p50"], line_dash="dash", line_color=RISK_MID, opacity=0.5,
                  annotation_text="Umbral MODERADO (p50)", annotation_font_color=C_AMBER, annotation_font_size=11)

    fig.update_layout(
        height=380,
        plot_bgcolor=C_CARD,
        paper_bgcolor=C_CARD,
        font=dict(family="Manrope", color=C_INK, size=12),
        margin=dict(l=10, r=10, t=20, b=10),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, font=dict(size=11)),
        xaxis=dict(gridcolor=C_LINE, showline=True, linecolor=C_LINE),
        yaxis=dict(title="NFAI", gridcolor=C_LINE, showline=True, linecolor=C_LINE),
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    st.caption(
        "La línea punteada muestra la predicción del modelo reconstruida para todo el periodo con datos "
        "oceánicos completos; la línea sólida son las observaciones satelitales disponibles. La estrella es tu simulación actual."
    )

# --- TAB 2: contribución de variables (waterfall-like bars) ---
with tab2:
    left, right = st.columns([1.3, 1])

    with left:
        names = list(contrib.keys())
        vals = list(contrib.values())
        colors = [C_500 if v >= 0 else C_RUST for v in vals]

        fig2 = go.Figure(
            go.Bar(
                x=vals, y=names, orientation="h",
                marker_color=colors,
                text=[f"{v:+.4f}" for v in vals],
                textposition="outside",
                textfont=dict(color=C_INK, size=12),
            )
        )
        fig2.add_vline(x=0, line_color=C_MUTE, line_width=1)
        fig2.update_layout(
            height=320,
            plot_bgcolor=C_CARD,
            paper_bgcolor=C_CARD,
            font=dict(family="Manrope", color=C_INK, size=12),
            margin=dict(l=10, r=40, t=20, b=10),
            xaxis=dict(title="Contribución al NFAI predicho", gridcolor=C_LINE, zeroline=False),
            yaxis=dict(autorange="reversed"),
        )
        st.plotly_chart(fig2, use_container_width=True, config={"displayModeBar": False})
        st.caption(f"Suma de contribuciones = **{sum(vals):.4f}** = NFAI predicho.")

    with right:
        st.markdown("**Sensibilidad por variable**")
        st.caption("Cambio en NFAI por cada +1 desviación estándar histórica.")
        for f in FEATURES:
            delta = MODEL[f] * FSTATS[f]["std"]
            st.markdown(
                f"""
                <div class="g-card" style="padding:0.8rem 1rem;">
                    <div style="font-weight:700; font-size:0.85rem;">{FEATURE_LABELS[f]}</div>
                    <div style="color:{C_600 if delta>=0 else C_RUST}; font-weight:700; font-size:1.1rem;">
                        {delta:+.4f}
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

# --- TAB 3: comparar playas con los sliders actuales aplicados como offset ---
with tab3:
    st.caption(
        f"Ranking de todas las playas usando sus valores oceánicos base ({fecha_ref}). "
        "Actívalo para aplicar el *offset* de tus sliders respecto al promedio regional."
    )
    aplicar_offset = st.checkbox("Aplicar mis ajustes de sliders a todas las playas (offset relativo)", value=False)

    rows = []
    d_po4 = po4 - base_po4 if aplicar_offset else 0
    d_uo = uo - base_uo if aplicar_offset else 0
    d_sst = sst_anomaly - base_sst if aplicar_offset else 0

    for nombre, v in PLAYAS.items():
        p = predict_nfai(v["po4"] + d_po4, v["uo"] + d_uo, v["sst_anomaly"] + d_sst)
        lvl, _ = risk_level(p)
        rows.append({"Playa": nombre, "NFAI predicho": round(p, 4), "Nivel": lvl,
                      "lat": v["lat"], "lon": v["lon"]})

    df_rank = pd.DataFrame(rows).sort_values("NFAI predicho", ascending=False).reset_index(drop=True)

    color_map = {"ALTO": RISK_HIGH, "MODERADO": RISK_MID, "BAJO": RISK_LOW}
    fig3 = go.Figure(
        go.Bar(
            x=df_rank["NFAI predicho"], y=df_rank["Playa"], orientation="h",
            marker_color=[color_map[l] for l in df_rank["Nivel"]],
            text=df_rank["NFAI predicho"].map(lambda x: f"{x:.4f}"),
            textposition="outside",
        )
    )
    fig3.add_vline(x=THRESH["p80"], line_dash="dash", line_color=RISK_HIGH, opacity=0.6)
    fig3.add_vline(x=THRESH["p50"], line_dash="dash", line_color=RISK_MID, opacity=0.6)
    fig3.update_layout(
        height=460,
        plot_bgcolor=C_CARD,
        paper_bgcolor=C_CARD,
        font=dict(family="Manrope", color=C_INK, size=12),
        margin=dict(l=10, r=40, t=10, b=10),
        xaxis=dict(title="NFAI predicho", gridcolor=C_LINE),
        yaxis=dict(autorange="reversed"),
    )
    st.plotly_chart(fig3, use_container_width=True, config={"displayModeBar": False})

    st.markdown("##### Mapa de ubicaciones")
    map_df = df_rank.rename(columns={"lat": "lat", "lon": "lon"})
    st.map(map_df[["lat", "lon"]], size=60, color="#437B3E")

# --- TAB 4: info del modelo ---
with tab4:
    c1, c2, c3, c4 = st.columns(4)
    for col, label, val in zip(
        [c1, c2, c3, c4],
        ["R²", "R² ajustado", "Observaciones", "Mejora vs. baseline"],
        [f"{METRICS['r2']:.3f}", f"{METRICS['r2_adj']:.3f}", f"{METRICS['n_obs']}", f"{METRICS['mejora_pct']:.1f}%"],
    ):
        with col:
            st.markdown(
                f"""<div class="g-card" style="text-align:center;">
                <div class="eyebrow">{label}</div>
                <div class="metric-value" style="font-size:1.6rem;">{val}</div>
                </div>""",
                unsafe_allow_html=True,
            )

    st.write("")
    st.markdown(
        f"""
        <div class="g-card">
        <div class="eyebrow">Ecuación del modelo</div>
        <p style="font-size:1.05rem; font-weight:600; color:{C_700}; margin-top:0.4rem;">
        NFAI = {MODEL['const']:.4f} + {MODEL['po4']:.4f} · PO₄ + {MODEL['uo']:.4f} · Uo + {MODEL['sst_anomaly']:.4f} · SST_anomalía
        </p>
        <p style="color:{C_MUTE}; font-size:0.88rem;">
        Regresión OLS (statsmodels) sobre {METRICS['n_obs']} observaciones mensuales
        ({hist_start} – {hist_end}), promediadas para la región
        del Caribe dominicano (20.58°N–16.87°N, 71.89°W–67.98°W). Variables seleccionadas por relevancia estadística
        tras comparar contra un modelo completo con 9 predictores (aire, salinidad, NO₃, PO₄, Si, Fe, SST, Uo, Vo).
        El error absoluto medio (MAE) del modelo es {METRICS['mae_modelo']:.5f}, un {METRICS['mejora_pct']:.1f}%
        mejor que predecir siempre el promedio histórico (MAE baseline = {METRICS['mae_baseline']:.5f}).
        </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.write("")
    st.markdown(f"##### Rangos de variables observados en los datos ({hist_start} – {hist_end})")
    stats_df = pd.DataFrame(FSTATS).T
    stats_df.index = [FEATURE_LABELS[i] for i in stats_df.index]
    stats_df = stats_df[["min", "mean", "max", "std", "unit"]]
    stats_df.columns = ["Mínimo", "Promedio", "Máximo", "Desv. estándar", "Unidad"]
    st.dataframe(stats_df, use_container_width=True)

st.write("")
st.markdown(
    f'<div style="text-align:center; color:{C_MUTE}; font-size:0.8rem; padding-top:1rem;">'
    "Datos: Copernicus Marine Service (nutrientes, SST, corrientes, NFAI observado) y NOAA NCEP Reanalysis (viento) · "
    "Modelo de regresión lineal replicado desde el notebook original.</div>",
    unsafe_allow_html=True,
)
