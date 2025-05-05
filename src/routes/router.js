
//Importamos los módulos necesarios
import { Router } from 'express';
import { default as backendRoutes } from './index.js';  //Importamos el backend

//Creamos una instancia del router
const router = Router();

//Router para la página principal del router
router.get('/', (req, res) => {
  res.render('film');
});


//Router para los end points
router.use('/api', backendRoutes);

//Exportamos el enrutador
export default router;