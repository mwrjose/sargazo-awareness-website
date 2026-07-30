# Proyecto Sargazord: Sistema de Alerta Temprana y Modelado Predictivo de Sargazo en la República Dominicana

## Introducción: La Invasión Dorada y la Necesidad de Actuar

Desde el año 2011, las costas del Mar Caribe han enfrentado un fenómeno sin precedentes: la llegada masiva y recurrente de enormes balsas de sargazo pelágico (*Sargassum fluitans* y *Sargassum natans*). Lo que antes era un componente saludable de los ecosistemas oceánicos se ha convertido en una marea dorada que sofoca los arrecifes de coral, destruye las praderas de pastos marinos y provoca desastres económicos multimillonarios en el sector turístico de la República Dominicana, afectando directamente a destinos clave como Punta Cana, Bávaro, Macao, Uvero Alto y La Romana.

Cuando el sargazo llega a la costa y se descompone, libera gases tóxicos como el sulfuro de hidrógeno ($H_2S$) y el amoníaco ($NH_3$), ahuyentando a los visitantes y creando riesgos de salud pública. 

Ante esta crisis, la pregunta fundamental que inspiró este proyecto fue: **¿Cómo podemos adelantarnos a la llegada del sargazo para que las brigadas de limpieza y los sistemas de barreras flotantes puedan actuar de manera preventiva y no reactiva?**

Para responder a esto, nació **Sargazord**: un ecosistema tecnológico que integra datos satelitales, variables oceanográficas en tiempo real y modelos de aprendizaje automático para predecir el nivel de riesgo de arribazón en las costas dominicanas.

---

## 1. El Origen (Versión 1): El Índice NFAI y la Regresión Lineal

El proyecto comenzó con una hipótesis simple: **El crecimiento y transporte del sargazo están dictados por las condiciones del océano**. 

### El Qué y el Por Qué de la V1
Para cuantificar la presencia de sargazo desde el espacio, utilizamos el **NFAI** (*Normalized Floating Algae Index*), un índice espectral derivado de sensores satelitales que detecta la firma de reflectancia de la vegetación flotante. Recopilamos datos históricos del servicio de monitoreo marino de la Unión Europea (**CMEMS**) junto con tres variables que la literatura científica señalaba como los principales motores del fenómeno:
1.  **Fosfato ($\text{PO}_4$):** El nutriente limitante que actúa como fertilizante del alga.
2.  **Anomalía de la Temperatura Superficial del Mar ($\text{SST\_anomalía}$):** Un aumento en la temperatura acelera el metabolismo y la duplicación del sargazo.
3.  **Corriente Marina Zonal ($U_o$):** La componente de velocidad este-oeste que transporta físicamente el sargazo hacia nuestras costas.

Con estos datos, entrenamos un modelo de **Regresión Lineal Ordinaria (OLS)**, cuya ecuación resultante fue:

$$NFAI = -0.5436 + 4.9590 \cdot \text{PO}_4 + 0.1477 \cdot U_o + 0.0642 \cdot \text{SST\_anomalía}$$

### Ajuste del Modelo OLS: Predicho vs. Observado

Para evaluar la precisión de la **Versión 1**, comparamos directamente los valores del índice NFAI predichos por la ecuación lineal frente a los valores reales observados por el satélite. 

El modelo OLS alcanzó una significancia estadística moderada con un coeficiente de determinación **$R^2 = 0.461$** (y un $R^2 \text{ ajustado} = 0.458$). Esto nos indica que las variaciones en el fosfato, las corrientes zonales y la temperatura superficial explican aproximadamente el **$46.1\%$ de la variabilidad histórica del sargazo** en la zona. 

Sin embargo, al graficar el ajuste de **Predicho vs. Observado**, observamos deficiencias estructurales críticas:
*   **Subestimación de Picos Extremos:** Durante los eventos de máxima arribazón (blooms masivos), los valores reales de NFAI se disparaban de forma exponencial debido al rápido crecimiento biológico del alga. Al ser un modelo estrictamente lineal, el OLS no pudo capturar este comportamiento exponencial, subestimando gravemente los picos de mayor riesgo (el modelo predecía un aumento moderado de NFAI mientras que la costa se inundaba de sargazo).
*   **Predicciones Negativas Absurdas:** En temporadas frías o de bajos nutrientes, el NFAI observado se mantenía en un nivel plano cercano a cero. La naturaleza lineal del modelo forzaba la predicción a valores negativos abstractos e inexistentes en la realidad física, creando confusión en la lectura del índice.
*   **Distribución de Residuos:** Los residuos (diferencia entre el valor real y el predicho) no seguían una distribución homogénea (heterocedasticidad), concentrándose en los extremos de nulo sargazo o arribazón extrema, evidenciando que la relación real entre el océano y el sargazo no es lineal.

### La Lección Aprendida
Aunque el modelo lineal arrojó una significancia estadística aceptable ($R^2 = 0.461$), nos enfrentamos a un problema práctico de comunicación científica en el mundo real: 
*   **Dificultad de interpretación:** Para un hotelero, un pescador o un tomador de decisiones del gobierno, que el modelo prediga un "NFAI de $-0.485$" no significa nada. Es un índice abstracto, ruidoso y difícil de traducir en decisiones operativas (¿Debo desplegar las redes hoy o no?).
*   **Ruido diario y escala temporal:** El NFAI fluctúa bruscamente día a día debido a la cobertura nubosa y los parches dispersos, lo que causaba predicciones inestables cuando se intentaba modelar como una variable continua pura.

---

## 2. La Evolución (Versión 2): Del Índice Abstracto a la Probabilidad de Arribazón

Comprendiendo que necesitábamos una herramienta útil para la toma de decisiones, decidimos rediseñar el modelo en la **Versión 2**, cambiando la perspectiva metodológica.

### El Giro de la Versión 2: Regresión Logística
En lugar de predecir el valor exacto del índice NFAI, decidimos predecir la **probabilidad de que ocurra un evento de arribazón (bloom_event)**. 

Definimos matemáticamente un "evento de arribazón" como aquellos días en los que el porcentaje de cobertura de sargazo en la región de estudio supera el **percentil 80 (P80)** del registro histórico (lo que representa aproximadamente el $20\%$ de los días con mayor volumen de sargazo).

Al transformar el problema de una regresión continua a una **clasificación binaria** ($1 = \text{Arribazón}$, $0 = \text{Día Normal}$), pudimos utilizar un modelo de **Regresión Logística (Logit)**. Esto nos permite entregar al usuario final una **probabilidad de riesgo (de 0% a 100%)**, la cual se traduce de inmediato en un sistema de semáforo de alerta temprana:

```mermaid
graph TD
    A[Datos Oceanográficos en Vivo] --> B[Estandarización de Variables]
    B --> C[Modelo de Regresión Logística v2]
    C --> D{Probabilidad p}
    D -->|p > 60%| E[🔴 ALTO RIESGO: Desplegar Barreras]
    D -->|30% < p <= 60%| F[🟡 RIESGO MEDIO: Alerta de Monitoreo]
    D -->|p <= 30%| G[🟢 RIESGO BAJO: Operaciones Normales]
```

### Expansión de Variables y Tratamiento de la Colinealidad
Para robustecer el modelo, exploramos la incorporación de más variables físicas y químicas, controlando estrictamente la colinealidad (variables altamente correlacionadas que confunden al modelo):
*   **Nutrientes:** El Nitrato ($\text{NO}_3$) y el Silicato ($\text{Si}$) mostraron una correlación de $>0.77$ con el Fosfato ($\text{PO}_4$) y el Hierro ($\text{Fe}$) respectively. Para evitar redundancia, los excluimos y conservamos únicamente el **Fosfato ($\text{PO}_4$)** y el **Hierro ($\text{Fe}$)** como indicadores de fertilización.
*   **Física Marina:** Añadimos la **Salinidad** (que influye en la flotabilidad y densidad del agua) y la componente meridional de las corrientes (**$V_o$**, componente norte-sur), completando el vector de transporte junto a la corriente zonal ($U_o$).

El nuevo modelo utiliza 6 variables independientes estandarizadas mediante puntuación $Z$:

$$z = -2.5971 + 0.2104 \cdot \text{sst\_anom}_{\text{scaled}} + 2.1191 \cdot \text{salinidad}_{\text{scaled}} - 1.6533 \cdot \text{po4}_{\text{scaled}} + 0.4811 \cdot \text{fe}_{\text{scaled}} + 1.5275 \cdot \text{uo}_{\text{scaled}} + 0.3909 \cdot \text{vo}_{\text{scaled}}$$

$$\text{Probabilidad de Arribazón} (p) = \frac{1}{1 + e^{-z}}$$

Este nuevo enfoque probabilístico logró un rendimiento sobresaliente, alcanzando un **AUC-ROC de $0.901$** en la fase de validación, lo que demuestra una alta capacidad para discriminar días normales de verdaderos eventos de arribazón masiva.

---

## 3. Decisiones de Diseño Científico y Solución de Errores Críticos

Durante la construcción del pipeline de datos, nos topamos con obstáculos técnicos que requirieron decisiones de diseño clave para la tesis:

### El Error del Flag de Calidad NFAI (Un "Bug" Científico)
Al procesar las imágenes satelitales diarias de CMEMS, notamos que el sargazo parecía "desaparecer" por completo de los DataFrames tras la decodificación. Al investigar a fondo los metadatos de los archivos NetCDF, descubrimos una anomalía en la definición de la máscara de calidad:
El valor asignado por el satélite para una "observación válida de sargazo" era `32767`, pero este valor coincidía exactamente con el `_FillValue` (valor reservado para representar datos nulos o faltantes). Las librerías estándar de Python (`xarray` y `netCDF4`) reemplazaban automáticamente el valor `32767` por un `NaN` al abrir el dataset. 

*   **Solución:** Modificamos el pipeline de carga para abrir los archivos crudos usando `mask_and_scale=False`. Esto deshabilitó la conversión automática de nulos, permitiéndonos recuperar el flag original `32767` y medir correctamente el sargazo sin pérdidas de información.

### Por Qué Normalizar (StandardScaler)
Las variables oceanográficas se miden en escalas completamente diferentes: el hierro se mide en fracciones microscópicas de milimoles ($\sim 0.001$), mientras que la salinidad ronda los $36$ gramos por litro. Si entrenamos una regresión logística con estos valores directamente, el modelo le daría un peso desproporcionado a las variables con magnitudes numéricas grandes (como la salinidad) e ignoraría a las pequeñas (como el hierro), independientemente de su importancia biológica real. 

Estandarizar los datos restándoles su media y dividiéndolos por su desviación estándar asegura que todas las variables jueguen en igualdad de condiciones en el modelo.

---

## 4. Arquitectura y Funcionamiento del Ecosistema Sargazord

El proyecto no es solo un modelo teórico en un Jupyter Notebook; es una plataforma de software integrada que consta de tres capas principales:

```mermaid
graph LR
    subgraph A [Fuentes de Datos]
        A1[NOAA ERDDAP]
        A2[Open-Meteo Marine]
    end
    subgraph B [Backend de Python]
        B1[fetch_live_data.py]
        B2[model_data.json]
    end
    subgraph C [Frontend Web React]
        C1[Dashboard Interactivo]
        C2[Simulador de Escenarios]
    end
    A --> B1
    B1 --> B2
    B2 --> C1
    B2 --> C2
```

### Capa 1: Captura de Datos y Predicción en Vivo (Python)
El script [fetch_live_data.py](file:///c:/Users/josel/Desktop/Sargazo%20Awareness%20Website/Sargazord-main/fetch_live_data.py) actúa como el recolector de datos del sistema. Una vez al mes, realiza peticiones automáticas a las APIs de NOAA (para obtener anomalías térmicas) y a Open-Meteo (para obtener salinidad y velocidad/dirección de corrientes). 

Calcula las componentes zonales y meridionales del viento y corriente, aplica los parámetros de normalización y la fórmula logística, y guarda el nuevo punto en el historial del archivo [model_data.json](file:///c:/Users/josel/Desktop/Sargazo%20Awareness%20Website/src/app/model_data.json).

### Capa 2: Almacenamiento de Datos Centralizado (`model_data.json`)
El archivo JSON actúa como puente (API estática) entre Python y el Frontend. Contiene:
*   Los coeficientes entrenados del modelo.
*   Las estadísticas descriptivas (medias y desviaciones estándar) necesarias para la normalización.
*   Las coordenadas geográficas y valores históricos de referencia para 13 playas dominicanas.
*   El histórico de predicciones mensuales para graficar series de tiempo.

### Capa 3: La Aplicación Web Interactiva (React / Vite)
Desarrollada con una estética oscura premium, la web proporciona al usuario dos pestañas operativas cruciales:
1.  **El Monitor de Riesgo Activo:** Muestra un mapa de la costa este y sureste de la República Dominicana con marcadores en cada playa. Cada marcador se colorea dinámicamente según el nivel de probabilidad de arribazón calculado para esa fecha, permitiendo a las autoridades ver de un vistazo qué zonas están bajo alerta roja, amarilla o verde.
2.  **El Simulador de Escenarios:** Esta es la herramienta de investigación. Permite a los científicos y usuarios manipular 6 deslizadores (sliders) correspondientes a cada variable. Al moverlos, la interfaz normaliza el valor ingresado y calcula al instante en el navegador la nueva probabilidad de arribazón. Esto ayuda a responder preguntas hipotéticas como: *“Si la temperatura del mar sube 0.5°C y el fosfato aumenta por fertilizantes de ríos, ¿cuánto subirá el riesgo de arribazón en playa Macao?”*

---

## Conclusión: El Valor de la Predicción en el Mundo Real

El paso de la **Versión 1** a la **Versión 2** del proyecto Sargazord representa el paso de un modelo puramente teórico a un **sistema de toma de decisiones operativo**. Al cambiar el enfoque de predecir un índice de reflectancia satelital a predecir la probabilidad matemática de una catástrofe de arribazón, el proyecto se convirtió en una herramienta real de alerta temprana. 

La integración de scripts automatizados en Python y una interfaz web interactiva en React demuestra cómo la ciencia de datos aplicada a la oceanografía puede aportar soluciones tangibles para la resiliencia climática y la protección ecológica de las costas de la República Dominicana.
