//Importamos Express y los módulos necesarios
import express from "express";
import mysql from "mysql";

//Creamos una instancia de router
const router = express.Router();

//Inicializamos Express
const app = express();

//Creamos el pool de conexiones
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'toor',
    database: 'carretillero',
    port: 3306
});

/**
 * Función para obtener una conexión del pool
 * @param {*} callback La función de callback a ejecutar.
 */
function getDBConnection(callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error de conexión:', err);
            callback(err, null);
        } else {
            callback(null, connection);
        }
    });
}

/**
 * End point para añadir un nuevo puesto
 */
router.post('/anyadirPuesto/:numero_puesto/:nombre_puesto/:numero_operarios/:turno/:planta', (req, res) => {
    //Almacenamos los valores del formulario
    const { numero_puesto, nombre_puesto, numero_operarios, turno, planta } = req.params;
    console.log(
        "Puesto: ", numero_puesto,
        "\nNombre puesto: ", nombre_puesto,
        "\nNúmero operarios: ", numero_operarios,
        "\nTurno: ", turno,
        "\nPlanta: ", planta
    );

    //Controlamos los valores de los campos necesarios
    if (!numero_puesto || !nombre_puesto || !numero_operarios) {
        return res.status(400).send('Faltan campos en la solicitud');
    }

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        if (err) {
            //En caso de que se produzca un error...
            console.error('> Error al conectar a la base de datos: ', err);
            return res.status(500).send('Error al conectar a la base de datos');
        }

        //Almacenamos en una variable la consulta SQL para obtener el ID del turno usando el turno y la planta
        const queryTurno = `
            SELECT
                t.id
            FROM
                turnos t
            WHERE
                t.turno = ?
        `;

        //Ejecutamos la consulta para obtener el ID del turno
        connection.query(queryTurno, [turno], (errorTurno, resultTurno) => {
            if (errorTurno) {
                console.error('> Error a la hora de obtener el ID del turno: ', errorTurno);
                return res.status(500).send('Error al obtener el ID del turno');
            }

            if (resultTurno.length === 0) {
                return res.status(404).send('No se encontró el turno especificado');
            }

            //Almacenamos en la variable el ID del turno
            const id_turno = resultTurno[0].id;
            console.log('ID del turno: ', id_turno);

            // Verificamos si el numero_puesto ya existe
            const queryVerificarPuesto = `SELECT COUNT(*) AS count FROM puestos WHERE numero = ?`;

            connection.query(queryVerificarPuesto, [numero_puesto], (errorVerificar, resultVerificar) => {
                if (errorVerificar) {
                    console.error('> Error al verificar si el número de puesto ya existe: ', errorVerificar);
                    return res.status(500).send('Error al verificar si el número de puesto ya existe');
                }

                // Si el número de puesto ya existe, desplazamos los demás números de puesto
                if (resultVerificar[0].count > 0) {
                    // Desplazamos los puestos con número mayor o igual al nuevo
                    const queryDesplazar = `UPDATE puestos SET numero = numero + 1 WHERE numero >= ?`;

                    connection.query(queryDesplazar, [numero_puesto], (errorDesplazar) => {
                        if (errorDesplazar) {
                            console.error('> Error al desplazar los puestos: ', errorDesplazar);
                            return res.status(500).send('Error al desplazar los puestos');
                        }

                        // Ahora insertamos el nuevo puesto
                        insertarPuesto();
                    });
                } else {
                    // Si el número de puesto no existe, lo insertamos directamente
                    insertarPuesto();
                }
            });

            function insertarPuesto() {
                //Almacenamos en una nueva variable la consulta SQL para añadir el puesto
                const queryPuesto = `
                    INSERT INTO
                        puestos(numero, nombre, numero_operarios, id_turno)
                    VALUES
                        (?, ?, ?, ?)
                `;

                //Ejecutamos la consulta para añadir el puesto
                connection.query(queryPuesto, [numero_puesto, nombre_puesto, numero_operarios, id_turno], (errorPuesto, resultPuesto) => {

                    console.log(">>>>> QUERY AÑADIR PUESTO:\n", connection.format(queryPuesto, [numero_puesto, nombre_puesto, numero_operarios, id_turno]));

                    if (errorPuesto) {
                        console.error('> Error a la hora de añadir el puesto: ', errorPuesto);
                        return res.status(500).send('Error a la hora de añadir el puesto');
                    }

                    //Enviamos el status
                    res.status(201).send('Puesto añadido');
                });
            }
        });
    });
});

/**
 * Función para obtener la query dependiendo de la operación seleccionada por el usuario
 * @param {String} operacion_seleccionada Argumento que contiene la operación seleccionada
 * @returns Devolvemos la query dependiendo de la operación seleccionada
 */
function queryOperacionSeleccionada(operacion_seleccionada) {
    //Creamos una variable para almacenar la query
    let query;

    //Creamos un switch para controlar la operación seleccionada
    switch (operacion_seleccionada) {
        //En caso de que sea "1. Descarga camión en muelle"
        case '1. Descarga camión en muelle':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, DC113, CDC, DS10, CDL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "2. De imagen camión a stock":
        case '2. De imagen camión a stock':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, PS14, CDC, DS14, CDL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "3. De stock a estantería":
        case '3. De stock a estantería':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, PS14, CDC, DS15, CDL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "4. De imagen camión a estantería":
        case '4. De imagen camión a estantería':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, PS14, CDC, DS15, CDL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "5. De estantería a puesto inferior":
        case '5. De estantería a puesto inferior':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, PS15, DI21, CDL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "7. Apertura":
        case '7. Apertura':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, DC, D1, W5, TT, W5_2, M1, AL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "6. Gestión de residuos":
        case '6. Gestión de residuos':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, DC, D1, W5, TT, M1, AL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "8. Zipado"
        case '8. Zipado':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, DC, D1, W5, G1, W5_2, M1, AL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "9. Plegado de vacíos"
        case '9. Plegado de vacíos':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, DC, D1, W5, TT, TT_2, W5_2, M1, AL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        //En caso de que sea "10. De stock exterior a stock interior"
        case '10. De stock exterior a stock interior':
            query = `
                INSERT INTO
                    etapas (id_puesto, referencia_componente, cantidad_mover, operacion, numero_picadas, PS14, CDC, DS10, CDL, actividad_minutos, actividad_minutos_picadas)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            break;

        default:
            query = null;
            break;
    }

    //Devolvemos la query
    return query;
}

/**
 * Función para añadir una etapa operativa en la base de datos
 * @param {import("mysql").Connection} connection Argumento que contiene la conexión a la base de datos
 * @param {String} query Argumento que contiene la sentencia SQL para añadir la etapa
 * @param {Array} data Argumento que contiene los datos de inserción de la etapa
 * @param {String} operacion_seleccionada Argumento que contiene la operación seleccionada por el usuario
 */
function anyadirEtapa_Operacion(connection, query, data, operacion_seleccionada) {
    //Creamos una variable 
    let cantidad_mover = data[2], numero_picadas = data[4];

    console.log("Data FINAL --> ", data);

    //Controlamos el tipo de operación
    switch (operacion_seleccionada) {
        //En caso de que sea "1. Descarga camión en muelle"
        case '1. Descarga camión en muelle':
            data.push(
                ((42 * cantidad_mover) / 100), // DC113
                ((6 * cantidad_mover) / 100), // CDC
                ((19 * cantidad_mover) / 100), // DS10
                ((6 * cantidad_mover) / 100), // CDL
                (
                    (42 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (19 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (42 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (19 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;


        //En caso de que sea "2. De imagen camión a stock"
        case '2. De imagen camión a stock':
            data.push(
                ((38 * cantidad_mover) / 100), // PS14
                ((6 * cantidad_mover) / 100), // CDC
                ((38 * cantidad_mover) / 100), // DS14
                ((6 * cantidad_mover) / 100), // CDL
                (
                    (38 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (38 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (38 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (38 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;

        //En caso de que sea "3. De stock a estantería"
        case '3. De stock a estantería':
            data.push(
                ((38 * cantidad_mover) / 100), // PS14
                ((6 * cantidad_mover) / 100), // CDC
                ((49 * cantidad_mover) / 100), // DS15
                ((6 * cantidad_mover) / 100), // CDL
                (
                    (38 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (49 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (38 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (49 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picadas
            );
            break;

        //En caso de que sea "4. De imagen camión a estantería"
        case '4. De imagen camión a estantería':
            data.push(
                ((38 * cantidad_mover) / 100), // PS14
                ((6 * cantidad_mover) / 100), // CDC
                ((49 * cantidad_mover) / 100), // DS15
                ((6 * cantidad_mover) / 100), // CDL
                (
                    ((38 * cantidad_mover) / 100) +
                    ((6 * cantidad_mover) / 100) +
                    ((49 * cantidad_mover) / 100) +
                    ((6 * cantidad_mover) / 100)
                ), // Actividad en minutos
                (
                    (
                        ((38 * cantidad_mover) / 100) +
                        ((6 * cantidad_mover) / 100) +
                        ((49 * cantidad_mover) / 100) +
                        ((6 * cantidad_mover) / 100)
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;

        //En caso de que sea "5. De estantería a puesto inferior"
        case '5. De estantería a puesto inferior':
            data.push(
                ((44 * cantidad_mover) / 100), // PS14
                ((30 * cantidad_mover) / 100), // DS15
                ((6 * cantidad_mover) / 100), // CDL
                (
                    ((44 * cantidad_mover) / 100) +
                    ((30 * cantidad_mover) / 100) +
                    ((6 * cantidad_mover) / 100)
                ), // Actividad en minutos
                (
                    (
                        ((44 * cantidad_mover) / 100) +
                        ((30 * cantidad_mover) / 100) +
                        ((6 * cantidad_mover) / 100)
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;

        //En caso de que sea "7. Apertura"
        case '7. Apertura':
            data.push(
                ((4 * cantidad_mover) / 100), // DC
                ((6 * cantidad_mover) / 100), // D1
                ((1 * cantidad_mover) / 100), // W5
                ((20 * cantidad_mover) / 100), // TT
                ((1 * cantidad_mover) / 100), // W5_2
                ((7 * cantidad_mover) / 100), // M1
                ((2 * cantidad_mover) / 100), // AL
                (
                    (4 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (1 * cantidad_mover) / 100 +
                    (20 * cantidad_mover) / 100 +
                    (1 * cantidad_mover) / 100 +
                    (7 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (4 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (1 * cantidad_mover) / 100 +
                        (20 * cantidad_mover) / 100 +
                        (1 * cantidad_mover) / 100 +
                        (7 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;

        //En caso de que sea "6. Gestión de residuos"
        case '6. Gestión de residuos':
            data.push(
                ((4 * cantidad_mover) / 100), // DC
                ((6 * cantidad_mover) / 100), // D1
                ((1 * cantidad_mover) / 100), // W5
                ((35 * cantidad_mover) / 100), // TT
                ((7 * cantidad_mover) / 100), // M1
                ((2 * cantidad_mover) / 100), // AL
                (
                    (4 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (1 * cantidad_mover) / 100 +
                    (35 * cantidad_mover) / 100 +
                    (7 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (4 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (1 * cantidad_mover) / 100 +
                        (35 * cantidad_mover) / 100 +
                        (7 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;

        //En caso de que sea "8. Zipado"
        case '8. Zipado':
            data.push(
                ((4 * cantidad_mover) / 100), // DC
                ((6 * cantidad_mover) / 100), // D1
                ((2 * cantidad_mover) / 100), // W5
                ((4 * cantidad_mover) / 100), // G1
                ((2 * cantidad_mover) / 100), // W5
                ((7 * cantidad_mover) / 100), // M1
                ((2 * cantidad_mover) / 100), // AL
                (
                    (4 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100 +
                    (4 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100 +
                    (7 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100
                ), // Actividad en miuntos
                (
                    (
                        (4 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100 +
                        (4 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100 +
                        (7 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            )
            break;

        //En caso de que sea '9. Plegado de vacíos'
        case '9. Plegado de vacíos':
            data.push(
                ((4 * cantidad_mover) / 100), // DC
                ((6 * cantidad_mover) / 100), // D1
                ((2 * cantidad_mover) / 100), // W5
                ((20 * cantidad_mover) / 100), // TT
                ((20 * cantidad_mover) / 100), // TT
                ((2 * cantidad_mover) / 100), // W5
                ((7 * cantidad_mover) / 100), // M1
                ((2 * cantidad_mover) / 100), // AL
                (
                    (4 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100 +
                    (20 * cantidad_mover) / 100 +
                    (20 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100 +
                    (7 * cantidad_mover) / 100 +
                    (2 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (4 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100 +
                        (20 * cantidad_mover) / 100 +
                        (20 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100 +
                        (7 * cantidad_mover) / 100 +
                        (2 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            );
            break;

        //En caso de que sea "10. De stock exterior a stock interior"
        case '10. De stock exterior a stock interior':
            data.push(
                ((38 * cantidad_mover) / 100), // PS14
                ((6 * cantidad_mover) / 100), // CDC
                ((19 * cantidad_mover) / 100), // DS10
                ((6 * cantidad_mover) / 100), // CDL
                (
                    (38 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100 +
                    (19 * cantidad_mover) / 100 +
                    (6 * cantidad_mover) / 100
                ), // Actividad en minutos
                (
                    (
                        (38 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100 +
                        (19 * cantidad_mover) / 100 +
                        (6 * cantidad_mover) / 100
                    ) / numero_picadas
                ) // Actividad en minutos X picada
            )
            break;
        default:
            break;
    }

    //Ejecutamos la sentencia
    connection.query(query, data, (error, result) => {
        console.log(">>>>> QUERY AÑADIR ETAPA:\n", connection.format(query, data));
        //En caso de que ocurra algun error...
        if (error) {
            console.error("> Error a la hora de añadir la operación: ", error);
            //En cualquier otro caso...
        } else {
            console.log('> Resultados: ', result);
        }
    });
}

/**
 * End point para añadir una nueva etapa a un puesto
 */
router.post('/anyadirEtapa/:puesto_id/:referencia_embalaje/:operacion_seleccionada/:numero_picadas', async (req, res) => {
    try {
        //Almacenamos los parámetros de la URL
        const { puesto_id, operacion_seleccionada, numero_picadas } = req.params;

        //Decodificamos y parseamos el JSON de referencia_embalaje con manejo de errores
        let referencia_embalaje;

        try {
            referencia_embalaje = JSON.parse(req.params.referencia_embalaje);
            console.log("> Referencia embalajes: ", referencia_embalaje);
        } catch (err) {
            return res.status(400).send('Error en el formato de referencia_embalaje', err);
        }

        //Obtenemos la query
        const query = queryOperacionSeleccionada(operacion_seleccionada);

        console.log("> Query AÑADIR: ", query);
        if (!query) {
            return res.status(400).send('Operación no válida');
        }

        console.log(
            "Puesto ID: ", puesto_id,
            "\nDiccionario: ", referencia_embalaje,
            "\nOperación seleccionada: ", operacion_seleccionada,
            "\nNúmero de picadas: ", numero_picadas
        );

        //Creamos la conexión a la base de datos
        const connection = await new Promise((resolve, reject) => {
            getDBConnection((err, conn) => {
                if (err) reject(err);
                else resolve(conn);
            });
        });

        //Iteramos sobre las referencias y ejecutamos las operaciones
        const keys = Object.keys(referencia_embalaje);
        console.log("> Claves: ", keys);
        for (const referencia of keys) {
            //Obtenemos 
            const cantidad_mover = referencia_embalaje[referencia];
            console.log(`>>> Clave: ${referencia} \tValor: ${cantidad_mover}`);

            const data = [
                puesto_id,
                referencia,
                cantidad_mover,
                operacion_seleccionada,
                numero_picadas
            ];

            //Llamamos a la función para añadir la etapa
            anyadirEtapa_Operacion(connection, query, data, operacion_seleccionada);
        }

        //Liberamos la conexión después de finalizar todas las operaciones
        connection.release();

        //Enviamos la respuesta al cliente
        return res.status(201).send("End point procesado correctamente");

    } catch (err) {
        console.error("> Error en el procesamiento: ", err);
        return res.status(500).send('Error interno del servidor');
    }
});


/**
 * 
 */
router.put('/actualizarOrden/:array_ordenado', (req, res) => {
    let array_ordenado = decodeURIComponent(req.params.array_ordenado);

    let query = `
        UPDATE
            EN_IFM_STANDARD
        SET
            orden = ?
        WHERE
            id = ? AND
            id_puesto = ?
    `;

    let array = array_ordenado.split('-')

    getDBConnection((err, connection) => {
        //En caso de que se produzaca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        array.forEach((item, index) => {
            connection.query(query, [array_ordenado[index], item[0], item[1]], (error) => {
                //Liberamos la conexión
                connection.release();

                //En caso de que se produzca un error...
                if (error) {
                    console.error("> Error: ", error);

                    //Enviamos el status
                    return res.status(500).send('Error en la consulta');

                    //En otro caso...
                } else {
                    return res.status(201);
                }
            })
        })
    });
});



/**
 * End point para obtener las etapas de un puesto
 */
router.get('/obtenerEtapasPuesto/:id_puesto/:nombre_etapa', (req, res) => {
    //Almacenamos el ID del puesto
    let { id_puesto, nombre_etapa } = req.params;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzaca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                e.*,
                o.nombre
            FROM
                etapas e
            INNER JOIN
                operaciones o
            ON 
                e.operacion = o.nombre
            WHERE 
                e.id_puesto = ? 
                AND e.operacion = ?
            ORDER BY
                o.nombre;
            ;
        `;


        //Ejecutamos la consulta
        connection.query(query, [id_puesto, nombre_etapa], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error...
            if (error) {
                console.error("> Error: ", error);

                //Enviamos el status
                return res.status(500).send('Error en la consulta');

                //En otro caso...
            } else {
                console.log("> Resultados ETAPAS: ", results);

                //Enviamos la información
                res.json(results);
            }
        })
    });
});


/**
 * End point para obtener el conteo de todas las etapas disponibles
 */
router.get("/conteoEtapas", (req, res) => {
    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                COUNT(id)
            FROM
                etapas
        `;

        //Ejecutamos la consulta SQL
        connection.query(query, [], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error
            if (error) {
                console.log("> Error: ", error);

                //Enviamos el status
                return res.status(500).send('Error en la consulta');

            }

            console.log("> Result: ", results);

            //Enviamos la información
            res.json(results);
        })
    })
});

/**
 * End point para obtener los métodos de una operación
 */
router.get(`/obtenerMetodos/:operacion`, (req, res) => {
    //Almacenamos en una variable la operacion
    const operacion = req.params.operacion;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzaca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                m.*, o.color 
            FROM 
                metodos m
            JOIN
                operaciones o 
            ON 
                m.nombre_operacion = o.nombre
            WHERE 
                m.nombre_operacion = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [operacion], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //Si ocurre algun error...
            if (error) {
                console.log("> Error: ", error);

                //Enviamos el status
                return res.status(500).send('Error en la consulta');

                //En otro caso...
            } else {
                console.log("> Resultados ETAPAS F: ", results);

                //Enviamos la información
                res.json(results);
            }
        });
    });
});


/**
 * End point para obtener las etapas agrupadas de un puesto
 */
router.get('/obtenerEtapasAgrupadasPuesto/:id_puesto', (req, res) => {
    //Almacenamos el ID del puesto
    const id_puesto = req.params.id_puesto;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzaca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL

        const query = `
            SELECT 
                e.id_puesto, o.nombre, o.color, SUM(e.cantidad_mover) AS cantidad_mover, MAX(COALESCE(e.distancia_total, 0)) AS distancia_total, SUM(e.PS14) AS PS14, 
                SUM(e.DS10) AS DS10, SUM(e.CDL) AS CDL, SUM(e.CDC) AS CDC, SUM(e.M1) AS M1, SUM(e.PS15) AS PS15, SUM(e.DI21) AS DI21, SUM(e.DC113) AS DC113, 
                SUM(e.DS14) AS DS14, SUM(e.DS15) AS DS15, SUM(e.DC) AS DC, SUM(e.D1) AS D1, SUM(e.W5) AS W5, SUM(e.TT) AS TT, SUM(e.AL) AS AL, SUM(e.G1) AS G1, 
                SUM(e.P5) AS P5, MAX(e.numero_picadas) AS numero_picadas, SUM(actividad_minutos_picadas) AS actividad_minutos_picadas, SUM(e.tiempo_distancia_total) AS tiempo_distancia_total
            FROM
                etapas AS e
            INNER JOIN
                operaciones AS o
            ON 
                e.operacion = o.nombre
            WHERE 
                e.id_puesto = ?
            GROUP BY 
                e.operacion, e.id_puesto
            ORDER BY
                o.nombre;
        `;


        //Ejecutamos la consulta
        connection.query(query, [id_puesto], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error...
            if (error) {
                console.error("> Error: ", error);

                //Enviamos el status
                return res.status(500).send('Error en la consulta');

                //En otro caso...
            } else {
                console.log("> Resultados ETAPAS GRUPO: ", results);

                //Enviamos la información
                res.json(results);
            }
        })
    });
});

/**
 * End point para obtener todos los puestos
 */
router.get('/obtenerPuestos', (req, res) => {
    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL para obtener los puestos disponibles
        const query = `
            SELECT
                DISTINCT(p.id), p.numero, p.nombre, p.numero_operarios,
                ROUND((COALESCE(SUM(e.actividad_minutos_picadas), 0) / 442) * 100, 2) AS saturacion,
                t.turno
            FROM
                puestos p
            INNER JOIN
                turnos t
            ON
                p.id_turno = t.id
            LEFT JOIN 
                etapas e 
            ON 
                p.id = e.id_puesto
            GROUP BY 
                p.id,
                p.nombre 
            ORDER BY 
                p.numero ASC
        `;

        //Ejecutamos la consulta
        connection.query(query, [], (err, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error...
            if (err) {
                console.error("> Error: ", err);
                return res.status(500).send('Error en la consulta');
            }

            //En cualquier otro caso...
            console.log("> Resultados PUESTOS: ", results);

            //Enviamos la información y el estado
            return res.status(200).json(results);
        });
    });
});


/**
 * End point para obtener los datos de la saturación de cada etapa de un puesto
 */
router.get('/graficoChimenea/:id_puesto', (req, res) => {
    //Almacenamos en una variable el ID del puesto
    const id_puesto = req.params.id_puesto;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que falle
        if (err) {
            return res.status(501).send("Error al conectar con la base de datos");
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                e.id_puesto AS id, 
                o.nombre AS nombre,
                o.color AS color,
                SUM(e.actividad_minutos_picadas) AS minutos
            FROM
                etapas e 
            INNER JOIN 
                operaciones o 
            ON 
                e.operacion = o.nombre 
            WHERE 
                e.id_puesto = ?
            GROUP BY 
                e.operacion, e.id_puesto
            ORDER BY
                o.nombre;
        `;

        //Ejecutamos la consulta
        connection.query(query, [id_puesto], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso  de que se produzca un error...
            if (error) {
                console.log("> Error: ", error);

                //Enviamos el status
                return res.status(501).send("Error en la consulta");
            }

            console.log("> Resultadossss: ", results);

            //Enviamos la información
            return res.json(results);
        });
    });
});


/**
 * End point para obtener la cantidad de embalajes a mover usando la referencia del componente
 */
router.get('/conteoEmbalajes/:referencia_componente', (req, res) => {
    //Almacenamos la referencia del componente de los parametros
    const referencia_componente = req.params.referencia_componente;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra un error
        if (err) {
            return res.status(400).send("Error al conectar con la base de datos");
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT SUM(cantidad) AS total_pieces
            FROM embalajes
            WHERE referencia_componente = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [referencia_componente], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error...
            if (err) {
                console.error("> Error: ", err);
                return res.status(500).send('Error en la consulta');
            }

            console.log("> Resultados: ", results);

            //Enviamos la información
            res.json(results);
        });
    });
});


/**
 * End point para eliminar un registro en especifico
 */
router.delete('/eliminarRegistro/:id_elemento/:tabla/:id_puesto', (req, res) => {
    /** Almacenamos las variables de los parámetros */
    const { id_elemento, tabla, id_puesto } = req.params;

    console.log("> ID elemento: ", id_elemento, "\tTabla: ", tabla, "\tID puesto: ", id_puesto);

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            res.status(500).send()
        }

        let control = Number(id_elemento), query, array_argumetos;

        if (tabla === "etapas") {
            if (!isNaN(control)) {
                query = `
                    DELETE 
                    FROM
                        ${tabla}
                    WHERE
                        id = ?
                `;
                array_argumetos = [id_elemento];
            } else if (isNaN(control)) {
                query = `
                    DELETE 
                    FROM
                        ${tabla}
                    WHERE
                        operacion = ?
                    AND 
                        id_puesto = ?
                `;
                array_argumetos = [id_elemento, id_puesto]
            }
        } else if (tabla === "puestos") {
            query = `
                DELETE 
                FROM
                    ${tabla}
                WHERE
                    id = ?
            `;
            array_argumetos = [id_elemento];
        }

        //Ejecutamos la consulta
        connection.query(query, array_argumetos, (error, results) => {
            console.log("ELIMINAR!!!!!!!!!!!", connection.format(query, array_argumetos))
            //En caso de que falle
            if (error) {
                console.error("> Error: ", error);

                //Enviamos el status
                return res.status(501).send("Error en la consulta");
            }

            console.log("Results: ", results);

            if (tabla === "puestos") {
                //Almacenamos en una variable la consulta SQL
                const query = `
                    DELETE
                    FROM 
                        etapas
                    WHERE
                        id_puesto = ?
                `;

                //Ejecutamos la consulta
                connection.query(query, [id_elemento], (error, results) => {
                    //En caso de que falle
                    if (error) {
                        console.error("> Error: ", error);
                    }
                })
            } else if (tabla === "EN_IFM_STANDARD") {
                const query = `
                    DELETE
                    FROM
                        chimenea
                    WHERE
                        id_puesto = ? AND
                        id_etapa = ?
                `;

                //Ejecutamos la consulta
                connection.query(query, [id_puesto, id_elemento], (error, result) => {
                    //En caso de que falle
                    if (error) {
                        console.error("> Error: ", error);
                    }
                })
            }

            //Liberamos la conexión
            connection.release();

            //Enviamos el status
            return res.status(201).send("Registro eliminado");
        });
    });
});


/**
 * End point para comprobar si las referencias introducidas por el usuario existen
 */
router.get('/comprobarReferencias/:referencias', (req, res) => {
    //Almacenamos en variables los parámetros
    const { referencias } = req.params;

    //Almacenamos en un array las referencias obtenidas
    const array_referencias = referencias.split(' ');
    const referencias_juntas = array_referencias.map(ref => `'${ref}'`).join(', ');


    //Creamos un nuevo arrray filtrado por referencias únicas
    const array_referencias_finales = [...array_referencias];


    //Almacenamos en una variable la consulta SQL
    let query = `
        SELECT 
            COUNT(*)
        FROM
            embalajes
        WHERE
            referencia_componente IN (${referencias_juntas})
    `;

    getDBConnection((err, connection) => {
        //En caso de que se produzca algún error...
        if (err) {
            console.error("> Error al conectar a la base de datos: ", err);
            return res.status(500).send('Error al conectar con la base de datos: ', err);
        }
        connection.query(query, (error, result) => {

            console.log(connection.format(query));

            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error en la consulta
            if (error) {
                console.error("> Error: ", error);
                return res.status(501).send('Error a la hora de comprobar si la referencia es válida: ', error);
            }

            //Verificamos si el resultado es mayor que 0 (referencia encontrada)
            if (!result || result[0]['COUNT(*)'] <= 0) {
                //console.log("> No se encontró la referencia:", item);
            }

            return res.json({ validReferences: array_referencias_finales });
        });
    });
});


/**
 * End point para obtener el turno del puesto
 */
router.get('/obtenerTurno/:puesto_id', (req, res) => {
    //Almacenamos la variable de los parámetros
    const puesto_id = req.params.puesto_id;

    console.log("> Puesto ID: ", puesto_id);

    //Almacenamos en una variable la consulta SQL
    const query = `
        SELECT 
            t.turno, t.jornada_inicio, t.jornada_fin 
        FROM
            turnos t
        INNER JOIN
            puestos p
        ON
            t.id = p.id_turno
        WHERE 
            p.id = ?
    `;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que falle...
        if (err) {
            console.error("> Error en la conexión a la base de datos: ", err);

            //Enviamos el estado
            return res.status(501).send('Error en la conexión a la base de datos');
        }

        //Ejecutamos la consulta
        connection.query(query, [puesto_id], (error, result) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que ocurra algun error...
            if (error) {
                console.error("> Error a la hora de obtener los datos del turno: ", error);

                //Enviamos el status
                res.status(501).send('No se han podido obtener los datos del turno');
            }

            console.log("> Resultados: ", result);

            //Enviamos la información
            res.json(result);
        })
    });
});


/**
 * End point para obtener las referencias disponibles para disponerlas en el modal de buscador de referencias
 */
router.get('/obtenerReferencias/:id_puesto', (req, res) => {
    //Almacenamos en variables los parámetros
    const { id_puesto } = req.params;

    //Variables para almacenar la información básica
    let jornada_inicio, jornada_fin, turno;

    //Almacenamos en una variable la consulta SQL para obtener la jornada de inicio y fin
    let query = `
        SELECT
            t.jornada_inicio,
            t.jornada_fin,
            t.turno
        FROM
            turnos t
        INNER JOIN
            puestos p
        ON
            t.id = p.id_turno
        WHERE
            p.id = ?
    `;


    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error en la conexión a la base de datos
        if (err) {
            //Enviamos el status
            console.error("> Error en la conexión a la base de datos: ", err);
            return res.status(501).send('Error en la conexión a la base de datos');
        }

        //Ejecutamos la consulta SQL para obtener los turnos del puesto
        connection.query(query, [id_puesto], (erro1, result1) => {
            //En caso de que ocurra algun error en la consulta SQL
            if (erro1) {
                //Enviamos el status
                console.error("> Error en la ejecución de la consulta SQL: ", erro1);
                return res.status(501).send('Error en la consulta SQL');
            }

            //Almacenamos en variables las jornadas de los tiempos
            jornada_inicio = result1[0].jornada_inicio;
            jornada_fin = result1[0].jornada_fin;
            turno = result1[0].turno;

            let op, simbolo;

            if (turno === 'N') {
                op = 'OR';
                simbolo = '';
            } else {
                op = 'AND';
                simbolo = '=';
            }

            //Almacenamos en una variable la nueva consulta SQL
            query = `
                SELECT
                    DISTINCT(referencia_componente)
                FROM
                    embalajes
                WHERE
                    hora >${simbolo} ? ${op}
                    hora <${simbolo} ?
            `;

            //Ejecutamos la segunda consula SQL
            connection.query(query, [jornada_inicio, jornada_fin], (error, result) => {
                console.log(">>>>> QUERY REFES:\n", connection.format(query, [jornada_inicio, jornada_fin]));
                //En caso de de que ocurra algun error
                if (error) {
                    //Enviamos el status
                    console.error("> Error en la última consulta SQL: ", error);
                    return res.status(501).send('Error en la consulta SQL');
                }

                //Enviamos la información
                return res.json(result);
            })
        });
    });
});


/**
 * End point para actualizar el orden de las etapas
 */
/*router.put('/actualizarOrden/:array_ordenado', (req, res) => {
    //Almacenamos la variable de los parámetros
    let array_ordenado = decodeURIComponent(req.params.array_ordenado);

    console.log("Array recibido en el backend:", array_ordenado); // Verificar el array recibido

    // Convertir el string en un array separando por "-"
    let array = array_ordenado.split(',');

    console.log("Array separado:", array); // Verificar que la separación es correcta

    //Almacenamos en una variable la query
    let query = `
        UPDATE
            EN_IFM_STANDARD
        SET
            orden = ?
        WHERE
            id = ? AND
            id_puesto = ?
    `;

    //let array = array_ordenado.split('-');

    //Obtenemos la conexión
    getDBConnection((err, connection) => {
        //En caso de que se produzaca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        // Usamos un índice para manejar el orden
        for (let index = 0; index < array.length; index++) {
            let item = array[index];
            let [id, id_puesto] = item.split('-'); // Separar id e id_puesto
            let orden = index + 1; // Asignar el orden basado en el índice

            console.log(`Actualizando: ID=${id}, ID_Puesto=${id_puesto}, Orden=${orden}`); // Verificar los valores a actualizar

            // Ejecutamos la consulta para cada etapa
            connection.query(query, [orden, id, id_puesto], (error, result) => {
                if (error) {
                    console.error("> Error: ", error);
                    connection.release();
                    return res.status(500).send('Error en la consulta');
                }

                console.log(`Consulta exitosa para ID=${id} y ID_Puesto=${id_puesto}, resultado:`, result);

                // Liberamos la conexión después de la última consulta
                if (index === array.length - 1) {
                    connection.release();
                    res.status(200).send('Orden actualizado correctamente');
                }
            });
        }
    });
});*/

/**
 * End ponint para obtener los datos para subir la etapa a un puesto
 */
router.get('/obtenerEmbalajes/:referencia/:puesto_id', (req, res) => {
    //Almacenamos los datos de los parámetros
    const { referencia, puesto_id } = req.params;

    //Almacenamos las referencias separadas por ","
    const referenciasArray = referencia.split(',');

    //Variables para almacenar los datos necesarios
    let jornada_inicio, jornada_final, turno;

    //Consulta SQL para obtener el inicio y fin de la jornada
    const query_jornada = `
        SELECT t.jornada_inicio, t.jornada_fin, t.turno
        FROM puestos p 
        INNER JOIN turnos t ON p.id_turno = t.id 
        WHERE p.id = ?;
    `;


    //Conexión a la BD
    getDBConnection((err, connection) => {
        if (err) {
            console.error("> Error de conexión: ", err);
            return res.status(500).send('Error al conectar con la base de datos');
        }

        //Obtenemos la jornada de trabajo
        connection.query(query_jornada, [puesto_id], (errorJornada, resultJornada) => {
            if (errorJornada || resultJornada.length === 0) {
                console.error("> Error obteniendo jornada: ", errorJornada);
                connection.release();
                return res.status(500).send('Error al obtener la jornada');
            }

            //Almacenamos las jornadas correspondientes
            jornada_inicio = resultJornada[0].jornada_inicio;
            jornada_final = resultJornada[0].jornada_fin;
            turno = resultJornada[0].turno;

            let op, simbolo;

            if (turno === 'N') {
                op = 'OR';
                simbolo = '';
            } else {
                op = 'AND';
                simbolo = '=';
            }

            //Consulta SQL optimizada
            const query = `
                SELECT 
                    referencia_componente,
                    SUM(cantidad) AS cantidad
                FROM 
                    embalajes
                WHERE 
                    referencia_componente IN (?) AND
                    (hora >${simbolo} ? ${op}
                    hora <${simbolo} ?)
                GROUP BY referencia_componente; 
            `;

            //Ejecutamos consulta combinada
            connection.query(query, [referenciasArray, jornada_inicio, jornada_final], (error, result) => {
                console.log(">>>>> QUERY FINAL:\n", connection.format(query, [referenciasArray, jornada_inicio, jornada_final]));

                connection.release();

                if (error) {
                    console.error("> Error ejecutando la consulta: ", error);
                    return res.status(500).send('Error al obtener los datos');
                }

                console.log("Datos obtenidos:", result);

                //Devolvemos los datos
                res.json(result);
            });
        });
    });
});


/**
 * End point para actualizar las etapas
 */
router.put('/actualizarEtapa/:id_puesto/:operacion/:nuevo_valor/:opcion', (req, res) => {
    const { id_puesto, operacion, nuevo_valor, opcion } = req.params;
    console.log("OPCION: ", opcion, "TIPO: ", typeof opcion);

    // Verificamos que el número de picadas sea mayor que 0
    if (nuevo_valor <= 0) {
        return res.status(400).send('El número de picadas debe ser mayor que 0');
    }

    // Realizamos una consulta para obtener todos los ID de las etapas dentro de la tabla global
    let querySelect = `
        SELECT *
        FROM etapas
        WHERE id_puesto = ? AND operacion = ?
    `;

    // Nos conectamos a la base de datos
    getDBConnection((err, connection) => {
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        // Ejecutamos la consulta SELECT
        connection.query(querySelect, [id_puesto, operacion], (selectError, selectResult) => {
            console.log('QUERY ACTUALIZAR ETAPA PREVIO >>>> ', connection.format(querySelect, [id_puesto, operacion]));

            console.log('> RESULTADOS ACTUALIZAR ETAPA PREVIO: ', selectResult);

            if (selectError) {
                connection.release();
                console.error("> Error al obtener las etapas: ", selectError);
                return res.status(500).send('Error al obtener las etapas');
            }

            // Si no encontramos resultados
            if (selectResult.length === 0) {
                connection.release();
                return res.status(404).send('No se encontraron etapas para el puesto y la operación proporcionados');
            }

            // Recorremos los resultados obtenidos
            selectResult.forEach((row) => {
                const { id, actividad_minutos, cantidad_mover, numero_picadas } = row;

                // Realizamos los cálculos necesarios con el valor de "nuevo"
                const actividad_minutos_picadas = actividad_minutos / nuevo_valor;

                const tiempo_distancia_total = (nuevo_valor * 0.6 * cantidad_mover) / 100;

                const nueva_actividad_en_minutos = actividad_minutos + tiempo_distancia_total;

                const nueva_actividad_en_minutos_picadas = nueva_actividad_en_minutos / numero_picadas;

                let queryUpdate = '', array_argumetos = [];


                if (opcion == 1) {
                    queryUpdate = `
                        UPDATE etapas
                        SET
                            numero_picadas = ?,
                            actividad_minutos_picadas = ?
                        WHERE
                            id = ? AND
                            id_puesto = ? AND
                            operacion = ?
                    `;
                    array_argumetos = [nuevo_valor, actividad_minutos_picadas, id, id_puesto, operacion];
                } else if (opcion == 2) {
                    queryUpdate = `
                        UPDATE etapas
                        SET
                            distancia_total = ?,
                            tiempo_distancia_total = ?,
                            actividad_minutos = ?,
                            actividad_minutos_picadas = ?
                        WHERE
                            id = ? AND
                            id_puesto = ? AND
                            operacion = ?
                    `;
                    array_argumetos = [nuevo_valor, tiempo_distancia_total, nueva_actividad_en_minutos, nueva_actividad_en_minutos_picadas, id, id_puesto, operacion];
                }
                console.log("Query generada:", queryUpdate,
                    "actividad_minutos_picadas:", actividad_minutos_picadas,
                    "tiempo_distancia_total:", tiempo_distancia_total,
                    "nueva_actividad_en_minutos:", nueva_actividad_en_minutos,
                    "nueva_actividad_en_minutos_picadas:", nueva_actividad_en_minutos_picadas
                );

                // Preparamos la consulta para actualizar cada etapa


                // Ejecutamos la consulta UPDATE para cada etapa individualmente
                connection.query(queryUpdate, array_argumetos, (updateError, updateResult) => {
                    console.log('QUERY ACTUALIZAR ETAPA >>>> ', connection.format(queryUpdate, array_argumetos));

                    console.log('> RESULTADOS ACTUALIZAR ETAPA: ', updateResult);

                    if (updateError) {
                        console.error("> Error en la actualización de etapa con id = ", id, updateError);
                    } else {
                        console.log(`Etapa con id_etapa ${id} actualizada correctamente.`);
                    }
                });
            });


            // Liberamos la conexión después de recorrer todas las etapas
            connection.release();

            // Respondemos con éxito
            return res.status(200).send('Etapas actualizadas correctamente');
        });
    });
});


//Exportamos el enrutador
export default router;