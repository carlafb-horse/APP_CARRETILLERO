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

            function insertarPuesto(){
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
            return res.status(400).send('Error en el formato de referencia_embalaje');
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
 * End point para añadir la referencia manual
 */
router.post('/anyadirEtapaManual/:puesto_id/:referencia/:operacion_seleccionada/:mote/:tipo_operacion/:numero_picadas', async (req, res) => {
    //Almacenamos la información de los parámetrod
    const { puesto_id, operacion_seleccionada, mote, tipo_operacion, numero_picadas } = req.params;

    //Decofificamos el diccionario
    let referencia;
    try {
        referencia = JSON.parse(decodeURIComponent(req.params.referencia));
    } catch (error) {
        return res.status(400).send("Error al decodificar la referencia.");
    }

    // reamos la conexión a la base de datos
    const connection = await new Promise((resolve, reject) => {
        getDBConnection((err, conn) => {
            if (err) reject(err);
            else resolve(conn);
        });
    });

    //Almacenamos la key de la referencia
    const keys = Object.keys(referencia);

    //Obtenemos sobre las keys
    for (const referenciaKey of keys) {
        //Almacenamos el valor de cada referencia
        const valor = referencia[referenciaKey];

        //Almacenamos en una variable la consulta SQL para saber si ya existe esa referencia
        const query = `SELECT * FROM x WHERE id_puesto = ? AND referencia_componente = ?`;

        //Ejecutamos la consulta SQL
        connection.query(query, [puesto_id, referenciaKey], (err, rows) => {
            if (err) {
                console.error("Error en la consulta de verificación:", err);
                return;
            }

            if (rows.length > 0) {
                console.log(`Referencia ${referenciaKey} ya existe para id_puesto ${puesto_id}. No se insertará.`);
            } else {
                console.log(`Referencia ${referenciaKey} no existe. Procediendo a insertar.`);

                //Almacenamos los datos para la inserción
                const data = [
                    puesto_id,
                    referenciaKey,
                    valor,
                    operacion_seleccionada,
                    mote,
                    tipo_operacion,
                    numero_picadas
                ];

                //Llamamos a la función para insertar
                anyadirEtapa_Operacion(connection, query, data, operacion_seleccionada);
            }
        });
    }

    //Liberamos la conexión después de finalizar todas las operaciones
    connection.release();

    //Enviamos la respuesta
    return res.status(201).send("End point procesado correctamente");
});

/**
 * End point para añadir una nueva etapa a un puesto BUENO
 */
router.post('/anyadirEtapa-viejo/:puesto_id/:referencia_embalaje/:operacion_seleccionada/:descripcion/:tipo_operacion', (req, res) => {
    //Almacenamos en variables los parámetros
    let { puesto_id, referencia_embalaje, operacion_seleccionada, descripcion, tipo_operacion } = req.params;

    //Almacenamos el diccionario deserializado
    //referencia_embalaje = JSON.parse(decodeURIComponent(referencia_embalaje));

    //Almacenamos en una variable la consulta SQL
    const query = `
        INSERT INTO
            EN_IFM_STANDARD (id_puesto, referencia_componente, cantidad_a_mover, F, comments, distance_empty_zone, number_of_packages_loaded_at_once, loading_type, machine_used, speed, mote, tipo_operacion)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    console.log(
        "Puesto ID: ", puesto_id,
        "\nDiccionario: ", referencia_embalaje,
        "\nOperacion seleccionada: ", operacion_seleccionada,
        "\nDescripcion: ", descripcion
    )

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error...
        if (err) {
            console.log("> Error en la conexión a la base de datos: ", err);
            return res.status(501).send('Error en la conexión a la base de datos');
        }

        //Iteramos el diccionario
        for (const referencia in referencia_embalaje) {
            //Comprobamos que la clave pertenece al objeto
            if (referencia_embalaje.hasOwnProperty(referencia)) {
                console.log(`>>> Clave: ${referencia} \tValor: ${referencia_embalaje[referencia]}`);

                //Ejecutamos la sentencia por cada referencia válida
                connection.query(query, [puesto_id, referencia, referencia_embalaje[referencia], operacion_seleccionada, 'Área de almacenamiento de envases vacíos => Camión', 40, 2, 'Air plane', 1, 12, descripcion, tipo_operacion], (error, result) => {
                    //En caso de ocurra algún error...
                    if (error) {
                        console.log("> Error en la consulta: ", error);
                        res.status(501).send('Error a la hora de añadir la etapa: ', error);
                    }

                    console.log("> Resultados: ", result);
                });
            }
        }

        //Liberamos la conexión
        connection.release();

        //Enviamos el estados
        return res.status(201).send("End point procesado");
    });
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
            connection.query(query, [array_ordenado[index], item[0], item[1]], (error, result) => {
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
router.get('/obtenerEtapas_Puesto/:id_puesto/:nombre_etapa', (req, res) => {
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
                etapas AS e
            INNER JOIN
                operaciones AS o
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
 * End point para obtener el codigo MTM3 usando el ID de la machine used
 */
router.get('/obtenerCodigoMTM3/:machine_used', (req, res) => {
    //Almacenamos la variable de los parámetros
    const machine_used = req.params.machine_used;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que la conexión falle
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                code_MTM3
            FROM
                MTM3
            WHERE 
                id_MTM3 = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [machine_used], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error
            if (error) {
                console.error("> Error: ", error);

                //Devolvemos el estado
                return res.status(501).send("No se pudo procesar la consulta")
            }

            console.log("> Resultados: ", results);

            //Enviamos la información
            return res.json(results);
        })
    });
})

/**
 * End point para obtener el conteo de todas las etapas disponibles
 */
router.get("/conteoFs", (req, res) => {
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
 * End point para obtener las etapas usando el F
 */
router.get(`/obtenerEtapas/:operacion`, (req, res) => {
    //Almacenamos en una variable el F
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
 * End point para obtener los datos de la etapa usando el ID de la misma
 */
router.get('/obtenerInformacionEtapa_Valores/:id_etapa', (req, res) => {
    //Almacenamos el ID de la etapa
    const id_etapa = req.params.id_etapa;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la sentencia SQL
        const query = `
            SELECT 
                cantidad_a_mover, distancia_total, numero_curvas, F
            FROM 
                EN_IFM_STANDARD
            WHERE 
                id = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [id_etapa], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produza un error
            if (error) {
                console.log("> Error: ", error);
                return res.status(500).send('Error en la consulta');
            }

            //Enviamos la información
            res.json(results);
        });
    });
});

/**
 * End point para obtener los detalles de una etapa
 */
router.get('/obtenerInformacionEtapa/:id_etapa', (req, res) => {
    //Almacenamos la variable de los parametros
    const id_etapa = req.params.id_etapa;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL para obtener la información de la etapa
        const query = `
            SELECT
                EI.*,
                MT.*
            FROM
                EN_IFM_STANDARD AS EI
                INNER JOIN MTM3 AS MT ON EI.machine_used = MT.id_MTM3
            WHERE
                EI.id = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [id_etapa], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produza un error
            if (error) {
                console.log("> Error: ", error);
                return res.status(500).send('Error en la consulta');
            }

            console.log("Results: ", results);

            //Enviamos la información
            res.json(results);
        });
    });
});

/**
 * End point para obtener la ruta del puesto
 */
router.get('/obtenerPlano/:puesto_id', (req, res) => {
    //Obtenemos el ID del puesto de los argumentos
    const puesto_id = req.params.puesto_id;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            return res.status(400).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                mapa
            FROM
                puestos
            WHERE 
                id = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [puesto_id], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error...
            if (error) {
                console.error("> Error: ", error);
                return res.status(500).send('Error en la consulta');
            }

            //En cualquier otro caso...
            console.log("> Resultados: ", results);

            //Enviamos la información
            return res.json(results);
        })
    });
});

/**
 * End point para obtener la información del plano (distancia, número de curvas y coordenadas)
 */
router.get('/obtenerInformacionPlano/:id_etapa', (req, res) => {
    //Almacenamos el ID de la etapa
    const id_etapa = req.params.id_etapa;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que produzca un error...
        if (err) {
            return res.status(400).send("Faltan campos en la solicitud");
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT 
                distancia_total,
                numero_curvas,
                puntos,
                numero_cruces,
                numero_puertas
            FROM
                EN_IFM_STANDARD
            WHERE id = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [id_etapa], (error, results) => {
            //En caso de que ocurra un error
            if (error) {
                console.error("> Error: ", error);

                //Enviamos el status
                return res.status(500).send("Error en la consulta");

                //En cualquier otro caso...
            } else {
                console.log("> Results: ", results);

                //Enviamos la información
                res.json(results);
            }
        });
    });
});

/**
 * End point para añadir una unión entre etapas
 */
router.post('/anyadirDesplazamientoZona/:id_puesto/:distancia_total/:numero_curvas/:puntos/:numero_cruces/:numero_puertas/:frecuencia_recorrido/:maquina_usada/:velocidad/:descripcion', (req, res) => {
    /** Almacenamos las variables */
    const { id_puesto, distancia_total, numero_curvas, puntos, numero_cruces, numero_puertas, frecuencia_recorrido, maquina_usada, velocidad, descripcion } = req.params;

    //Creamos una variable para almacenar el ID de la máquina usada
    let maquina_id;

    console.log("> Datos obtenidos: \n", id_puesto, distancia_total, numero_curvas, puntos, numero_cruces, numero_puertas, frecuencia_recorrido)

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            return res.status(501).send('Error al conectar a la base de datos');
        }

        //Almacenamos en una variable la consulta SQL para obtener el ID de la máquina
        const query = `
            SELECT
                id_MTM3
            FROM
                MTM3
            WHERE
                engins = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [maquina_usada], (error, results) => {
            //En caso de que se produzca un error
            if (error) {
                console.log("> Error: ", error);
            }

            //Almacenamos el ID de la máquina usada
            maquina_id = results[0].id_MTM3;

            //Almacenamos en una variable la siguiente consulta
            const query = `
                INSERT INTO
                    EN_IFM_STANDARD (id_puesto, F, machine_used, speed, distancia_total, numero_curvas, puntos, mote, numero_cruces, numero_puertas, frecuencia_recorrido)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            //Ejecutamos la consulta
            connection.query(query, [id_puesto, "X", maquina_id, velocidad, distancia_total, numero_curvas, puntos, descripcion, numero_cruces, numero_puertas, frecuencia_recorrido], (error, results) => {
                //En caso de que se produzca un error
                if (error) {
                    console.log("> Error: ", error)

                    //Enviamos el status
                    return res.status(501).send("Error en la consulta");
                }

                console.log("> Results: ", results);

                //Enviamos el status
                return res.status(201).send('Unión añadido');
            });
        });
    });
});

/**
 * End point para actualizar la información del plano usando el ID del puesto y la informacion
 */
router.post('/actualizarInformacionMapa/:id_puesto/:totalDistanceMeters/:curveCount/:puntosJSON/:numero_cruces/:numero_puertas/:etapa_nombre', (req, res) => {
    //Almacenamos la informacion en las variables
    let { id_puesto, totalDistanceMeters, curveCount, puntosJSON, numero_cruces, numero_puertas, etapa_nombre } = req.params;

    //Variable para almacenar la consulta
    let query;

    //Controlamos los valores de los campos necesarios
    if (!id_puesto || !totalDistanceMeters || !curveCount || !numero_cruces || !numero_puertas || !etapa_nombre) {
        return res.status(400).send("Faltan campos en la solicitud");
    }

    /** Convertimos los valores a NULL en caso de que esten vacios */
    totalDistanceMeters = totalDistanceMeters === 'null' ? 0 : totalDistanceMeters;
    curveCount = curveCount === 'null' ? 0 : curveCount;
    puntosJSON = puntosJSON === 'null' ? 0 : puntosJSON;
    numero_cruces = numero_cruces === 'null' ? 0 : numero_cruces;
    numero_puertas = numero_puertas === 'null' ? 0 : numero_puertas;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            res.status(500).send("Error al conectar a la base de datos");
        }

        //Almacenamos en una variable la consulta SQL
        query = `
            UPDATE
                EN_IFM_STANDARD
            SET
                distancia_total = ?,
                numero_curvas = ?,
                puntos = ?,
                numero_cruces = ?,
                numero_puertas = ?
            WHERE
                id_puesto = ? AND F = ?
            `;

        //Ejecutamos la consulta
        connection.query(query, [totalDistanceMeters, curveCount, puntosJSON, numero_cruces, numero_puertas, id_puesto, etapa_nombre], (error, results) => {
            //Liberamos la conexion
            connection.release();

            //En caso de que se produzca un error...
            if (error) {
                console.error("> Error: ", error);

                //Enviamos el estado
                return res.status(501).send("Error en la consulta");

                //En cualquier otro caso...
            } else {
                console.log("> Result: ", results);

                //Enviamos el estado
                return res.status(201).send("Información del mapa actualizada");
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
                e.id_puesto, o.nombre, o.color, SUM(e.cantidad_mover) AS cantidad_mover, COALESCE(SUM(e.distancia_total), 0) AS distancia_total, SUM(e.PS14) AS PS14, 
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
 * End point para obener el conteo de Fs usando el ID del puesto
 */
/*router.get('/tiempoTotal/:id_puesto', (req, res) => {
    //Almacenamos el ID del puesto de los parámetros
    const id_puesto = req.params.id_puesto;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra un error
        if (err) {
            return res.status(400).send("Error al conectar con la base de datos");
        }

        //Almacenamos en una variable la consulta SQL
        const query = `
            SELECT
                SUM(actividad_en_minutos + nuevo_picadas)
            FROM 
                EN_IFM_STANDARD
            WHERE
                id_puesto = ?
        `;

        //Ejecutamos la consulta
        connection.query(query, [id_puesto], (error, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error
            if (error) {
                console.log("Error: ", error);

                return res.status(500).send('Error en la consulta');
            }

            console.log("> Resultados: ", results);

            //Enviamos la información
            res.json(results);
        })
    });
});*/

/**
 * End point para obtener los datos de: dinámico - No VA //dinámico - VA //estático - VA
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
 * End point para obtener la cantidad de UM a mover usando la referencia del componente
 */
router.get('/conteoUM/:referencia_componente', (req, res) => {
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
 * End point para obtener la cantidad de veces que tienen que mover un componente
 */
router.get('/getPackingQuantity/:referencia_componente/:linea', (req, res) => {
    //Almacenamos las variables necesarias por parámetros
    const { referencia_componente, linea } = req.params;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra un error
        if (err) {
            return res.status(400).send("Error al conectar con la base de datos");
        }

        //Primera consulta SQL para obtener datos
        const query1 = `
            SELECT 
                Film.numero_of,
                Film.referencia, 
                Film.fecha_of_lanzado,
                Film.fecha_of_acabado, 
                Film.linea,
                Coefficient_allComponents.reference_motor, 
                Coefficient_allComponents.reference_composant, 
                Coefficient_allComponents.coefficient_montage_BE, 
                Coefficient_allComponents.designation_longue
            FROM 
                Film
            INNER JOIN 
                Coefficient_allComponents ON Film.referencia = Coefficient_allComponents.reference_motor
            WHERE 
                Coefficient_allComponents.reference_composant = ?
                AND Film.linea = ?
            ORDER BY 
                Film.fecha_of_lanzado DESC
        `;

        //Ejecutamos la primera consulta
        connection.query(query1, [referencia_componente, linea], (err1, result1) => {
            if (err1) {
                console.error("> Error al obtener los datos: ", err1);
                connection.release();
                return res.status(500).json({ error: 'Error al obtener los datos' });
            }

            //Segunda consulta SQL para contar los resultados
            const query2 = `
                SELECT COUNT(Coefficient_allComponents.id) AS total_resultados
                FROM 
                    Film
                INNER JOIN 
                    Coefficient_allComponents ON Film.referencia = Coefficient_allComponents.reference_motor
                WHERE 
                    Coefficient_allComponents.reference_composant = ?
                    AND Film.linea = ?
            `;

            //Ejecutamos la segunda consulta
            connection.query(query2, [referencia_componente, linea], (err2, result2) => {
                if (err2) {
                    console.error("> Error al obtener el contador: ", err2);
                    connection.release();
                    return res.status(500).json({ error: 'Error al obtener el conteo' });
                }

                //Tercera consulta SQL para obtener referencias adicionales
                const query3 = `
                    SELECT
                        Film.referencia,
                        Film.linea,
                        Coefficient_allComponents.*
                    FROM
                        Film
                    INNER JOIN 
                        Coefficient_allComponents ON Film.referencia = Coefficient_allComponents.reference_motor
                    WHERE
                        Film.linea = ?
                        AND Coefficient_allComponents.reference_motor = ? 
                `;

                //Ejecutamos la tercera consulta
                connection.query(query3, [linea, referencia_componente], (err3, result3) => {
                    //Liberamos la conexión
                    connection.release();

                    if (err3) {
                        console.error("> Error al obtener las referencias: ", err3);
                        return res.status(500).json({ error: 'Error al obtener referencias' });
                    }

                    //Almacenamos en una variable los resultados obtenidos
                    const total_resultados = result2[0]?.total_resultados || 0;

                    //Creamos la respuesta con los datos obtenidos
                    const response = {
                        total_resultados,
                        data: result3
                    };

                    console.log("> Resultados obtenidos: ", response);

                    //Enviamos la información
                    res.json(response);
                });
            });
        });
    });
});

/**
 * End point para obtener los componentes de una línea
 */
router.get('/getComponents/:linea', (req, res) => {
    //Almacenamos en variables la línea
    const linea = req.params.linea;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error
        if (err) {
            return res.status(500).send('Error al conectar con la base de datos');
        }

        //Almacenamos en una variable la primera consulta para obtener las referencias
        const query_references = `
            SELECT
                DISTINCT(Coefficient_allComponents.reference_motor)
            FROM
                Film
            INNER JOIN 
                Coefficient_allComponents ON Film.referencia = Coefficient_allComponents.reference_motor
            WHERE
                Film.linea = ?
        `;

        //Ejecutamos la primera consulta SQL
        connection.query(query_references, [linea], (err1, result1) => {
            //En caso de que se produzca un error
            if (err1) {
                console.error("> Error al obtener las referencias: ", err1);

                //Liberamos la conexión
                connection.release();

                //Enviamos el status
                return res.status(500).send("Error al obtener las referencias");
            }

            //Almacenamos en una nueva variable la segunda consulta SQL para obtener los componentes
            const query_components = `
                SELECT
                    DISTINCT(Coefficient_allComponents.reference_composant)
                FROM
                    Film
                INNER JOIN 
                    Coefficient_allComponents ON Film.referencia = Coefficient_allComponents.reference_motor
                WHERE
                    Film.linea = ?
            `;

            //Ejecutamos la segunda consulta SQL
            connection.query(query_components, [linea], (err2, result2) => {
                //En caso de que se produzca un error
                if (err2) {
                    console.error("> Error al obtener los componentes: ", err2);

                    //Liberamos la conexión
                    connection.release();

                    //Enviamos el status
                    return res.status(500).send("Error al obtener los componentes");
                }

                //Liberamos la conexión
                connection.release();

                //Almacenamos en una variable los datos obtenidos
                const response = {
                    data_reference: result1,
                    data_components: result2
                };

                //Enviamos la información obtenida
                res.json(response);
            });
        });
    });
});

/**
 * End point para obtener el conteo de los componentes
 */
router.get('/getCountComponents/:reference_motor/:reference_composant', (req, res) => {
    //Obtenemos las variables de los parametros
    const { reference_motor, reference_composant } = req.params;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra un error
        if (err) {
            return res.status(400).send("No se ha podido conectarse a la base de datos");
        }

        //Almacenamoos en una variable la consulta SQL
        const query = `
            SELECT COUNT(id) AS count
            FROM Coefficient_allComponents
            WHERE reference_motor = ? AND reference_composant = ?
        `;

        //Ejecutamos la consulta SQL
        connection.query(query, [reference_motor, reference_composant], (err, results) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca un error
            if (err) {
                console.error("> Error al obtener los datos: ", err);
            }

            //Enviamos la información
            res.json({ count: results[0].count });
        });
    });
});



/**
 * End point para actualizar la etapa usando el ID del puesto, la información obtenida del modal y el F
 */
router.post('/actualizarInformacionEtapa/:puestoID/:distance_empty_zone/:number_packages_at_once/:loading_type/:machine_used/:speed/:fStandard', (req, res) => {
    //Obtenemos las variables de los parametros
    const { puestoID, distance_empty_zone, number_packages_at_once, loading_type, machine_used, speed, fStandard } = req.params;

    console.log(">>>>>>>>> Machine USED: ", machine_used);

    //Creamos una variable donde almacenara el ID de del machine used
    let machineID;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra un error...
        if (err) {
            return res.status(400).send("No se ha podido conectarse a la base de datos");
        }

        //Ejecutamos la query para obtener el ID del machine usando el valor
        connection.query("SELECT id_MTM3 FROM MTM3 WHERE engins = ?", [machine_used], (error, results) => {
            //En caso de que se produzca un error...
            if (error) {
                console.log("> Error: ", error)
            }

            //Almacenamos el ID del machine
            machineID = results[0].id_MTM3;

            //Almacenamos en una variable la consulta SQL
            const query = `
                UPDATE 
                    EN_IFM_STANDARD
                SET
                    distance_empty_zone = ?,
                    number_of_packages_loaded_at_once = ?,
                    loading_type = ?,
                    machine_used = ?,
                    speed = ?
                WHERE
                    F = ? AND id = ?
            `;

            //Ejecutamos la consulta
            connection.query(query, [distance_empty_zone, number_packages_at_once, loading_type, machineID, speed, fStandard, puestoID], (error, results) => {
                //Liberamos la conexión
                connection.release();

                //En caso de que ocurra algun error
                if (error) {
                    console.log("> Error: ", error);

                    //Enviamos el status
                    return res.status(500).send("Error al obtener las referencias");

                    //En cualquier otro caso...
                } else {
                    console.log("> Resultados: ", results);

                    //Enviamos el status
                    return res.status(201).send('Puesto añadido');
                }
            })
        })
    });
});

/**
 * End point para eliminar un registros en especifico
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
            if(!isNaN(control)){
                query = `
                    DELETE 
                    FROM
                        ${tabla}
                    WHERE
                        id = ?
                `;
                array_argumetos = [id_elemento];
            } else if(isNaN(control)){
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
 * End point para gestionar la etapa
 */
router.post('/gestionarEtapa/:id_etapa/:id_puesto/:gestion', (req, res) => {
    console.log("> Dentro del gestionar etapa");

    /** Almacenamos las variables de los parámetros */
    const { id_etapa, id_puesto, gestion } = req.params;

    console.log("> ID etapa: ", id_etapa, "\tID puesto: ", id_puesto, "\nGestion: ", gestion);

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que se produzca un error...
        if (err) {
            console.error("> Error al conectar a la base de datos:", err);
            return res.status(500).send('Error al conectar a la base de datos');
        }

        //Creamos la variable que contendrá la sentencia SQL
        let query;

        //Creamos un switch para la gestión
        switch (gestion) {
            case "copiar":
                //Almacenamos en la variable la consulta
                query = `
                    CREATE TEMPORARY TABLE temp_table
                    SELECT
                        id_puesto,
                        referencia_componente,
                        linea,
                        cantidad_a_mover,
                        F,
                        comments,
                        distance_empty_zone,
                        number_of_packages_loaded_at_once,
                        loading_type,
                        machine_used,
                        speed,
                        distancia_total,
                        numero_curvas,
                        puntos,
                        mote,
                        numero_cruces,
                        numero_puertas,
                        TL_TV,
                        CDVB_CDL,
                        nuevo,
                        NC,
                        NP,
                        frecuencia_recorrido,
                        PS10,
                        PS14,
                        simbolo_especial,
                        valor_simbolo_especial,
                        tipo_operacion,
                        distancia_F5,
                        acceso_al_camion_F5,
                        embalaje_descargado_F5,
                        DC221,
                        TC_TL,
                        DS10,
                        CDL,
                        CCPE,
                        distancia,
                        numero_bultos_por_pila,
                        altura_embalaje,
                        almacenamiento_emlabajes_mediante,
                        en_la_tienda_pila,
                        soporte_embalaje,
                        TC,
                        TL,
                        CT10,
                        PP1,
                        CDC,
                        distancia_tren,
                        distancia_almacenamiento,
                        numero_bases_rodantes,
                        M1,
                        DL,
                        CDV,
                        PDU34,
                        PPU34,
                        TV,
                        PPD32,
                        PDD34,
                        PPU43,
                        PDU44,
                        CHMAN,
                        CHMAN_2,
                        CHMAN_3,
                        PS15,
                        DI21,
                        DC113,
                        numero_picadas,
                        DS14,
                        DS15,
                        DC,
                        D1,
                        W5,
                        TT,
                        AL,
                        P2,
                        L2,
                        G1,
                        P5,
                        G1_1,
                        P2_1,
                        W5_2,
                        nuevo_picadas,
                        actividad_en_minutos,
                        tiempo_distancia_total,
                        orden
                    FROM
                        EN_IFM_STANDARD
                    WHERE
                        id = ?;

                UPDATE
                    temp_table
                SET
                    id_puesto = ?;

                INSERT INTO
                    EN_IFM_STANDARD (
                        id_puesto,
                        referencia_componente,
                        linea,
                        cantidad_a_mover,
                        F,
                        comments,
                        distance_empty_zone,
                        number_of_packages_loaded_at_once,
                        loading_type,
                        machine_used,
                        speed,
                        distancia_total,
                        numero_curvas,
                        puntos,
                        mote,
                        numero_cruces,
                        numero_puertas,
                        TL_TV,
                        CDVB_CDL,
                        nuevo,
                        NC,
                        NP,
                        frecuencia_recorrido,
                        PS10,
                        PS14,
                        simbolo_especial,
                        valor_simbolo_especial,
                        tipo_operacion,
                        distancia_F5,
                        acceso_al_camion_F5,
                        embalaje_descargado_F5,
                        DC221,
                        TC_TL,
                        DS10,
                        CDL,
                        CCPE,
                        distancia,
                        numero_bultos_por_pila,
                        altura_embalaje,
                        almacenamiento_emlabajes_mediante,
                        en_la_tienda_pila,
                        soporte_embalaje,
                        TC,
                        TL,
                        CT10,
                        PP1,
                        CDC,
                        distancia_tren,
                        distancia_almacenamiento,
                        numero_bases_rodantes,
                        M1,
                        DL,
                        CDV,
                        PDU34,
                        PPU34,
                        TV,
                        PPD32,
                        PDD34,
                        PPU43,
                        PDU44,
                        CHMAN,
                        CHMAN_2,
                        CHMAN_3,
                        PS15,
                        DI21,
                        DC113,
                        numero_picadas,
                        DS14,
                        DS15,
                        DC,
                        D1,
                        W5,
                        TT,
                        AL,
                        P2,
                        L2,
                        G1,
                        P5,
                        G1_1,
                        P2_1,
                        W5_2,
                        nuevo_picadas,
                        actividad_en_minutos,
                        tiempo_distancia_total,
                        orden
                    )
                SELECT
                    *
                FROM
                    temp_table;

                DROP TABLE temp_table
                `;

                //Ejecutamos la consulta
                connection.query(query, [id_etapa, id_puesto], (error, results) => {
                    //Liberamos la conexión
                    connection.release();

                    //En caso de que falle
                    if (error) {
                        console.error("> Error en la consulta:", error);

                        //Enviamos el status
                        return res.status(501).send('Error en la consulta');
                    }

                    console.log("> Results: ", results);

                    //Enviamos el status
                    return res.status(201).send('Etapa gestionada');
                });
                break;

            //En caso de que haya que mover la etapa
            case "mover":
                //Almacenamos en una variable la consulta
                query = `
                    CREATE TEMPORARY TABLE temp_table
                    SELECT
                        id_puesto,
                        referencia_componente,
                        linea,
                        cantidad_a_mover,
                        F,
                        comments,
                        distance_empty_zone,
                        number_of_packages_loaded_at_once,
                        loading_type,
                        machine_used,
                        speed,
                        distancia_total,
                        numero_curvas,
                        mote,
                        numero_cruces,
                        numero_puertas,
                        TL_TV,
                        CDVB_CDL,
                        NC,
                        NP,
                        frecuencia_recorrido,
                        PS10,
                        PS14,
                        simbolo_especial,
                        valor_simbolo_especial,
                        tipo_operacion,
                        distancia_F5,
                        acceso_al_camion_F5,
                        embalaje_descargado_F5,
                        DC221,
                        TC_TL,
                        DS10,
                        CDL,
                        CCPE,
                        distancia,
                        numero_bultos_por_pila,
                        altura_embalaje,
                        almacenamiento_emlabajes_mediante,
                        en_la_tienda_pila,
                        soporte_embalaje,
                        TC,
                        TL,
                        CT10,
                        PP1,
                        CDC,
                        distancia_tren,
                        distancia_almacenamiento,
                        numero_bases_rodantes,
                        M1,
                        DL,
                        CDV,
                        PDU34,
                        PPU34,
                        TV,
                        PPD32,
                        PDD34,
                        PPU43,
                        PDU44,
                        CHMAN,
                        CHMAN_2,
                        CHMAN_3,
                        PS15,
                        DI21,
                        DC113,
                        numero_picadas,
                        DS14,
                        DS15,
                        DC,
                        D1,
                        W5,
                        TT,
                        AL,
                        P2,
                        L2,
                        G1,
                        P5,
                        G1_1,
                        P2_1,
                        W5_2,
                        nuevo_picadas,
                        nuevo,
                        actividad_en_minutos,
                        tiempo_distancia_total,
                        orden
                    FROM
                        EN_IFM_STANDARD
                    WHERE
                        id = ?;

                    UPDATE
                        temp_table
                    SET
                        id_puesto = ?;

                    INSERT INTO
                        EN_IFM_STANDARD (
                            id_puesto,
                            referencia_componente,
                            linea,
                            cantidad_a_mover,
                            F,
                            comments,
                            distance_empty_zone,
                            number_of_packages_loaded_at_once,
                            loading_type,
                            machine_used,
                            speed,
                            distancia_total,
                            numero_curvas,
                            mote,
                            numero_cruces,
                            numero_puertas,
                            TL_TV,
                            CDVB_CDL,
                            NC,
                            NP,
                            frecuencia_recorrido,
                            PS10,
                            PS14,
                            simbolo_especial,
                            valor_simbolo_especial,
                            tipo_operacion,
                            distancia_F5,
                            acceso_al_camion_F5,
                            embalaje_descargado_F5,
                            DC221,
                            TC_TL,
                            DS10,
                            CDL,
                            CCPE,
                            distancia,
                            numero_bultos_por_pila,
                            altura_embalaje,
                            almacenamiento_emlabajes_mediante,
                            en_la_tienda_pila,
                            soporte_embalaje,
                            TC,
                            TL,
                            CT10,
                            PP1,
                            CDC,
                            distancia_tren,
                            distancia_almacenamiento,
                            numero_bases_rodantes,
                            M1,
                            DL,
                            CDV,
                            PDU34,
                            PPU34,
                            TV,
                            PPD32,
                            PDD34,
                            PPU43,
                            PDU44,
                            CHMAN,
                            CHMAN_2,
                            CHMAN_3,
                            PS15,
                            DI21,
                            DC113,
                            numero_picadas,
                            DS14,
                            DS15,
                            DC,
                            D1,
                            W5,
                            TT,
                            AL,
                            P2,
                            L2,
                            G1,
                            P5,
                            G1_1,
                            P2_1,
                            W5_2,
                            nuevo_picadas,
                            nuevo,
                            actividad_en_minutos,
                            tiempo_distancia_total,
                            orden
                        )
                    SELECT
                        *
                    FROM
                        temp_table;

                    DROP TABLE temp_table;

                    DELETE FROM
                        EN_IFM_STANDARD
                    WHERE
                        id = ?
                `;

                //Ejecutamos la consulta
                connection.query(query, [id_etapa, id_puesto, id_etapa], (error, results) => {
                    //Liberamos a conexión
                    connection.release();

                    //En caso de que falle
                    if (error) {
                        console.error("> Error en la consulta:", error);

                        //Enviamos el status
                        return res.status(501).send('Error en la consulta');
                    }

                    //Enviamos el status
                    return res.status(201).send('Etapa gestionada');
                })
                break;

            default:
                //Liberamos la conexión si no hay una acción válida
                connection.release();
                return res.status(400).send('Gestión no válida');
        }
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
 * End point para obtener las referencias de un puesto
 */
router.get('/obtenerReferencias-puesto/:puesto_id', (req, res) => {
    //Almacenamos el ID del puesto
    const puesto_id = req.params.puesto_id;

    //Almacenamos en una variable la consulta
    const query = `
        SELECT 
            DISTINCT(referencia_componente), tipo_operacion
        FROM 
            EN_IFM_STANDARD
        WHERE
            id_puesto = ? AND tipo_operacion = 'Programa_Recepcion'
    `;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error en la conexión a la base de datos
        if (err) {
            console.error("> Error en la conexión a la base de datos: ", err);
            return res.status(500).send('Error al conectar con la base de datos');
        }

        //Ejecutamos la consutlta
        connection.query(query, [puesto_id], (error, result) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que ocurra algun error
            if (error) {
                console.error("> Error a la hora de obtener las referencias del puesto: ", error);
                return res.status(500).send('Error a la hora de obtener las referencias del puesto');
            }

            console.log("> Resultados: ", result);

            //Enviamos la información
            return res.json(result);
        });
    });
});

/**
 * End point para obtener los datos de las referencias del tipo de operación
 */
router.get('/obtenerDatosDetalladosReferencia-tipoOperacion/:puesto_id/:referencia/:tipo_operacion', (req, res) => {
    //Almacenamos las variables de los parámetros
    const { puesto_id, referencia, tipo_operacion } = req.params;

    //Creamos dos variables globales para almacenar la jornada de inicio y la jornada de finalización
    let jornada_inicio, jornada_finalizacion;

    //Almacenamos en una variable la consulta SQL para obtener la jornada de inicio y la jornada de finalización
    const query = `
        SELECT 
            t.jornada_inicio,
            t.jornada_fin 
        FROM
            puestos p
        INNER JOIN
            turnos t 
        ON 
            p.id_turno = t.id
        WHERE
            p.id = ?
    `;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error
        if (err) {
            console.error("> Error en la conexión a la base de datos: ", err);
            return res.status(500).send('Error al conectar con la base de datos');
        }

        //Ejecutamos la consulta
        connection.query(query, [puesto_id], (error1, result1) => {
            //En caso de que ocurra algun error en la consulta para obtener los turnos...
            if (error1) {
                console.error("> Error en la consulta para obtener la jornada de inicio y la jornad de finalización: ", error1);
                res.status(501).send('Error en la consulta de obtención de horarios');
            }

            console.log("> Result1: ", result1);

            //Almacenamos en las variables la jornada de inicio y la jornada de finalización
            jornada_inicio = result1[0].jornada_inicio;
            jornada_finalizacion = result1[0].jornada_fin;

            //Almacenamos en una nueva variable la nueva consulta SQL para obtener las cantidadades y las fechas por cada referencia
            const query = `
                SELECT
                    date_de_calcul_du_pgm_de_reception
                FROM ??
                WHERE
                    reference = ? AND
                    heure_de_la_periode >= ? AND
                    heure_de_la_periode <= ?
            `;

            //Ejecutamos la consulta SQL
            connection.query(query, [tipo_operacion, referencia, jornada_inicio, jornada_finalizacion], (error, result) => {
                //En caso de que ocurra algun error con la consulta...
                if (error) {
                    console.error("> Error en la consulta final: ", error);
                    res.status(501).send('Error en la consulta final: ', error);
                }

                console.log("> Result: ", result);

                //Enviamos la información
                res.json(result);
            });
        });
    });
});

/**
 * End point para obtener la suma total de la cantidad a expedir
 */
router.get('/cantidadExpedir/:referencia/:tipo_operacion', (req, res) => {
    //Almacenamos las variabes variables de los parámetros
    const { referencia, tipo_operacion } = req.params;

    //Almacenamos en una variable la consulta SQL
    const query = `
        SELECT
            SUM(??)/15 AS cantidad_expedir
        FROM
            ??
        WHERE
            compte_fournisseur  = ?
            AND reference = ?
    `;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error
        if (err) {
            console.error("> Se ha producido un error: ", err);
            res.status(501).send('Error a la hora de obtener la cantidad a expedir ', err);
        }

        //Ejecutamos la consulta
        connection.query(query, [columna, tipo_operacion, planta, referencia], (error, result) => {
            //Liberamos la conexion
            connection.release();

            //En caso de que produzca un error...
            if (error) {
                console.error("> Error a la hora de obtener la cantidad a expedir: ", error);
                return res.status(501).send("Error a la hora de obtener la cantidad a expedir: ", error);
            } else {
                console.log("Resultados Q: ", result);

                //Verificamos que el resultado contenga datos
                if (result && result[0]) {
                    //Enviamos la respuesta
                    return res.json({ cantidad_expedir: result[0].cantidad_expedir });
                } else {
                    //Si no se encontraron resultados
                    return res.status(404).send('No se encontraron datos para la referencia solicitada.');
                }
            }
        });
    })
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
            puestos p
        INNER JOIN
            turnos t
        ON
            p.id_turno = t.id
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
 * End point para obtener las fechas de inicio y fin de la toma de datos usando el programa de 
 */
router.get('/fechaTomaDatos', (req, res) => {
    //Creamos las variables para almacenar las fechas de inicio y fin
    let fecha_inicio, fecha_fin;

    //Creamos la conexión
    getDBConnection((err, connection) => {
        //En caso de que ocurra algún error
        if (err) {
            console.error("> Error en la conexión a la base de datos: ", err);
            res.status(501).send('Error en la conexión a la base de datos');
        }

        //Ejecutamos la query para obtener la fecha de inicio 
        connection.query("SELECT date_de_la_periode AS fecha_inicio FROM Programa_Recepcion pr ORDER BY date_de_la_periode ASC LIMIT 1", [], (error1, result1) => {
            if (error1) {
                console.error("> Error a la hora de obtener la fecha de inicio: ", error1);
                res.status(501).send('Error a la hora de obtener la fecha de inicio');
            }

            console.log("> Resultado1: ", result1);

            //Almacenamos la fecha de inicio
            fecha_inicio = result1[0].fecha_inicio;

            //Ejecutamos la query para obtener la fecha final
            connection.query("SELECT date_de_la_periode AS fecha_fin FROM Programa_Recepcion pr ORDER BY date_de_la_periode DESC LIMIT 1", [], (error2, result2) => {
                //En caso de que ocurra algun error...
                if (error2) {
                    console.error("> Error a la hora de obtener la fecha final: ", error2);
                    res.status(501).send('Error a la hora de obtener la fecha de fin');
                }

                //Liberamos la conexión
                connection.release();

                console.log("> Resultado2: ", result2);

                //Almacenamos la fecha final
                fecha_fin = result2[0].fecha_fin;

                //Enviamos la información
                res.json({ fecha_inicio, fecha_fin });
            });
        });
    });
});

/**
 * End point para obtener el número de embalajes
 */
router.get('/obtenerEmbalajes/:referencia', (req, res) => {
    //Almacenamos en variables los parámetros
    const { referencia } = req.params;

    const referenciasArray = referencia.split(',');

    //Creamos una variable para almacenar el nombre de la columna
    let columna = "", columna_fabrica = "";

    //Almacenamos en una variable la consulta SQL
    const query = `
        SELECT
            referencia_componente, SUM(cantidad) as cantidad
        FROM
            embalajes
        WHERE
            referencia_componente IN (?)
        GROUP BY
            referencia_componente;
    `;


    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error...
        if (err) {
            console.error("> Se ha producido un error a la hora de conectarse a la base de datos: ", err);
            res.status(501).send("Error a la hora de establecer la conexión");
        }

        //Ejecutamos la consulta
        connection.query(query, [referenciasArray], (error, result) => {
            console.log(">>>>> OBTENER EMBALAJES\n", connection.format(query, [referenciasArray]));

            //Liberamos la conexión
            connection.release();

            //En caso de que se produzca algun error
            if (error) {
                console.error("> Error en la consulta: ", error);

                //Devolvemos el status
                return res.status(501).send('Error a la hora de obtener el valor del tipo de carga: ', error);

            } else {
                //En caso de que no haya valor de carga
                if (result.length === 0 || result[0].cantidad === undefined) {
                    //Enviamos ek status
                    return res.status(501).send('No se encontró el valor de carga');

                    //En otro caso...
                } else {
                    //Enviamos la información
                    console.log("> Results: ", result);

                    return res.json({ cantidad: result[0].cantidad });
                }
            }
        });
    });
});

/**
 * End point para obtener la fecha de una referencia
 */
router.get('/obtenerFechas-Programa-Recepcion/:referencia/:tipo_operacion', (req, res) => {
    //Almacenamos las variables de los parámetros
    const { referencia, tipo_operacion } = req.params;

    //Cremos las variables para almacenar el nombre de la columna que contiene la fecha
    let columna_fecha;

    //Controlamos el tipo de operación para almacenar el nombre de la columna
    if (tipo_operacion === 'Programa_Recepcion') {
        columna_fecha = 'date_de_la_periode';
    }

    //Almacenamos en una variable la consulta SQL
    const query = `
        SELECT 
            ?? AS fecha
        FROM
            ??
        WHERE
            reference = ?
    `;

    //Creamos la conexión a la base de datos
    getDBConnection((err, connection) => {
        //En caso de que ocurra algún error...
        if (err) {
            console.error("> Error en la conexión a la base de datos: ", err);
            res.status(501).send('Error en la conexión a la base de datos');
        }

        //Ejecutamos la consulta SQL para obtener las fechas
        connection.query(query, [columna_fecha, tipo_operacion, referencia], (error, result) => {
            //En caso de que ocurra un error en la consulta...
            if (error) {
                console.error("> Error en la consulta: ", error);
                return res.status(501).send('Error a la hora de ejecutar la consulta');
            }

            console.log("> Resultado: ", result);

            //Enviamos los datos
            return res.json(result);
        });
    });
});

router.get('/obtenerCantidad-grafico/:referencia/:fecha/:puesto_id', (req, res) => {
    const { referencia, fecha, puesto_id } = req.params;

    getDBConnection((err, connection) => {
        connection.query("SELECT quantite_de_forcage FROM Programa_Recepcion WHERE reference = ? AND date_de_la_periode = ?", [referencia, fecha], (error, result) => {
            return res.json(result);
        });
    });
})

/**
 * End point para obtener el primer día
 */
router.get(`/obtenerPrimerDia/:tipo_operacion`, (req, res) => {
    //Almacenamos la variable de los parámetros
    const tipo_operacion = req.params.tipo_operacion;

    //Almacenamos en una variable la query
    const query = `
        SELECT 
            date_expedition AS primer_dia
        FROM
            ??
        ORDER BY
            date_expedition ASC LIMIT 1
    `;

    //Obtenemos la conexión
    getDBConnection((err, connection) => {
        //En caso de que ocurra algun error en la conexión a la base de datos
        if (err) {
            console.error("> Error en la conexión con la base de datos");
            res.status(501).send("Error en la conexión con la base de datos");
        }

        //Ejecutamos la consulta SQL
        connection.query(query, [tipo_operacion], (error, result) => {
            //Liberamos la conexión
            connection.release();

            //En caso de que ocurrar algún error en la consulta
            if (error) {
                console.error("> Error a la hora de obtener el primer día: ", error);
                return res.status(501).send("Error en la consulta");
            }

            console.log("> Resulltados: ", result);

            //Enviamos la primeora fecha
            return res.json(result);
        });
    })
});

/**
 * End point para obtener las referencias disponibles para disponerlas en el modal de buscador de referencias
 */
router.get('/obtener-referencias/:id_puesto', (req, res) => {
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

            if(turno === 'N'){
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
router.put('/actualizarOrden/:array_ordenado', (req, res) => {
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
});

/**
 * End ponint para obtener los datos para subir la etapa a un puesto
 */
router.get('/obtenerDatos/:referencia/:puesto_id', (req, res) => {
    //Almacenamos los datos de los parámetros
    const { tipo_carga, planta, referencia, tipo_operacion, puesto_id } = req.params;

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

            if(turno === 'N'){
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
router.put('/actualizarEtapa/:id_puesto/:operacion/:nuevo_numero_picadas', (req, res) => {
    const { id_puesto, operacion, nuevo_numero_picadas } = req.params;

    // Verificamos que el número de picadas sea mayor que 0
    if (nuevo_numero_picadas <= 0) {
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
                const { id, actividad_minutos } = row;
                console.log('ID de la etapa: ', id);
                console.log('Actividad en minutos: ', actividad_minutos);

                // Realizamos los cálculos necesarios con el valor de "nuevo"
                const actividad_minutos_picadas = actividad_minutos / nuevo_numero_picadas;
                console.log('Actividad en minutos por picada: ', actividad_minutos_picadas);

                // Preparamos la consulta para actualizar cada etapa
                let queryUpdate = `
                    UPDATE etapas
                    SET
                        numero_picadas = ?,
                        actividad_minutos_picadas = ?
                    WHERE
                        id = ? AND
                        id_puesto = ? AND
                        operacion = ?
                `;

                // Ejecutamos la consulta UPDATE para cada etapa individualmente
                connection.query(queryUpdate, [nuevo_numero_picadas, actividad_minutos_picadas, id, id_puesto, operacion], (updateError, updateResult) => {
                    console.log('QUERY ACTUALIZAR ETAPA >>>> ', connection.format(queryUpdate, [nuevo_numero_picadas, actividad_minutos_picadas, id, id_puesto, operacion]));
                    
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