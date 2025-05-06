//Importamos los módulos necesarios
import express from "express";
import session from "express-session";
import { join, dirname, resolve } from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import bodyParser from 'body-parser';
import rutas from './src/routes/router.js'; //Enrutador

//Inicializamos Express
const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const port = 3000;

//Configuramos Express-Session
app.use(session({
    secret: 'Tyf7P20W',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

//Configuramos el envio de datos por medio de los formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Configuramos el motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'src', 'views'));

//Configuramos Express para servir los archivos estáticos
app.use(express.static(join(__dirname, 'src', 'public')));

//Configuramos la ruta estática para los ficheros de la DIGITAL LIBRARY
app.use('/uploads', express.static(join(__dirname, 'src', 'routes', 'library', 'public', 'uploads')));

//Configuramos la ruta
app.use('/app', rutas);

//Configuramos la página de redirección
app.get("/", (req, res) => {
    //Redirigimos a la página de inicio de selección de herramienta
    res.render('app');
});

//Configuramos el puerto
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});