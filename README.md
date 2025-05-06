# APP_CARRETILLERO

## Descripción del Proyecto

APP_CARRETILLERO es una aplicación diseñada para gestionar y optimizar las operaciones logísticas relacionadas con el manejo de carretillas en un entorno industrial. La aplicación permite a los usuarios gestionar etapas operativas, visualizar gráficos de rendimiento, y realizar un seguimiento detallado de las referencias y operaciones realizadas en diferentes puestos.

El proyecto incluye una interfaz de usuario interactiva y un backend robusto que se conecta a una base de datos para almacenar y procesar datos en tiempo real.

---

## Estructura del Proyecto

El proyecto está organizado en los siguientes directorios y archivos principales:

---

## Instalación

### Requisitos Previos

- Node.js (v14 o superior)
- MySQL
- npm (Node Package Manager)

### Pasos de Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tu-usuario/APP_CARRETILLERO.git
   cd APP_CARRETILLERO

2. Instala las dependencias:
    ```bash
    npm install

3. Configura la base de datos:
    - Crea una base de datos MySQL.
    - Importa el esquema y los datos iniciales desde el archivo database.sql (si está disponible).
    - Configura las credenciales de la base de datos en el archivo server.js o en un archivo .env.

4. Inicia el servidor:
    ```bash
    npm start

5. Accede a la aplicación en tu navegador:  
    http://localhost:3000


## Funcionalidades Principales
#### 1. Gestión de Etapas
- Añadir, editar y eliminar etapas operativas.
- Visualizar detalles de cada etapa, como distancia, tiempo y número de picadas.
#### 2. Visualización de Gráficos
- Gráficos de saturación por puesto.
- Gráficos de chimenea para analizar tiempos de actividad.
#### 3. Gestión de Referencias
- Comprobación de referencias válidas.
- Vinculación de referencias a etapas específicas.
#### 4. Modal Interactivo
- Configuración de modales para introducir datos manualmente.
- Visualización de informes detallados.

## Endpoints Principales
Rutas Backend (src/routes/index.js)
#### 1. Gestión de Etapas
- POST /anyadirEtapa/:puesto_id/:referencia_embalaje/:operacion_seleccionada/:numero_picadas

#### 2. Visualización de Datos
- GET /graficoChimenea/:id_puesto
- GET /conteoUM/:referencia_componente

#### 3. Gestión de Referencias
- GET /comprobarReferencias/:referencias
- GET /obtenerReferencias-puesto/:puesto_id

#### 4. Otros
- GET /fechaTomaDatos
- GET /obtenerDatos/:referencia/:puesto_id


## Archivos Clave
#### 1. src/public/script/film.js
- Contiene la lógica principal del frontend, incluyendo:  
    - Funciones para renderizar gráficos (renderizarGrafico).
    - Gestión de etapas (anyadirEtapa, subirEtapa).
    - Configuración de modales (anyadirReferenciaManual).
#### 2. src/routes/index.js
- Define los endpoints del backend, incluyendo:
    - Gestión de etapas y referencias.
    - Consultas SQL para obtener y actualizar datos.
#### 3. src/public/css/style.css
- Estilos personalizados para la interfaz de usuario.

## Tecnologías Utilizadas
#### - Frontend:
- HTML, CSS (TailwindCSS, Bootstrap)
- JavaScript (Chart.js, SortableJS)
#### - Backend:
- Node.js, Express.js
- MySQL
#### - Otros:
- EJS para plantillas dinámicas.
- Fetch API para comunicación cliente-servidor.

## Contacto
- Email: [carla.fuente-bernardino-extern@horse.tech](mailto:carla.fuente-bernardino-extern@horse.tech)
- GitHub: https://github.com/carlafb-horse