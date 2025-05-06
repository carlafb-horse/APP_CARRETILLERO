//Creamos las variable globales que hacen falta
let referencia_componente = "", categoria_seleccionada, operacion_seleccionada, puestoID, fs_totales, ultimoBotonPulsado, conteosPorPuesto = [], mote, tipo_operacion = "Programa_Expedicion_Forklift", primer_dia, numero_picadas, tiempoDesplazamiento, cantidad_a_expedir;

//Variable global donde almacenarems en un diccionario la referencia y el número de embalajes
let referencia_embalaje = {};

//Declaramos las variables gloables necesarias para controlar las etapas
let id_etapa, comment, distance_empty_zone, loading_type, engins, number_of_packages_loaded_at_once, engines, code_mtm3, correspondence, speed;

//Variable global para almacenar la cantidad de referencias
let cantidad_referencias = 0;

//Variable que contiene los datos para el gráfico de chimenea
let conteoGraficoChimenea = [];

//Variable de control para gráfico del puesto
let chartPuesto = null;

//Creamos un array donde contendrá la información para representar los gráficos
let peticionesFinalizadas = {
    puestos: false,
    graficoChimenea: false
};

//Array para almacenar los puestos ocultos
let puesto_ocultos = [];

//Creamos un diccionario con las plantas y sus códigos
let diccionario_plantas = {
    "Aveiro": "00900165",
    "Sevilla": "00910175",
    "Valladolid": "00910177",
    "Chile": "00900095",
    "HORSE ROBV": "00900123",
    "Motores": "00900125",
    "Oyak": "00900144",
    "Brasil": "00900186"
};

/**
 * Función asincrona para obtener los puestos de la base de datos
 */
async function fetchData() {
    /**Obtenemos los PUESTOS */
    try {
        //Almacenamos en una variable la respuesta de la llamada al end point para obtener los puestos
        const response = await fetch('/app/api/obtenerPuestos');

        //Controlamos la respuesta
        if (!response.ok) {
            throw new Error('Error fetching data');
        }

        //Almacenamos los puestos obtenidos
        const data = await response.json();

        //Llamamos al método para disponer los puestos en el panel superior
        gestionarPuesto(data);

        //Llamamos al método para obtener los datos para el gráfico de chimenea
        gestionarGraficoChimenea(data);

    } catch (exception) {
        console.error("Error al obtener los puestos: ", exception);
    }

    /**Obtenemos el conteo de Fs */
    try {
        //Almacenamos en una variable la respuesta a la llamada al end point para obtener el conteo de Fs
        const response = await fetch('/app/api/conteoFs');

        //Controlamos la respuesta
        if (!response.ok) {
            throw new Error('Error fetching data');
        }

        //Almacenamos en una variable el conteo obtenido
        const data = await response.json();

        //Almacenamos en una variable global el total obtenido del end point
        fs_totales = data[0]['COUNT(id)'];

    } catch (exception) {
        console.error("Error al obtener el conteo de las Fs: ", exception);
    }
}

/**
 * Función para obtener el conteo de las etapas usando el ID del puesto
 * @param {*} data Argumento que contiene la información de los puestos
 */
function gestionarPuesto(data) {
    //Creamos una variable para almacenar el número de peticiones completadas
    let peticionesCompletadas = 0;

    console.log("Data PUESTOS: ", data);

    //Almacenamos en una variable el número de puestos disponibles
    const totalPuestos = data.length;

    //Iteramos por los datos del puesto
    data.forEach(item => {
        console.log("PUESTOS -> ", item.saturacion, item.id)

        //Almacenamos en el array la información necesarias
        conteosPorPuesto.push({
            id: item.id,
            nombre: item.nombre,
            conteo: item.saturacion,
            turno: item.turno,
            numero: item.numero
        });

        //Ordenamos los puestos por el número del mismo
        conteosPorPuesto.sort((a, b) => a.numero - b.numero);

        //Aumentamos el contador de peticiones
        peticionesCompletadas++;

        //En caso de que las peticiones se hayan completado
        if (peticionesCompletadas === totalPuestos) {
            //Establecemos a true la información
            peticionesFinalizadas.puestos = true;

            //Llamamos al método para controlar los datos para generar los gráficos
            verificarFinalizacionDeDatos();
        }

        /* ------------------- PARA GRÁFICO DE CHIMENEA -------------------
        //Preparamos la petición GET para obtener el tiempo total de un puesto
        fetch(`/app/api/tiempoTotal/${item.id}`, { method: "GET" })
            //Controlamos la respuesta
            .then(response => {
                //En caso de que sea mala
                if (!response.ok) throw new Error('Error fetching data');

                //Devolvemos los datos
                return response.json();
            })

            //Controlamos los datos
            .then(data => {
                //Almacenamos en una variable los minutos totales de un puesto
                const sumaTotal_puesto = (data.length > 0) ? data[0]["SUM(actividad_en_minutos + nuevo_picadas)"] : 0;

                //Almacenamos en el array la información necesarias
                conteosPorPuesto.push({
                    id: item.id,
                    nombre: item.nombre_puesto,
                    conteo: sumaTotal_puesto,
                    turno: item.turno,
                    numero: item.numero_puesto
                });

                //Ordenamos los puestos por el número del mismo
                conteosPorPuesto.sort((a, b) => a.numero_puesto - b.numero_puesto);

                //Aumentamos el contador de peticiones
                peticionesCompletadas++;

                //En caso de que las peticiones se hayan completado
                if (peticionesCompletadas === totalPuestos) {
                    //Establecemos a true la información
                    peticionesFinalizadas.puestos = true;

                    //Llamamos al método para controlar los datos para generar los gráficos
                    verificarFinalizacionDeDatos();
                }
            })

            //Controlamos el error
            .catch(error => console.error('Error al cargar datos:', error));*/
    });
}

/**
 * Función para verificar que tenemos todos los datos para renderizar los gráficos
 */
function verificarFinalizacionDeDatos() {
    //En caso de que tengamos todos los datos necesarios...
    if (peticionesFinalizadas.puestos && peticionesFinalizadas.graficoChimenea) {
        //Llamamos a la función para renderizar el gráfico
        renderizarGrafico();
    }
}

/**
 * Función para obtener la información de los puestos para rellenar los graficos de chimenes
 * @param {*} data Argumento que contiene los datos de cada gráfico chimenea
 */
function gestionarGraficoChimenea(data) {
    //Creamos una variable para almacenar el número de peticiones completadas
    let peticionesCompletadas = 0;

    //Almacenamos en una variable el número de puestos disponibles
    const totalPuestos = data.length;

    //Iteramos por los datos del puesto
    data.forEach(item => {
        //Preparamos la petición GET para obtener los tiempos para generar el gráfico de chimenea
        fetch(`/app/api/graficoChimenea/${item.id}`, { method: "GET" })
            //Controlamos la respuesta
            .then(response => {
                //En caso de que sea mala
                if (!response.ok) throw new Error('Error fetching data');
                //Devolvemos los datos
                return response.json();
            })
            //Controlamos los datos
            .then(data2 => {
                //Iteramos por los datos obtenidos
                data2.forEach(itemChimenea => {
                    //Almacenamos en el array los datos que necesitamos para generar el gráfico de chimenea
                    conteoGraficoChimenea.push({
                        id: item.id,
                        nombre: itemChimenea.nombre,
                        color: itemChimenea.color,
                        minutos: itemChimenea.minutos,
                    });
                });

                //Almacenamos el array por el ID del puesto
                conteoGraficoChimenea.sort((a, b) => a.id - b.id);

                //Aumentamos el contador de las peticiones
                peticionesCompletadas++;

                //En caso de que no haya peticiones
                if (peticionesCompletadas === totalPuestos) {
                    //Establecemos a true la información
                    peticionesFinalizadas.graficoChimenea = true;

                    //Llamamos al método para controlar los datos para generar los gráficos
                    verificarFinalizacionDeDatos(data2);
                }
            })

            //Controlamos el error
            .catch(error => console.error('Error al cargar datos:', error));
    });
}

/**
 * Función para renderizar los gráficos
 */
function renderizarGrafico() {
    //Contendor de los gráficos
    const graficosContainer = document.getElementById('graficos-container');
    graficosContainer.innerHTML = '';

    //Configuramos el contenedor de los gráficos
    graficosContainer.style.display = 'flex';
    graficosContainer.style.justifyContent = 'center';
    graficosContainer.style.alignItems = 'center';
    graficosContainer.style.gap = '15px';
    graficosContainer.style.width = '100%';
    graficosContainer.style.transition = 'all 0.3s ease-in-out';

    const titulo = document.createElement('h3');
    titulo.style.fontSize = '15px';
    titulo.style.color = '#000000';
    titulo.style.fontWeight = 'bold';
    //titulo.style.paddingTop = '5px';
    //titulo.style.paddingBottom = '10px';
    titulo.style.textAlign = 'center';

    //Contenedor para el gráfico de puesto
    const contenedor_grafico_puesto = document.createElement('div');
    contenedor_grafico_puesto.style.flex = '0';
    contenedor_grafico_puesto.style.maxWidth = '0';
    contenedor_grafico_puesto.style.padding = '15px';
    contenedor_grafico_puesto.style.borderRadius = '10px';
    contenedor_grafico_puesto.style.backgroundColor = '#34495e';
    contenedor_grafico_puesto.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
    contenedor_grafico_puesto.style.display = 'flex';
    contenedor_grafico_puesto.style.flexDirection = 'column';
    contenedor_grafico_puesto.style.alignItems = 'center';
    contenedor_grafico_puesto.style.justifyContent = 'center';
    contenedor_grafico_puesto.style.overflow = 'hidden';
    contenedor_grafico_puesto.style.transition = 'all 0.3s ease-in-out';
    contenedor_grafico_puesto.style.backgroundColor = '#f6f6f6';

    contenedor_grafico_puesto.appendChild(titulo);

    //Lienzo para el gráfico de la saturación
    const lienzo_grafico_puesto = document.createElement('canvas');
    lienzo_grafico_puesto.width = 200;
    lienzo_grafico_puesto.height = 180; //TAMAÑO DEL GRÁFICO
    contenedor_grafico_puesto.appendChild(lienzo_grafico_puesto);

    //Lienzo para el gráfico de chimenea
    const lienzo_grafico_chimenea_canvas = document.createElement('canvas');
    lienzo_grafico_chimenea_canvas.width = 250;
    lienzo_grafico_chimenea_canvas.height = 180;
    contenedor_grafico_puesto.appendChild(lienzo_grafico_chimenea_canvas);

    //Contenedor para los botones
    const contenedor_botones = document.createElement('div');
    contenedor_botones.id = "botonesContainer";
    contenedor_botones.style.display = 'flex';
    contenedor_botones.style.justifyContent = 'center';
    contenedor_botones.style.gap = '6px';

    //Obtenemos la instancia de los botones necesarios
    const { botonEliminarPuesto: boton_eliminar_puesto } = creacionBotones(contenedor_botones);

    //Funcionalidad para eliminar un puesto
    boton_eliminar_puesto.addEventListener('click', () => {
        //Llamamos al método para disponer la alerta de confirmación de elemento
        confirmarEliminar("question", "Vas a eliminar este puesto... ¿Estas seguro de lo que vas hacer?", puestoID, "puestos");
    });

    //Añadimos el botón al contenedor
    contenedor_grafico_puesto.appendChild(contenedor_botones);

    contenedor_botones.hidden = true;

    //Contenedor para el gráfico principal
    const contenedor_grafico_principal = document.createElement('div');
    contenedor_grafico_principal.style.flex = '1';
    contenedor_grafico_principal.style.maxWidth = '100%';
    contenedor_grafico_principal.style.height = '545px';
    contenedor_grafico_principal.style.padding = '15px';
    contenedor_grafico_principal.style.borderRadius = '10px';
    contenedor_grafico_principal.style.backgroundColor = '#2c3e50';
    contenedor_grafico_principal.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
    contenedor_grafico_principal.style.display = 'flex';
    contenedor_grafico_principal.style.alignItems = 'center';
    contenedor_grafico_principal.style.justifyContent = 'center';
    contenedor_grafico_principal.style.transition = 'all 0.3s ease-in-out';
    contenedor_grafico_principal.style.backgroundColor = '#f6f6f6';

    //Gráfico principal
    const grafico_principal = document.createElement('canvas');
    grafico_principal.style.width = '100%';
    grafico_principal.style.height = '100%';
    contenedor_grafico_principal.appendChild(grafico_principal);

    //Agregamos los contenedores al principal
    graficosContainer.appendChild(contenedor_grafico_puesto);
    graficosContainer.appendChild(contenedor_grafico_principal);

    //Variables necesarias para enviar al gráfico de puesto
    const nombre_puestos = conteosPorPuesto.map(puesto => puesto.nombre),
        conteos = conteosPorPuesto.map(puesto => puesto.conteo),
        id_puestos = conteosPorPuesto.map(puesto => puesto.id),
        turnos = conteosPorPuesto.map(puesto => puesto.turno);

    //Instancia de los gráficos
    const ctxBarras = grafico_principal.getContext('2d'),
        ctxPuesto = lienzo_grafico_puesto.getContext('2d'),
        ctxChimenea = lienzo_grafico_chimenea_canvas.getContext('2d');

    //Gráfic chimenea
    const chartChimenea = new Chart(ctxChimenea, {
        type: 'bar',
        data: {
            labels: ['Label1'],
            datasets: []
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'black',
                        font: {
                            size: 11
                        },
                        textAlign: 'center',
                        boxWidth: 20
                    },
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${context.raw}%`
                    }
                },
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: 'black'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    max: 160,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)',
                        color: 'black'
                    },
                    ticks: {
                        color: 'black'
                    }
                }
            }
        },
        //plugins: [ChartDataLabels]
        plugins: [{
            id: 'lineaMedia',
            afterDraw: function (chart) {
                const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                const yPos = y.getPixelForValue(90);

                // Dibujar la línea de la media
                ctx.save();
                ctx.strokeStyle = 'rgb(0, 0, 0)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(left, yPos);
                ctx.lineTo(right, yPos);
                ctx.stroke();
                ctx.restore();
            }
        }]
    });

    //Modificamos los valores para sustituir los 0 por 10 y los colores
    const conteos_controlados = conteos.map(conteo => (conteo));


    const colores_turnos = {
        M: 'rgba(255, 159, 64, 0.6)',
        T: 'rgba(178, 222, 74, 0.6)',
        N: 'rgba(44, 93, 231, 0.6)'
    };

    const colores_seleccionados = {
        M: 'rgba(255, 172, 64, 0.8)',
        T: 'rgba(178, 222, 74, 0.8)',
        N: 'rgba(44, 93, 231, 1)'
    };

    const colores_conteos = conteos.map((conteo, index) => {
        const turno = turnos[index]; // Obtenemos el turno correspondiente al índice
        return colores_turnos[turno] || 'rgba(225, 233, 244, 0.6)'; // Asigna el color según el turno
    });

    const colores_borde = colores_conteos.map(color => {
        // Cambiar la opacidad del color (de '0.6' a '0.9')
        return color.replace('0.6', '0.9');
    });

    console.log("turnos ", turnos)

    const media = (conteos_controlados.reduce((a, b) => a + b, 0))/conteos_controlados.length

    //Gráfico principal
    const chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: nombre_puestos,
            datasets: [{
                label: 'Puestos',
                data: conteos_controlados,
                backgroundColor: colores_conteos,
                borderColor: colores_borde,
                borderWidth: 2,
                borderRadius: 8,
                barPercentage: 0.8,
                categoryPercentage: 0.8,
                hoverBackgroundColor: colores_conteos,
                hoverBorderColor: colores_borde,
                hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'black',
                        font: {
                            size: 11
                        },
                        textAlign: 'center',
                        boxWidth: 20,
                        generateLabels: (chart) => {
                            const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            
                            return originalLabels.filter(label => label.text !== 'Puestos').concat([
                                {
                                    text: 'Mañana',
                                    fillStyle: colores_turnos['M'],
                                    strokeStyle: colores_turnos['M'],
                                    lineWidth: 1,
                                    hidden: false
                                },
                                {
                                    text: 'Tarde',
                                    fillStyle: colores_turnos['T'],
                                    strokeStyle: colores_turnos['T'],
                                    lineWidth: 1,
                                    hidden: false
                                },
                                {
                                    text: 'Noche',
                                    fillStyle: colores_turnos['N'],
                                    strokeStyle: colores_turnos['N'],
                                    lineWidth: 1,
                                    hidden: false
                                },
                                {
                                    text: `Media: ${media.toFixed(2)}%`,
                                    fillStyle: 'rgb(0, 0, 0)',
                                    strokeStyle: 'rgb(77, 52, 177)',
                                    lineWidth: 1,
                                    hidden: false
                                }
                            ]);
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 8,
                    boxPadding: 10,
                    callbacks: {
                        label: context => `Saturación: ${context.raw}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'black',
                        stepSize: 5,
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)',
                        borderDash: [5, 5]
                    }
                },
                x: {
                    ticks: {
                        color: 'black',
                        font: { size: 12 },
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 30
                    },
                    grid: { display: false }
                }
            },

            //Función para el clic en las barras
            onClick: (event, elements) => {
                const canvasPosition = Chart.helpers.getRelativePosition(event, chartBarras);
                const x = canvasPosition.x;
                const y = canvasPosition.y;

                //En caso de que se haga clic en una barra
                if (elements.length > 0) {
                    //Obtenemos el índice del gráfico
                    const index = elements[0].index;

                    // Obtenemos el turno del índice seleccionado
                    const turno = turnos[index];

                    //Reseteamos todas las barras a su color y grosor original
                    chartBarras.data.datasets[0].backgroundColor = chartBarras.data.datasets[0].data.map((_, i) => {
                        if (i === index) {
                            // Si la barra está seleccionada, usamos un color más fuerte
                            return colores_seleccionados[turno] || 'rgb(196, 204, 216)';
                        }
                        return colores_conteos[i]; // Para las demás barras, mantenemos el color original
                    });

                    // Actualizamos el grosor del borde de las barras
                    chartBarras.data.datasets[0].borderWidth = chartBarras.data.datasets[0].data.map((_, i) =>
                        i === index ? 0 : 2
                    );

                    // Actualizamos el color del borde con los nuevos valores de opacidad
                    chartBarras.data.datasets[0].borderColor = colores_borde;

                    //Actualizamos el gráfico
                    chartBarras.update();

                    //Llamamos a la función para disponer la información detallada del puesto
                    seleccionarPuesto(index, id_puestos, nombre_puestos, conteos, contenedor_grafico_puesto, contenedor_grafico_principal, chartChimenea, chartPuesto, titulo);

                    return;
                }

            
                //En caso de que se haga clic cerca de un label
                const xAxis = chartBarras.scales.x;
                console.log("y: ", y, " x:", x);
                console.log("xAxis.top: ", xAxis.top, "xAxis.bottom", xAxis.bottom);
                if (y < xAxis.top && y > xAxis.top - 20 && y < xAxis.bottom + 30) {
                    console.log("DENTRO")
                    for (let i = 0; i < nombre_puestos.length; i++) {
                        const tickX = xAxis.getPixelForTick(i);
                        if (Math.abs(x - tickX) < 30) {
                            //Actualizamos el gráfico
                            chartBarras.update();

                            //Llamamos a la función para disponer la información detallada del puesto
                            seleccionarPuesto(i, id_puestos, nombre_puestos, conteos, contenedor_grafico_puesto, contenedor_grafico_principal, chartChimenea, chartPuesto, titulo);
                            break;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'lineaMedia',
            afterDraw: function(chart) {
                const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                const yPos = y.getPixelForValue(media);

                // Dibujar la línea de la media
                ctx.save();
                //ctx.setLineDash([6, 6]); //rgb(196, 83, 253)
                ctx.strokeStyle = 'rgb(0, 0, 0)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(left, yPos);
                ctx.lineTo(right, yPos);
                ctx.stroke();
                ctx.restore();
            }
        }]
    });


    //En caso de que el puesto exista
    if (chartPuesto) {
        //Lo destruimos
        chartPuesto.destroy();
    }

    //Configuramos el gráfico del puesto
    chartPuesto = new Chart(ctxPuesto, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 0],
                backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(211, 211, 211, 0.3)'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.data[context.dataIndex]}%`
                    }
                },
                centerText: {
                    //text: `${conteo}%`;
                }
            },
            responsive: false,
            cutout: '70%',
            rotation: -90
        },
        plugins: [centerTextPlugin]
    });
}

//Variable para la saturación central del puesto
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart) => {
        const { width, height, ctx } = chart;
        const text = chart.options.plugins.centerText.text;

        if (!text) return;

        ctx.save();

        //Calculamos el radio de la gráfica
        const chartArea = chart.chartArea;
        const doughnutRadius = (chartArea.right - chartArea.left) / 3;

        //Configuramos el texto
        const fontSize = doughnutRadius / 4.5;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        //Calculamos la posición del texto en el centro de la gráfica
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        //Establecemos el texto dentro de la gráfica
        ctx.fillText(text, centerX, centerY);

        ctx.restore();
    }
};

/**
 * Función para crear los botones y disponerlos en el puesto
 * @returns Devuelve los botones formateados
 */
function creacionBotones(contenedor_botones) {
    /** Botón para eliminar un puesto */
    const botonEliminarPuesto = document.createElement('button');
    botonEliminarPuesto.innerHTML = '<i class="bi bi-trash3"></i>';
    botonEliminarPuesto.className = "bg-red-600 text-white py-1 px-2 rounded hover:bg-red-500 transition duration-300";
    botonEliminarPuesto.setAttribute('data-id', puestoID)
    botonEliminarPuesto.onclick = () => {
        eliminarRegistro('puesto', puestoID, 'puestos', puestoID);
    };
    contenedor_botones.appendChild(botonEliminarPuesto);

    //Devolvemos los botones
    return { botonEliminarPuesto };
}

/**
 * Función para disponer la información detallada del puesto
 * @param {int} index Argumento que contiene el indice del puesto del gráfico principal
 * @param {Array} id_puestos Argumento que contiene los IDs de los puestos
 * @param {Array} nombre_puestos Argumento que contiene los nombres de los puestos
 * @param {Array} conteos Argumento que contiene la saturación de los puestos
 * @param {HTMLElement} contenedor_grafico_puesto Argumento que contiene la instancia del contenedor del puesto
 * @param {HTMLElement} contenedor_grafico_principal Argumento que contiene la insrancia del contenedor del gráfico principal
 * @param {Chart} chartChimenea Argumento que contiene la instancia del gráfico de chimenea
 * @param {Chart} chartPuesto Argumento que contiene la instancia del gráfico de donut
 */
function seleccionarPuesto(index, id_puestos, nombre_puestos, conteos, contenedor_grafico_puesto, contenedor_grafico_principal, chartChimenea, chartPuesto, titulo) {
    //Obtenemos el ID del puesto, el nombre y la saturación del puesto
    document.getElementById('botonesContainer').hidden = false;
    const id_puesto = id_puestos[index], nombre_puesto = nombre_puestos[index], conteoSeleccionado = conteos[index];

    titulo.textContent = `Puesto: ${nombre_puesto}`;

    //Almmacenamos en la variable el ID del puesto
    puestoID = id_puesto;

    

    //Variable con los datos necesarios para disponer la información del puesto
    const datasets = conteoGraficoChimenea.map((item, index) => ({
        label: item.nombre,
        data: [item.minutos],
        id_puesto: item.id,
        color: item.color
    }));

    //Configuramos el gráfico y la interfaz del puesto
    contenedor_grafico_puesto.style.flex = '0.3';
    contenedor_grafico_puesto.style.maxWidth = '30%';
    contenedor_grafico_principal.style.flex = '0.7';
    contenedor_grafico_principal.style.maxWidth = '70%';

    //Mostramos botones y el buscador
    const boton_anyadir_etapa = document.getElementById('anyadirEtapa');
    boton_anyadir_etapa.classList.add('resaltadoBotones');
    boton_anyadir_etapa.setAttribute('onclick', `anyadirEtapa(${id_puesto})`);
    boton_anyadir_etapa.style.display = 'block';

    /*const buscador_etapas = document.getElementById('buscadorEtapa');
    buscador_etapas.style.display = 'block';
    document.getElementById('tituloPrincipalEtapasDisponibles').textContent = "Etapas disponibles para el puesto: " + nombre_puesto;*/

    //Llamamos a la función para actualizar los gráficos
    actualizarGraficoPuesto(chartPuesto, chartChimenea, nombre_puesto, conteoSeleccionado, id_puesto, datasets);

    //Llamamos a la función para obtener las etapas del puesto
    obtenerEtapas(id_puesto);

    //Llamamos a la función para disponer los turnos del puesto
    obtenerTurno(id_puesto);
}

/**
 * Función para disponer los datos en el gráfico del puesto
 * @param {chart} chartPuesto Argumento que contiene la instancia del gráfico del puesto
 * @param {chart} chartChimenea Argumento que contiene la instancia del gráfico de chimenea
 * @param {String} nombre Argumento que contiene el nombre del puesto
 * @param {int} conteo Argumento que contiene la saturación
 * @param {int} id_puesto Argumento que contiene el ID del puesto
 * @param {Array} datasets Argumento que contiene los datos de las etapas con sus tiempos
 * @returns NA
 */
function actualizarGraficoPuesto(chartPuesto, chartChimenea, nombre, conteo, id_puesto, datasets) {
    //Comprobamos si los gráficos del puesto estan bien instanciados
    if (!chartPuesto || !chartChimenea) return;

    //Almacenamos en una variables los datos depurados
    const datasets_depurados = datasets.map(dataset => ({
        ...dataset,
        data: dataset.data.map(d => (typeof d === 'number' && !isNaN(d)) ? d : 0)
    }));

    //Almacenamos en una variable los datos del puesto en cuestión
    const datos_filtrados = datasets_depurados.filter(data => data.id_puesto === id_puesto);

    //Almacenamos en variable los datos
    const valores = datos_filtrados.map(data => data.data[0]), etiquetas = datos_filtrados.map(data => data.label);

    console.log("VALORES -> ", valores)

    //variables para establecer la información de la saturación
    const conteo_libre = conteo > 100 ? 0 : 100 - conteo;

    //Actualizamos el gráfico donut
    chartPuesto.data.labels = ['Tiempo Utilizado', 'Tiempo Libre'];
    chartPuesto.data.datasets[0].data = [conteo, conteo_libre.toFixed(2)];
    chartPuesto.data.datasets[0].backgroundColor = ['rgba(231, 76, 60, 0.7)', 'rgba(46, 204, 113, 0.7)'];
    chartPuesto.data.datasets[0].borderColor = '#5b5b5b',
    //chartPuesto.options.plugins.title.text = `Puesto: ${nombre}`;
    chartPuesto.options.plugins.centerText.text = `${conteo}%`;
    chartPuesto.update();

    //Almacenamos en variables los datos necesarios
    const total = 442;
    const porcentajes = valores.map(item => ((item / total) * 100).toFixed(2));


    //Actualizamos el gráfico de chimenea
    chartChimenea.data.labels = ['Actividades'];
    chartChimenea.data.datasets = datos_filtrados.map((data, index) => ({
        label: data.label,
        data: [porcentajes[index]],
        backgroundColor: data.color,
        borderColor: data.color.replace('0.6', '1'),
        borderWidth: 1.5
    }));

    chartChimenea.update();
}

/**
 * Función para inicializar el botón de visualizar las etapas
 * @param {} button Argumento que contiene el botón de visualizar las etapas
 */
function inicializarBotonEtapas(button) {
    //Añadimos un control el último botón de visualizar las etapas... en casa de que haya un botón pulsado
    if (ultimoBotonPulsado) {
        //Quitamos el color del fondo del botón
        ultimoBotonPulsado.style.backgroundColor = "";

        //Le quitamos la clase
        ultimoBotonPulsado.classList.remove("bg-highlight");
    }

    //Establecemos color al fondo del botón
    button.style.backgroundColor = "#7b8f8f";

    //Almacenamos el último botón pulsado
    ultimoBotonPulsado = button;

    //Almacenamos el ID del puesto de los atributos del botón
    const puestoId = button.getAttribute('data-id');

    //Almacenemos el nombre del puesto de los atributos del botón
    const nombrePuesto = button.getAttribute('data-nombre-puesto');

    //Almacenamos el ID del puesto en la variable global
    puestoID = puestoId;

    //Creamos una instancia del botón de añadir la etapa
    const botonAnyadirEtapa = document.getElementById('anyadirEtapa');

    //Aplicamos el estilo al botón de añadir puesto
    botonAnyadirEtapa.classList.add('resaltadoBotones');

    //Aplicamos el atributo 'onclick'
    botonAnyadirEtapa.setAttribute('onclick', `anyadirEtapa(${puestoId})`);

    //Mostramos el botón de añadir la etapa
    botonAnyadirEtapa.style.display = 'block';

    //Creamos una instancia del buscador
    const botonBuscadorEtapas = document.getElementById('buscadorEtapa');

    //Mostramos el buscador
    botonBuscadorEtapas.style.display = 'block';

    //Añadimos el título al encabezado de la sección de las etapas
    document.getElementById('tituloPrincipalEtapasDisponibles').textContent = "Etapas disponibles para el puesto: " + nombrePuesto;

    //Llamamos a la función para visualizar el turno
    obtenerTurno(puestoId);

    //Llamamos a la función para disponer las etapas
    obtenerEtapas(puestoId);
}

/**
 * Función para disponer el turno del puesto
 * @param {int} puestoId Argumento que contiene el ID del puesto
 */
function obtenerTurno(puestoId) {
    //Preparamos la solicitud GET para obtener los turnos
    fetch(`/app/api/obtenerTurno/${puestoId}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos los datos
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Controlamos que haya datos
            if (data.length !== 0) {
                //Llamamos a la función para disponer la información en el panel de opciones
                disponerTurno(data[0].turno, data[0].jornada_inicio, data[0].jornada_fin);

                //En cualquier otro caso...
            } else {
                //Ocultamos el contenedor del turno
                document.getElementById('visualizarTurno').classList.remove('block');
                document.getElementById('visualizarTurno').classList.add('hidden');
            }
        });
}

/**
 * Función para disponer la jornada laboral de un puesto en el panel de opciones
 * @param {String} turno Argumento que contiene el turno del puesto
 * @param {String} jornadaInicio Argumento que contiene el inicio de la jornada
 * @param {String} jornadaFin Argumento que contiene el final de la jornada
 */
function disponerTurno(turno, jornadaInicio, jornadaFin) {
    //Creamos una variable para almacenar el turno y el icono
    let turno_final, icono;

    console.log(jornadaInicio)

    //Controlamos el turno... en caso de que el turno sea de mañana
    if (turno === "M") {
        turno_final = "Mañana";
        icono = '<i class="bi bi-brightness-alt-high-fill"></i>';

        //En caso de que el turno sea de tarde
    } else if (turno === "T") {
        turno_final = "Tarde";
        icono = '<i class="bi bi-brightness-high-fill"></i>';

        //En caso de que el turno sea de noche
    } else if (turno === "N") {
        turno_final = "Noche";
        icono = '<i class="bi bi-moon-fill"></i>';
    }

    //En caso de que haya datos...
    if (turno || jornadaInicio || jornadaFin) {
        //Establecemos el título del modal
        document.getElementById('jornadaLaboralTitle').innerHTML = `Jornada laboral: ${turno_final} ${icono}`;

        //Configuramos el tamaño de la fuente del título
        document.getElementById('jornadaLaboralTitle').style.fontSize = '18px';

        //Establecemos el inicio de la jornada
        document.getElementById('jornadaInicio').innerText = jornadaInicio;

        //Establecemos el final de la jornada
        document.getElementById('jornadaFinal').innerText = jornadaFin;

        //Mostramos el contenedor de la jornada
        document.getElementById('visualizarTurno').classList.remove('hidden');
        document.getElementById('visualizarTurno').classList.add('block');

        //En cualquier otro caso...
    } else {
        //Ocutamos el contenedor de los turnos
        document.getElementById('visualizarTurno').classList.remove('block');
        document.getElementById('visualizarTurno').classList.add('hidden');
    }
}

/**
 * Función para disponer la alerta para eliminar un elemento
 * @param {String} icono Argumento que contiene el tipo de icono
 * @param {String} titulo Argumento que contiene el titulo de la alerta
 * @param {int} id Argumento que contiene el ID del elemento a eliminar
 * @param {String} tabla Argumento que contiene el nombre de la tabla
 * @param {int} id_puesto Argumento que contiene el ID del puesto
 */
function confirmarEliminar(icono, titulo, id, tabla, id_puesto) {
    //Configuramos y mostramos la alerta
    Swal.fire({
        title: titulo,
        icon: icono,
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonText: "Si",
        cancelButtonText: "No"
    }).then(result => {
        //En caso de que el usuario haya pulsado sobre el confirmar
        if (result.isConfirmed) {
            //Llamamos a la función para eliminar el elemento
            eliminarRegistro(id, tabla, id_puesto);
        }
    });
}

function obtenerEtapas(puestoID) {
    //Iniciamos la solicitud GET para obtener las etapas de un puesto
    fetch(`/app/api/obtenerEtapasAgrupadasPuesto/${puestoID}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que se produzca un error
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos la información formateada
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            generarEtapaGlobal(data);
        });
}

/**
 * Función para representar las etapas por puesto
 * @param {Array} etapas Argumento que contiene la información de las etapas
 */
function generarEtapaGlobal(etapas) {
    let contenedorTablas = document.getElementById('tablaEtapasGlobal');
    contenedorTablas.innerHTML = '';

    etapas.forEach((etapa, index) => {
        //Declaramos una variable para almacenar el color de la etapa
        const color_etapa = etapa.color;

        let color_distancia;

        //Creamos una variable para almacenar el nombre de la etapa
        const f = etapa.name

        var { nombre_etapa, id_etapa, id_puesto, distancia_total, actividad_minutos_picadas, num_picadas } = inicializarVariablesEtapas(etapa);
        console.log(etapa)

        //Creamos un if para controlar la distancia total de la etapa y asi poder modificar el color de la misma... en caso de la distancia sea de 0 a 49
        if (distancia_total >= 0 && distancia_total <= 49) {
            //Asignamos el color verde
            color_distancia = 'text-green-700';

            //En caso de que la distancia sea entre de 50 a 100
        } else if (distancia_total >= 50 && distancia_total <= 99) {
            //Asignamos el color amarillo
            color_distancia = 'text-yellow-700';

            //En caso de que la distancia sea más de 100
        } else if (distancia_total >= 100) {
            //Asignamos el color rojo
            color_distancia = 'text-red-700';

            //En cualquier otro caso
        } else {
            //Asignamos el color azul
            color_distancia = 'text-blue-700';
        }

        id_puesto = etapa.id_puesto;

        //Generamos el HTML de la tabla para la etapa
        const tablaHTML = `
            <div id="etapa-${id_puesto}-${nombre_etapa}" class="mb-4" data-id-etapa="${id_etapa}">
                <h3 id="encabezadoEtapa-${nombre_etapa}"
                    class="text-lg font-semibold mb-2 p-2 rounded-lg animate-fadeIn text-black ${f === 'X' ? 'bg-stone-200' : ''}"
                        style="${f !== 'X' ? `background-color: ${color_etapa};` : ''}"
                    ${f !== 'X' ? `onclick="toggleEtapas(${id_puesto}, '${nombre_etapa}')"` : ''}>

                    <div class="grid grid-cols-10 gap-4 w-full">
                        <span class="col-span-4">Etapa: <strong>${nombre_etapa}</strong></span>
                        <span class="col-span-2">Distancia (m): <strong class=${color_distancia}>${distancia_total}</strong></span>
                        <span class="col-span-2">Tiempo (min): <strong>${actividad_minutos_picadas.toFixed(2)}</strong></span>

                        <div class="col-span-2 flex justify-between gap-2">
                            <button type="button" class="text-gray-500"
                                onclick="editarEtapa(${id_puesto}, '${nombre_etapa}', '${num_picadas}')">
                                <i class="bi bi-info-circle-fill" style="font-size: 20px;"></i>
                            </button>

                            <button type="button" class="text-white"
                                onclick="editarDistancia('${id_puesto}', '${nombre_etapa}')">
                                <i class="bi bi-map"></i>
                            </button>

                            <button type="button" class="text-blue-500"
                                onclick="anyadirEtapa(${id_puesto}, '${nombre_etapa}', '${num_picadas}')">
                                <i class="bi bi-plus-circle-fill" style="font-size: 20px;"></i>
                            </button>

                            <button type="button" class="text-red-500"
                                onclick="eliminarRegistro('etapa_global', '${nombre_etapa}', 'etapas', ${id_puesto})">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </div>
                </h3>
            </div>
        `;
        contenedorTablas.insertAdjacentHTML('beforeend', tablaHTML);
    })
}

function toggleEtapas(id_puesto, nombre_etapa) {
    let subEtapasContainer = document.getElementById(`subEtapas-${nombre_etapa}`);

    console.log(nombre_etapa)

    if (!subEtapasContainer) {
        // Si no existe, creamos el contenedor y lo insertamos después del elemento de la etapa global
        let etapaGlobal = document.getElementById(`etapa-${id_puesto}-${nombre_etapa}`);
        subEtapasContainer = document.createElement("div");
        subEtapasContainer.id = `subEtapas-${nombre_etapa}`;
        subEtapasContainer.classList.add("ml-4", "hidden");
        etapaGlobal.insertAdjacentElement("afterend", subEtapasContainer);
    }

    if (subEtapasContainer.classList.contains('hidden')) {
        // Si está oculto, lo mostramos y cargamos las etapas por puesto
        generarTablasPorPuesto(id_puesto, nombre_etapa, subEtapasContainer);
        subEtapasContainer.classList.remove('hidden');
    } else {
        // Si ya está visible, lo ocultamos
        subEtapasContainer.classList.add('hidden');
    }
}

/**
 * Función para obtener las etapas asociadas a un puesto usando el ID del mismo
 * @param {int} puestoID Argumento que contiene el ID del puesto seleccioonado
 */
function generarTablasPorPuesto(puestoID, nombre_etapa) {
    console.log("puesto: ", puestoID, nombre_etapa)
    //Iniciamos la solicitud GET para obtener las etapas de un puesto
    fetch(`/app/api/obtenerEtapas_Puesto/${puestoID}/${nombre_etapa}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que se produzca un error
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos la información formateada
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            data.sort((a, b) => a.orden - b.orden); // Asegurar orden correcto
            //Llammos al método para mostrar las etapas de un puesto
            generarTablasPorEtapa(data, nombre_etapa);
        });
}

/**
 * Función para calcular el número de la semana actual
 * @param {*} [fecha=new Date()] Argumento que contiene la fecha actual
 */
/*function obtenerNumeroSemana(fecha = new Date()) {
    //Creamos una copia del argumento
    const fecha_copia = new Date(fecha.getTime());

    //Establecemos el primero día como lunea
    const diaSemana = fecha_copia.getUTCDay() || 7;
    fecha_copia.setUTCDate(fecha_copia.getUTCDate() + 4 - diaSemana);

    //Creamos una variable con el primer día del año
    const inicioAño = new Date(Date.UTC(fecha_copia.getUTCFullYear(), 0, 1));

    //Calculamos el número de la semana
    const numeroSemana = Math.ceil(((fecha_copia - inicioAño) / 86400000 + 1) / 7);

    //Devolvemos el día de la semana
    return numeroSemana;
}*/

/**
 * Función para disponer la información detalla del puesto
 * @param {*} puesto_id Argumento que contiene el ID del puesto
 * @param {*} nombre_puesto Argumento que contiene el nombre del puesto
 */
/*function modalPuestoDetallado(puesto_id, nombre_puesto) {
    //Eliminamos el contenido del cuerpo del modal
    $('#modalDetalle .modal-body').html(``);

    //Configuramos el título del modal
    $('#modalDetalle .modal-title').text("Detalles del puesto: ", nombre_puesto);

    //Almacenamos en auna variable la semana actual
    const semana_actual = obtenerNumeroSemana();

    //Preparamos la petición GET para obtener las referencias asociadas al puesto
    fetch(`/app/api/obtenerReferencias-puesto/${puesto_id}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que no sea válida
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos los datos
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Llamamos a la función para obtener las fechas de las referencias
            obtenerFechas_Referencias(puesto_id, data);
        });
}*/

/**
 * Función para obtener las fechas de cada referencia
 * @param {int} puesto_id Argumento que contiene el ID del puesto
 * @param {Array} data Array que contiene las referencias de un puesto junto al tipo de operación
 */
function obtenerFechas_Referencias(puesto_id, data) {
    //Iteramos por las referencias obtenidas
    data.forEach(item => {
        //Preparamos la peticón GET para obtener las fechas
        //fetch(`/app/api/obtenerFechas-Programa-Recepcion/${item.referencia_componente}/${item.tipo_operacion}`, {
        fetch(`/app/api/obtenerCantidad-grafico/${item.referencia_componente}/${'2025-04-30'}/${puesto_id}`, {
            method: "GET"
        })
            //Controlamos la respuesta
            .then(response => {
                //En caso de que no haya salido bien
                if (!response.ok) {
                    throw new Error('Error fetching data');
                }

                //Devolvemos los los fechas obtenidas
                return response.json();
            })

            //Controlamos las fechas
            .then(data => {
                //Llamamos a la función para disponer el el modal del informe detallado
                configurarModalInformeDetallado(data);
            });
    })
}

/**
 * Función para configurar el modal para mostrar el informe detallado
 * @param {Array} data Array que contiene las fechas de las referencias
 */
function configurarModalInformeDetallado(data) {
    //Almacenamos en una variable las fechas formateadas de forma correcta
    // const fechas_formateadas = data.map(item => {
    //     return item.fecha.split('T')[0];
    // });

    $('#informe-detallado').fadeIn();
}

/**
 * Función para representar las etapas por puesto
 * @param {Array} etapas Argumento que contiene la información de las etapas
 */
function generarTablasPorEtapa(etapas, nombre_etapa) {
    //Obtenemos el contenedor donde se agregarán las tablas
    let contenedorTablas = document.getElementById(`subEtapas-${nombre_etapa}`);
    contenedorTablas.innerHTML = '';

    //Creamos un mapa para agrupar las etapas por el valor "F"
    const agrupadoPorF = etapas.reduce((acc, etapa) => {
        if (!acc[etapa.operacion]) {
            acc[etapa.operacion] = [];
        }
        acc[etapa.operacion].push(etapa);
        return acc;
    }, {});

    // Ordenar cada grupo al final
    /*Object.keys(agrupadoPorF).forEach(key => {
        agrupadoPorF[key].sort((a, b) => a.orden - b.orden);
    });*/

    //Iteramos sobre cada grupo de "F" para crear una tabla por cada uno
    Object.keys(agrupadoPorF).forEach(FKey => {
        //Almacenamos en una variable las etapas del grupo "F"
        const etapasDeF = agrupadoPorF[FKey];
        console.log(`ETAPA: ${etapasDeF[0].operacion} -> ${etapasDeF[0].id}`)

        //Almacenamos en variables la información básica de la etapa
        const id_etapa1 = etapasDeF[0].id;
        const operacion = etapasDeF[0].operacion;
        const numero_picadas = etapasDeF[0].numero_picadas
        const id_puesto = etapasDeF[0].id_puesto;
        const actividad_minutos_picada = etapasDeF[0].actividad_minutos;

        //Creamos una solicitud para obtener los datos de las etapas
        fetch(`/app/api/obtenerEtapas/${encodeURIComponent(FKey)}`, {
            method: "GET"
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error fetching etapas');
                }
                return response.json();
            })
            .then(etapasData => {
                let color_etapa = etapasData[0].color.replace('0.6', '0.4');
                console.log("COLOR: ", color_etapa)
                etapasDeF.forEach((etapaDeF, index) => {
                    /** Almacenamos las variable necesarias */
                    var { referenciaComponente, nombre_etapa, id_etapa, distancia_total, PS14, DS10, CDL, M1, DC113, CDC, PS15, DI21, DS14, DS15, DC, D1, W5, TT, AL, G1, P5, TT_2, W5_2, actividad_minutos, actividad_minutos_picadas, tiempo_distancia_total } = inicializarVariablesEtapas(etapaDeF);


                    //Preparamos la petición GET para obtener el conteos de UM
                    fetch(`/app/api/conteoUM/${referenciaComponente}`, {
                        method: "GET"
                    })
                        //Controlamos la respuesta
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Error fetching total pieces');
                            }
                            return response.json();
                        })

                        //Controlamos la respuesta
                        .then(totalPiecesData => {
                            let totalPieces = totalPiecesData[0].total_pieces || 1;
                            let actividad_en_minutos_final = 0;


                            //Generamos el HTML de la tabla para la etapa
                            const tablaHTML = `
                                <div id="${id_etapa1}-${id_puesto}" class="mb-4 draggable-container" data-id-etapa="${id_etapa}">
                                    <h3 id="encabezadoEtapa-${FKey}-${referenciaComponente}"
                                        class="text-lg font-semibold mb-2 flex flex-wrap justify-between items-center p-2 rounded-lg animate-fadeIn text-black ${operacion === 'X' ? 'bg-stone-200' : ''}"
                                            style="${operacion !== 'X' ? `background-color: ${color_etapa};` : ''}"
                                        ${operacion !== 'X' ? `onclick="toggleVisibility('etapa-${FKey}-${referenciaComponente}')"` : ''}>

                                        <span cla-ss="min-w-[150px]">Etapa: <strong>${nombre_etapa}</strong></span>
                                        ${operacion !== 'X' ? `<span class="min-w-[150px]">Componente: <strong>${referenciaComponente}</strong></span>` : ''}
                                        <span class="min-w-[150px]"><i class="bi bi-stopwatch-fill"></i> <strong>${actividad_minutos_picadas.toFixed(2)}</strong></span>


                                        <button id="botonEliminarEtapa" type="button" class="text-red-500 ml-2" 
                                            onclick="eliminarRegistro('etapa_referencia', ${id_etapa}, 'etapas', ${id_puesto})">
                                            <i class="bi bi-trash-fill"></i>
                                        </button>
                                    </h3>

                                    <div id="etapa-${FKey}-${referenciaComponente}" class="${operacion === 'X' ? 'hidden' : 'hidden animate-slideInUp'}">
                                        <table class="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
                                            <thead>
                                                <tr class="bg-gray-100">
                                                    <th class="px-4 py-2 border">Operación</th>
                                                    <th class="px-4 py-2 border">Símbolo (estándar MTM3)</th>
                                                    <th class="px-4 py-2 border">Tiempo MTM3 (CTMin)</th>
                                                    <th class="px-4 py-2 border"><i class="bi bi-arrow-clockwise"></i></th>
                                                    <th class="px-4 py-2 border"><i class="bi bi-clock-history"></i> Minutos</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                ${etapasData.map(etapa => {
                                    console.log("ETAPAaaaa: ", etapa)
                                    let distanceValue = etapa.tiempo || 0, tiempoCalculado = 0;

                                        if (etapa.simbolo === 'PS14') {
                                            tiempoCalculado = PS14;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'DS10') {
                                            tiempoCalculado = DS10;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'CDL') {
                                            tiempoCalculado = CDL;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'M1') {
                                            tiempoCalculado = M1;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'DC113') {
                                            tiempoCalculado = DC113;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'CDC') {
                                            tiempoCalculado = CDC;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'PS15') {
                                            tiempoCalculado = PS15;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'DI21') {
                                            tiempoCalculado = DI21;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'DS14') {
                                            tiempoCalculado = DS14;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'DS15') {
                                            tiempoCalculado = DS15;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'DC') {
                                            tiempoCalculado = DC;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'D1') {
                                            tiempoCalculado = D1;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'W5') {
                                            tiempoCalculado = W5;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'TT') {
                                            tiempoCalculado = TT;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'AL') {
                                            tiempoCalculado = AL;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'G1') {
                                            tiempoCalculado = G1;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'P5') {
                                            tiempoCalculado = P5
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === 'W5_2') {
                                            tiempoCalculado = W5_2;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        } else if (etapa.simbolo === "TT_2") {
                                            tiempoCalculado = TT_2;
                                            actividad_en_minutos_final += tiempoCalculado;
                                        }

                                        if (speed === 10) {
                                            valor = 0.6
                                        } else if (speed === 12) {
                                            valor = 0.5;
                                        } else if (speed === 15) {
                                            valor = 0.4;
                                        } else if (speed === 20) {
                                            valor = 0.3
                                        } else {
                                            valor = 1;
                                        }
                                        console.log("cantidad_a_mover", etapaDeF)

                                        return `
                                    <tr>
                                        <td class="px-4 py-2 border">${etapa.nombre_metodo}</td>
                                        <td class="px-4 py-2 border">${etapa.simbolo}</td>
                                        <td class="px-4 py-2 border">${distanceValue}</td>
                                        <td class="px-4 py-2 border">${etapaDeF.cantidad_mover}</td>
                                        <td class="px-4 py-2 border">${Number(tiempoCalculado).toFixed(2)}</td>
                                    </tr>
                                `;
                                    }).join('')}
                            
                                                <tr>
                                                    <td class="px-4 py-2 border font-semibold" rowspan="2">Distancia</td>
                                                    <td class="px-4 py-2 border font-semibold">Metros<br>${distancia_total}</td>
                                                    <td class="px-4 py-2 border font-semibold">Velocidad<br>${0.6}</td>
                                                    <td class="px-4 py-2 border font-semibold">${etapaDeF.cantidad_mover}</td>
                                                    <td class="px-4 py-2 border">${etapaDeF.tiempo_distancia_total.toFixed(2)}</td>
                                                </tr>

                                                <tr>
                                                </tr>

                                                <tr>
                                                    <td class="px-4 py-2 border font-semibold" colspan="4">Actividad total en minutos</td>
                                                    <td class="px-4 py-2 border">${Number(actividad_minutos).toFixed(2)}</td>
                                                </tr>

                                                <tr>
                                                    <td class="px-4 py-2 border font-semibold" colspan="4">Actividad en minutos (según el número de picadas simultáneas)</td>
                                                    <td class="px-4 py-2 border">${Number(actividad_minutos_picadas).toFixed(2)}</td>
                                                </tr>

                                                <tr>
                                                    <td class="px-4 py-2 border font-semibold" colspan="4">Número de picadas</td>
                                                    <td class="px-4 py-2 border">${numero_picadas}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;

                            let orden = [];

                            contenedorTablas.insertAdjacentHTML('beforeend', tablaHTML);


                            // Inicializa SortableJS en el contenedor de las tablas
                            new Sortable(contenedorTablas, {
                                animation: 150,
                                ghostClass: 'sortable-ghost',
                                handle: '.draggable-container',
                                onStart: function (evt) {
                                    // Llenar el array 'orden' antes de que comience el cambio
                                    orden = Array.from(contenedorTablas.children).map(child => child.id);
                                    //console.log("Orden inicial: ", orden);
                                },
                                // onEnd: function (evt) {
                                //     console.log("Orden antes de enviarlo al servidor:", orden);

                                //     // Actualiza el array 'orden' con los nuevos valores
                                //     orden = Array.from(contenedorTablas.children).map(child => child.id);
                                //     console.log("Orden actualizado: ", orden);

                                //     // Enviar el orden al backend
                                //     ordernarEtapa(orden);
                                // }
                            });
                        })
                        .catch(error => {
                            console.error('Error fetching total pieces:', error);
                        });
                });
            })
            .catch(error => {
                console.error('Error fetching etapas:', error);
            })
    });
}


function editarEtapa(id_puesto, operacion, num_picadas) {
    if (id_puesto === '' || id_puesto === null) {
        //Llamamos al método para mostrar una alerta de aviso
        mostrarAlerta('Error al mostrar el moda de añadir etapa', 'Debes de seleccionar un puesto antes de añadir una etapa', 'error', 0);

        //En cualquier otro caso...
    } else {
        //Configuramos el titulo del modal
        $('#modal .modal-title').text(`Editar etapa`);

        //Configuramos el cuerpo del modal para que el usuario introduzca el referencia del componente y la línea
        $('#modal .modal-body').html(`
            <form id="actualizarEtapa" method="GET">
                <!--Numero picadas -->
                <div class="relative inline-block w-full mb-4">
                    <label for="numeroPicadas" class="block text-sm font-medium text-white mb-2">Número de UC/UM a mover en simultaneo</label>
                    <select id="numeroPicadas" name="numeroPicadas" class="block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-white">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                    </select>
                </div>


                <!-- Botón actualizar -->
                <div class="mt-6">
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300">Actualizar etapa</button>
                </div>
            </form>
        `);

        //Ocultamos el footer del modal
        $('#modal .modal-footer').html('');

        $('#modal .modal-dialog').css('max-width', '450px');

        //Mostramos el modal
        $('#modal').modal('show');

        //Si se pasa el numero de picadas como argumento
        if (num_picadas) {
            //Preseleccionamos el numero de picadas en el dropdown
            const picadasSelect = document.getElementById('numeroPicadas');
            picadasSelect.value = num_picadas; // Establecemos el valor del numero de picadas seleccionado
        }

        $('#actualizarEtapa').on('submit', async function (e) {
            //Paramos la propagación
            e.preventDefault();


            //Almacenamos en una variable el número de picadas
            numero_picadas = document.getElementById('numeroPicadas').value;

            //Preparamos la petición GET para actualizar la etapa
            fetch(`/app/api/actualizarEtapa/${id_puesto}/${operacion}/${numero_picadas}/1`, {
                method: "PUT"
            })
                // Controlamos los datos
                .then(response => {
                    if (response.status === 200) {
                        mostrarAlerta('Etapas actualizadas correctamente', null, null, 1);
                    } else {
                        mostrarAlerta('Error', 'Ha fallado', 'error', 0);
                    }
                })
                .catch(error => {
                    console.error('Error en la solicitud:', error);
                    mostrarAlerta('Error', 'No se pudo conectar al servidor', 'error', 0);
                });
        });
    }
}

/**
 * Función para actualizar el orden de las etapas
 * @param {Array} array Argumento que contiene las etapas ordenadas
 */
function ordernarEtapa(array) {
    // Unimos el array con "," para enviarlo correctamente
    let arrayString = array.join(',');

    // Enviar la solicitud al servidor
    fetch(`/app/api/actualizarOrden/${encodeURIComponent(arrayString)}`, {
        method: "PUT",
    })
        .then(response => {
            if (response.ok) {
                mostrarAlerta('Orden actualizado correctamente', null, null, 1)
            } else {
                mostrarAlerta('Error', 'Ha fallado', 'error', 0)
            }
        })
        .catch(error => {
            console.error('Error en la solicitud:', error);
        });
}


/**
 * Función que actualiza el campo de la velocidad (speed)
 * @param {String} value Argumento que contiene el valor de la velocidad 
 */
function updateSpeedMachine(value) {
    const velocidad_maquina_usada = document.getElementById('velocidad_maquina_usada');
    if (velocidad_maquina_usada) {
        switch (value) {
            case "10":
                velocidad_maquina_usada.value = "0.6";
                break;
            case "12":
                velocidad_maquina_usada.value = "0.5";
                break;
            case "15":
                velocidad_maquina_usada.value = "0.4";
                break;
            case "20":
                velocidad_maquina_usada.value = "0.3";
                break;
            default:
                velocidad_maquina_usada.value = "";
        }
    }
}


/**
 * Función para dar la funcionalidad al campo de la máquina usada en la velocidad 
 */
function funcionalidadVelocidad() {
    const velocidad_input = document.getElementById('velocidad');

    //En caso de que exista
    if (velocidad_input) {
        //Llamamos a la función para controlar el campo de la velocidad de la máquina
        updateSpeedMachine(velocidad_input.value);

        //Añadimos el listener al input de la velocidad
        velocidad_input.addEventListener('change', function () {
            //Llamamos a la función para controlar el campo de la velocidad de la máquina donde le pasamos el valor
            updateSpeedMachine(this.value);
        });
    }
}

/**
 * Función para obtener el conteom de UMs
 * @param {String} referencia_compontente Argumento que contiene la referencia del componente
 */
function obtenerConteosUM(referencia_compontente) {
    let total_pieces = null;

    fetch(`/app/api/conteoUM/${referencia_compontente}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que falle
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos el dato obtenido
            return response.json();
        })

        //Controlamos los datos obtenidos
        .then(data => {
            //Establecemos el valor en el campo Number of UC per pallet
            document.getElementById('cantidad_uc_por_pallet').value = data[0].total_pieces;
        });

    return total_pieces;
}

/**
 * Función para configurar el footer del modal de la etapa
 * @param {int} id_etapa Argumento que contiene el ID de la etapa
 * @param {String} F Argumento que contiene el nombre de la F
 */
function configurarFooterModal_Etapa(id_etapa, F) {
    //Configuramos el footer del modal
    $('#modal .modal-footer').html(`
        <div class="modal-footer border-secondary">
            <button id="botonActualizarEtapa" class="btn btn-primary">Actualizar etapa</button>
            <button id="closeModalLarge" class="btn btn-danger" data-bs-dismiss="modal">Cerrar</button>
        </div>
    `);

    //Añadimos la funcionalidad para el botón de actualizar etapa
    $('#botonActualizarEtapa').on('click', function () {
        //Llamamos la función para actualizar la etapa
        controlActualizacionEtapa(id_etapa, F);
    });
}

/**
 * Función para inicializar las etapas, calculos, variables... de las etapas
 * @param {Array} etapaDeF Array que contiene la información de las etapas
 * @returns Devolvemos las variables con la información requerida
 */
function inicializarVariablesEtapas(etapaDeF) {
    /**Almacenamos en variables el contenido de los calculos */
    const referenciaComponente = etapaDeF.referencia_componente;
    const id_etapa = etapaDeF.id;
    const nombre_etapa = etapaDeF.nombre;
    const distancia_total = etapaDeF.distancia_total ? etapaDeF.distancia_total : '0';
    const PS14 = etapaDeF.PS14 ? etapaDeF.PS14 : '0';
    const DS10 = etapaDeF.DS10 ? etapaDeF.DS10 : '0';
    const CDL = etapaDeF.CDL ? etapaDeF.CDL : '0';
    const M1 = etapaDeF.M1 ? etapaDeF.M1 : '0';
    const DC113 = etapaDeF.DC113 ? etapaDeF.DC113 : '0';
    const CDC = etapaDeF.CDC ? etapaDeF.CDC : '0';
    const PS15 = etapaDeF.PS15 ? etapaDeF.PS15 : '0';
    const DI21 = etapaDeF.DI21 ? etapaDeF.DI21 : '0';
    const DS14 = etapaDeF.DS14 ? etapaDeF.DS14 : '0';
    const DS15 = etapaDeF.DS15 ? etapaDeF.DS15 : '0';
    const DC = etapaDeF.DC ? etapaDeF.DC : '0';
    const D1 = etapaDeF.D1 ? etapaDeF.D1 : '0';
    const W5 = etapaDeF.W5 ? etapaDeF.W5 : '0';
    const W5_2 = etapaDeF.W5_2 ? etapaDeF.W5_2 : '0';
    const TT = etapaDeF.TT ? etapaDeF.TT : '0';
    const TT_2 = etapaDeF.TT_2 ? etapaDeF.TT_2 : '0';
    const AL = etapaDeF.AL ? etapaDeF.AL : '0';
    const G1 = etapaDeF.G1 ? etapaDeF.G1 : '0';
    const P5 = etapaDeF.P5 ? etapaDeF.P5 : '0';
    const num_picadas = etapaDeF.numero_picadas ? etapaDeF.numero_picadas : '0';
    const actividad_minutos = etapaDeF.actividad_minutos ? etapaDeF.actividad_minutos : '0';
    const actividad_minutos_picadas = etapaDeF.actividad_minutos_picadas ? etapaDeF.actividad_minutos_picadas : '0';
    const tiempo_distancia_total = etapaDeF.tiempo_distancia_total ? etapaDeF.tiempo_distancia_total : '0';
    
    //Devolvemos las variables
    return { referenciaComponente, id_etapa, nombre_etapa, distancia_total, PS14, DS10, CDL, M1, DC113, CDC, PS15, DI21, DS14, DS15, DC, D1, W5, W5_2, TT, TT_2, AL, G1, P5, num_picadas, actividad_minutos, actividad_minutos_picadas, tiempo_distancia_total };
}


/**
 * Función para calcular la saturación total de todos los puestos
 * @param {*} conteosPorPuesto Argumento que contiene la información de los puestos
 * @returns Devuelve la saturación total de todos los puestos
 */
function calcularSaturacionTotal(conteosPorPuesto) {
    //Almacenamos en una variable el tiempo total en minutos 
    const jornadaPorPuesto = 442;
    const numeroDePuestos = conteosPorPuesto.length;
    const jornadaTotal = jornadaPorPuesto * numeroDePuestos;

    //Suamos el tiempo utilizado en todos los puestos
    const tiempoUtilizadoTotal = conteosPorPuesto.reduce((suma, puesto) => suma + puesto.conteo, 0);

    //Caulculamos la saturación total como porcentaje
    const saturacionTotal = (tiempoUtilizadoTotal / jornadaTotal) * 100;

    //Devolvemos la saturación total
    return saturacionTotal.toFixed(2);
}

/**
 * Función para obtener el código MTM3 usando el ID de la máquina utilizada
 * @param {int} machine_used Argumento que contiene el ID de la máquina utilizada (machine used)
 * @returns Devuelve el código MTM3
 */
function obtenerCodigoMTM3(machine_used) {
    //Declaramos la variable que almacenará el código MTM3
    let code_MTM3 = "";

    //Preparamos la solicitud GET para obtener el código MTM3
    return fetch(`/app/api/obtenerCodigoMTM3/${machine_used}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching data');
            }
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Asignamos a code_MTM3 el código obtenido de la consulta
            code_MTM3 = data[0].code_MTM3;

            //Devolvemos el código MTM3
            return code_MTM3;
        })

        //Controlamos los datos
        .catch(error => {
            console.error("Error fetching code_MTM3:", error);
            return "";
        });
}

/**
 * Función para ocultar la información de la etapa
 * @param {int} id Argumento que contiene el ID de la etapa del puesto
 */
function toggleVisibility(id) {
    const content = document.getElementById(id);
    content.classList.toggle('hidden');
}

/**
 * Función para obtener las referencias de los componentes
 * @param {int} puesto_id Argumento que contiene el ID del puesto
 */
function buscadorReferencias(puesto_id) {
    //const tipo_operacion = document.getElementById('bbdd').value;

    console.log("Dentro de la función")

    //Preparamos la petición GET para obtener las referencias y disponerlas en un modal dependiendo de la operación y del turno del puesto
    fetch(`/app/api/obtener-referencias/${puesto_id}}`, {
        method: "GET"
    })
        .then(response => {
            //En caso de que haya salido mal
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos los datos obtenidos
            return response.json();
        })

        .then(data => {
            //Llamamos a la función para disponer las referencias dentro de la tabla
            disponerReferenciasBuscador(data, puesto_id)
        });
}

/**
 * Función para disponer las referencias dentro de la tabla con un buscador
 * @param {Array} data  Argumento que contiene los datos de cada referencia
 * @param {*} puesto_id Argumento que representa el ID del puesto
 */
function disponerReferenciasBuscador(data, puesto_id) {
    //Ocultamos el modal principal
    $('#modal').modal('hide');

    //Configuramos el titulo del modal
    $('#modalInformeFinal .modal-title').text("Referencias obtenidas:");

    //Configuramos el cuerpo del modal
    $('#modalInformeFinal .modal-body').html(`
        <div>
            <input type="text" id="searchInput" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Buscar referencia...">
        </div>
        <div id="table-container" class="overflow-x-auto mt-4">
            <table class="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
                <thead>
                    <tr class="bg-gray-100">
                        <th>Referencias</th>
                    </tr>
                </thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>
    `);

    //Configuramos el footer del modal
    $('#modalInformeFinal .modal-footer').html(`
        <button id="saveSelected" type="button" class="btn btn-outline-light">Guardar selección</button>
    `);

    //Creamos una instancia del cuerpo de la tabla
    let tbody = $('#tableBody');

    //Creamos una variable donde almacenará el contenido de la fila
    let fila_informacion = "";

    //Iteramos por las referencias
    data.forEach(item => {
        //Asignamos el HTML por cada referencia
        fila_informacion += `<tr class="cursor-pointer" data-ref="${item.referencia_componente}"><td>${item.referencia_componente}</td></tr>`;
    });

    //Añadimos el contenido de la tabla al cuerpo de la tabla
    tbody.html(fila_informacion);

    let selectedReferences = new Set();

    //Manejador de selección/deselección
    $('#tableBody tr').on('click', function () {
        //Creamos una variable con la fila seleccionada
        let ref = $(this).attr('data-ref');
        if (selectedReferences.has(ref)) {
            selectedReferences.delete(ref);
            $(this).removeClass('bg-blue-200 text-white font-bold');
        } else {
            selectedReferences.add(ref);
            $(this).addClass('bg-blue-200 text-white font-bold');
        }
    });

    //Manejador para el buscador
    $('#searchInput').on('input', function () {
        let searchText = $(this).val().toLowerCase();
        $('#tableBody tr').each(function () {
            let text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(searchText));
        });
    });

    //Funcionalidad del botón del guardado de referencias
    $('#saveSelected').on('click', function () {
        let selectedArray = Array.from(selectedReferences);
        referencia_componente = selectedArray.join(" ");

        //Ocultamos el modal
        $('#modalInformeFinal').modal('hide');

        //Llamamos a la función para disponer el modal para añadir unna etapa
        anyadirEtapa(puesto_id);
    });

    //Mostramos el modal
    $('#modalInformeFinal').modal('show');
}

/**
 * Función para añadir una etapa a un puesto
 * @param {int} id_puesto Argumento que contiene el ID del puesto
 */
function anyadirEtapa(id_puesto, operacion, num_picadas) {
    let opcion;
    //Controlamos el valor del argumento "id"... en caso de que el argumento sea NULL
    if (id_puesto === '' || id_puesto === null) {
        //Llamamos al método para mostrar una alerta de aviso
        mostrarAlerta('Error al mostrar el moda de añadir etapa', 'Debes de seleccionar un puesto antes de añadir una etapa', 'error', 0);

        //En cualquier otro caso...
    } else {
        //Configuramos el titulo del modal
        $('#modal .modal-title').text('Introduzca los campos para realizar la busqueda');

        //Configuramos el cuerpo del modal para que el usuario introduzca el referencia del componente y la línea
        $('#modal .modal-body').html(`
            <form id="consultarValores" method="GET">
                <!-- Referencia del componente -->
                <div class="mb-4">
                    <label for="referencia_componente" class="block text-white font-bold mb-2">Referencia del componente:</label>
                    <div class="flex items-center border border-gray-600 rounded-lg bg-white">
                        <input type="text" id="referencia_componente" name="referencia_componente" 
                            class="w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black rounded-l-lg" 
                            placeholder="Ingresa la referencia del componente" required>
                        <button type="button" class="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600" onclick="buscadorReferencias(${id_puesto})">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>

                <!--Numero picadas -->
                <div class="relative inline-block w-64">
                    <label for="numeroPicadas" class="block text-sm font-medium text-white mb-2">Número de UC/UM a mover en simultaneo</label>
                    <select id="numeroPicadas" name="numeroPicadas" class="block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-white">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                    </select>
                </div>

                <!-- Operacion de la categoria -->
                <div class="relative inline-block w-64">
                    <label for="operacion" class="block text-sm font-medium text-gray-700 mb-2">Selecciona una operación</label>
                    <select id="operacion" name="operacion" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="1. Descarga camión en muelle">1. Descarga camión en muelle</option>
                        <option value="2. De imagen camión a stock">2. De imagen camión a stock</option>
                        <option value="3. De stock a estantería">3. De stock a estantería</option>
                        <option value="4. De imagen camión a estantería">4. De imagen camión a estantería</option>
                        <option value="5. De estantería a puesto inferior">5. De estantería a puesto inferior</option>
                        <option value="6. Gestión de residuos">6. Gestión de residuos</option>
                        <option value="7. Apertura">7. Apertura</option>
                        <option value="8. Zipado">8. Zipado</option>
                        <option value="9. Plegado de vacíos">9. Plegado de vacíos</option>
                        <option value="10. De stock exterior a stock interior">10. De stock exterior a stock interior</option>
                    </select>
                </div>

                <!-- Botón obtener información -->
                <div class="mt-6">
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300">Obtener información <i class="bi bi-info-circle-fill"></i></button>
                </div>
            </form>
        `);

        //Ocultamos el footer del modal
        $('#modal .modal-footer').html('');

        //Mostramos el modal
        $('#modal').modal('show');

        //En caso de que la variable ya tenga referencias...
        if (referencia_componente !== null) {
            //Las añadimos al campo de las referencias
            document.getElementById('referencia_componente').value = referencia_componente;
        }

        // Si se pasa la operación como argumento
        if (operacion) {
            // Preseleccionamos la operación en el dropdown
            const operacionSelect = document.getElementById('operacion');
            operacionSelect.value = operacion; // Establecemos el valor de la operación seleccionada

            // Deshabilitamos el dropdown para evitar que el usuario lo cambie
            operacionSelect.disabled = true;
            opcion = 2;
        }

        // Si se pasa el numero de picadas como argumento
        if (num_picadas) {
            // Preseleccionamos el numero de picadas en el dropdown
            const picadasSelect = document.getElementById('numeroPicadas');
            picadasSelect.value = num_picadas; // Establecemos el valor del numero de picadas seleccionado

            
            opcion = 2;
        }

        //Añadimos la funcionalidad para el formulario de consultar la información usando la referencia del componente y la linea
        $('#consultarValores').on('submit', async function (e) {
            //Paramos la propagación
            e.preventDefault();

            //Almacenamos en una variable global la referencia del componente
            referencia_componente = document.getElementById('referencia_componente').value;

            console.log("REFE => ", referencia_componente)

            //Almacenamos en una variable el número de picadas
            numero_picadas = document.getElementById('numeroPicadas').value;

            //Almacenamos en la variable global la operación seleccionada
            operacion_seleccionada = document.getElementById('operacion').value;

            //Preparamos la petición GET para obtener las referencias válidas
            fetch(`/app/api/comprobarReferencias/${referencia_componente}`, {
                method: "GET"
            })
                //Controlamos la respuesta
                .then(response => {
                    //En caso de que no este bien
                    if (!response.ok) {
                        throw new Error('Error fetching data');
                    }

                    //Devolvemos los datos obtenidos
                    return response.json();
                })

                //Controlamos los datos
                .then(data => {
                    //Almacenamos en una variable las referencias válidas
                    const referencias_validas = data.validReferences;
                    referencia_componente = referencias_validas;

                    console.log("REFES -> ", referencias_validas)

                    //En caso de que no haya referencias válidas
                    if (referencias_validas.length === 0) {
                        //Llamamos a la función para disponer una alerta para informar al usuario
                        mostrarAlerta('Error', 'No hay referencias válidas', 'error', null);

                        //Cerramos el modal principal
                        $('#modal').modal('hide');

                        //Paramos la propagación
                        return;
                    }

                    subirEtapa(id_puesto, operacion, num_picadas, opcion);
                });
        });
    }
}


/**
 * Función para obtener el valor de la carga
 * @param {String} item Argumento que contiene la referencia
 * @param {int} cantidad_a_expedir Argumento que contiene la cantidad a expedir de dicha referencia
 * @param {String} tipo_operacion Argumento que contiene el tipo de la operación
 * @param {String} tipo_carga Argumento que contiene el tipo de carga
 */
function obtenerValorCarga(item, cantidad_a_expedir, tipo_operacion, tipo_carga) {
    console.log("Referencia: ", item)

    //Preparamos la petición GET
    fetch(`/app/api/obtenerEmbalajes/${item}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que no haya salido bien
            if (!response.ok) {
                //Llamamos a la función para mostrar la alerta para informar al usuario
                mostrarAlerta('Error al obtener el valor de la carga', 'La referencia no pertenece al turno del puesto', 'error', 0);
            }

            //Devolvemos los datos
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Almacenamos en una variable el número de embalajes redondeado a la alta
            const numero_embalajes = data.cantidad

            console.log("Numero de embalajes: ", numero_embalajes, "\tValor de carga: ", valor_carga, "\tCantidad a expedir: ", cantidad_a_expedir)

            console.log("\n>>>>>> Item: ", item, "\tNumero embalaje: ", numero_embalajes)

            const referencia_embalaje_datos = {}

            //Añadimos las referencias junto a sus numeros de embalajes en el diccionario
            referencia_embalaje_datos[item] = numero_embalajes;

            //Almacenamos en la variable global el diccionario de las referencias junto al numero de embalajes
            referencia_embalaje = referencia_embalaje_datos;

            //Llamamos a la función para añdir la etapa
            anyadirEtapaFinal(numero_embalajes);
        })

        .finally(() => {
            //Llamamos a la función para recargar la página
            mostrarAlerta("Etapa/s creada/s", null, null, 1);
        });
}

/**
 * Función para añadir la etapa
 */
function anyadirEtapaFinal(id_puesto, operacion_seleccionada, num_picadas, numero_embalajes) {
    console.log('id_puesto:', id_puesto);
    console.log('operacion_seleccionada:', operacion_seleccionada);
    //Serializamos el diccionario con las referencias y el número de embalahjes
    referencia_embalaje = encodeURIComponent(JSON.stringify(referencia_embalaje));

    if(id_puesto){
        puestoID = id_puesto;
    }
    
    if(num_picadas){
        numero_picadas = num_picadas;
    }

    console.log('id_puesto:', puestoID);

    //Iniciamos la solicitud GET para añadir la etapa al puesto
    /*fetch(`/app/api/anyadirEtapa/${puestoID}/${referencia_embalaje}/${encodeURIComponent(operacion_seleccionada)}/${numero_picadas}/${numero_embalajes}`, {
        method: "POST"
    });*/

    fetch(`/app/api/anyadirEtapa/${puestoID}/${referencia_embalaje}/${encodeURIComponent(operacion_seleccionada)}/${numero_picadas}`, {
        method: "POST"
    });
}

/**
 * Función para cerrar el modal principal y mostrar el modal de informe
 */
function mostrarModalInforme() {
    //Cerramos el modal principal
    $('#modal').modal('hide');

    //Cuando se abrá el modal
    $('#modal').on('hidden.bs.modal', function () {
        //Limpiamos el contenido de la tabla en el modal de informe
        $('#modalInformeFinal .modal-body table tbody').empty();

        //Mostramos el modal de informe
        $('#modalInformeFinal').modal('show');

        //Eliminamos el event listener para evitar múltiples disparos
        $('#modal').off('hidden.bs.modal');
    });
}


/**
 * Función para disponer la información en el modal
 * @param {String} referencia Argumento que contiene la referencia
 * @param {int} cantidad_a_expedir Argumento que contiene la cantidad a expedir
 * @param {int} valor_carga Aregumento que contiene el valor de la carga
 * @param {int} numero_embalajes Argumento que contiene el número de ambalajes a mover
 */
/*function disponerInformacionModal2(referencia, cantidad_a_expedir, valor_carga, numero_embalajes) {
    //Creamos una instancia del cuerpo de la tabla
    let tbody = $('#modalInformeFinal .modal-body table tbody');

    //En caso de que la tabla no exista
    if (tbody.length === 0) {
        //Añadimos la tabla al cuerpo del modal
        $('#modalInformeFinal .modal-body').html(`
            <div id="table-container" class="overflow-x-auto mt-6">
                <table class="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
                    <thead>
                        <tr class="bg-gray-100">
                            <th>Referencia del componente</th>
                            <th>Tipo de carga</th>
                            <th>Pieza por tipo de carga</th>
                            <th>Cantidad de piezas</th>
                            <th>Número de embalajes</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `);

        //Reasignamos el cuerpo de la tabla
        tbody = $('#modalInformeFinal .modal-body table tbody');
    }

    //Creamos una variable para la fila
    let fila_informacion;

    //En caso de que el número de embalajes sea 0 o NULL
    if (numero_embalajes === 0 || numero_embalajes === null) {
        //Hacemos el campo editable
        fila_informacion = `
            <tr>
                <td>${referencia}</td>
                <td>${tipo_carga}</td>
                <td>${valor_carga}</td>
                <td>${cantidad_a_expedir}</td>
                <td>
                    <input type="number" 
                        class="form-input border rounded p-1 referencia-embalaje" 
                        data-referencia="${referencia}" 
                        value="${numero_embalajes}" />
                </td>
            </tr>
        `;

        //Inicializamos el diccionario con el valor por defecto
        referencia_embalaje[referencia] = numero_embalajes;

        //En cualquier otro caso
    } else {
        //Asignamos el campo de forma normal
        fila_informacion = `
            <tr>
                <td>${referencia}</td>
                <td>${tipo_carga}</td>
                <td>${valor_carga}</td>
                <td>${cantidad_a_expedir}</td>
                <td>${numero_embalajes}</td>
            </tr>
        `;
    }

    //Añadimos la fila al cuerpo de la tabla
    tbody.append(fila_informacion);

    //Solo añadimos el evento si el campo es editable
    if (numero_embalajes === 0) {
        //Obtenemos la instancia del campo
        tbody.find(`.referencia-embalaje[data-referencia="${referencia}"]`).on('input', function () {
            //Obtenemos el valor del campo
            const nuevoValor = $(this).val();

            //Asignamos el nuevo valor
            referencia_embalaje[referencia] = nuevoValor;
        });
    }
}*/

/**
 * Función para disponer el modal del selector de etapas para las referencias
 */
function mostrarModalEtapas(opcion) {
    //Configuramos el título del modal del selector de etapas
    $('#modal .modal-title').text('Selecciona una etapa');

    //Configuramos el cuerpo del modal
    $('#modal .modal-body').html(`
        <form id="formulario_anyadirEtapa" method="POST">
            <!-- Referencia del componente -->
            <div class="mb-4">
                <label for="referencia_componente" class="block text-gray-700 font-bold mb-2">Referencia del componente:</label>
                <input type="text" id="referencia_componente" name="referencia_componente" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${referencia_componente}" disabled>
            </div>

            <!-- Categorias de las etapas -->
            <div class="relative inline-block w-64">
                <label for="categoria" class="block text-sm font-medium text-gray-700 mb-2">Selecciona una categoría</label>
                <select id="categoria" name="categoria" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="descarga_carga">DESCARGA/CARGA</option>
                    <option value="compras">COMPRAS</option>
                    <option value="preparacion">PREPARACIÓN</option>
                    <option value="distribucion">DISTRIBUCIÓN</option>
                    <option value="varios">VARIOS</option>
                    <option value="gestion_de_vacios_y_residuos">GESTIÓN DE VACÍOS Y RESIDUOS</option>
                    <option value="operaciones_manuales">OPERACIONES MANUALES</option>
                </select>
            </div>

            <!-- Operacion de la categoria -->
            <div class="relative inline-block w-64">
                <label for="operacion" class="block text-sm font-medium text-gray-700 mb-2">Selecciona una operación</label>
                <select id="operacion" name="operacion" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">

                </select>
            </div>

            <!-- Botón de continuar -->
            <div class="mt-6">
                <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300">Continuar</button>
            </div>
        </form>
    `);

    //Añadimos la funcionalidad para el dropdown de la categoria cada vez que cambie
    document.getElementById('categoria').addEventListener('change', actualizarOperacion);

    //Llamamos al método para inicializar los dropdown
    actualizarOperacion();

    //Añdiamos la funcionalidad para el dropdown de la categoria
    $('#categoria').on('change', function () {
        //Almacenamos la categoria seleccionada
        categoria_seleccionada = $(this).val();

        //Creamos una instancia el dropdown de las operaciones
        const dropdown_operaciones = $('#operacion');

        //Limpiamos las operaciones
        dropdown_operaciones.empty();

        //Hacemos un match para obtener las operaciones de la categoria
        if (categoria_seleccionada) {
            operaciones[categoria_seleccionada].forEach(function (op) {
                dropdown_operaciones.append(`<option value="${op.value}">${op.text}</option>`);
            });
        }
    });

    //Añadimos la operación cada vez que se seleccione una operación
    $('#operacion').on('change', function () {
        //Almacenamos la operación seleccionada
        operacion_seleccionada = $(this).val();
    });

    //Mostramos el modal
    $('#modal').modal('show');

    //Llamamos a la función para añadir la etapa al puesto
    subirEtapa(opcion);
}

/**
 * Función para añadir una etapa
 * @param {int} opcion Argumento para saber si es una operacion añadida de forma manual
 */
function subirEtapa(id_puesto, operacion, num_picadas, opcion) {
    console.log("Refs: ", referencia_componente);

    //Separamos las referencias finales
    let referencias_finales = Array.isArray(referencia_componente)
        ? referencia_componente
        : referencia_componente.split(',');

    console.log("Referencias: ", referencias_finales);

    //Serializamos el diccionario con las referencias y el número de embalajes
    referencia_embalaje = encodeURIComponent(JSON.stringify(referencias_finales));

    //En caso de que opcion sea 1
    if (opcion == 1) {
        //Llamamos a la función para subir la referencia manual
        subirEtapaManual(referencia_embalaje);
    }

    if(operacion){
        operacion_seleccionada = operacion;
    }

    let referenciasQuery = referencias_finales.join(',');

    console.log("SUBIR ETAPA -> ", operacion);

    console.log("REF: ", referenciasQuery);

    fetch(`/app/api/obtenerDatos/${referenciasQuery}/${puestoID}`, {
        method: "GET"
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching data');
            }
            return response.json();
        })
        .then(data => {
            let referencia_embalaje_datos = {};

            data.forEach(item => {
                let numero_embalajes = item.cantidad;

                referencia_embalaje_datos[item.referencia_componente] = numero_embalajes;
            });

            referencia_embalaje = referencia_embalaje_datos;

            anyadirEtapaFinal(id_puesto, operacion_seleccionada, num_picadas);
        })
        .finally(() => {
            //mostrarAlerta("Etapa/s creada/s", null, null, 1);
            //Creamos un array con los datos que tenemos que enviar
            // const rowData = [

            // ];

            // //Comvertimos el array a JSON
            // const rowDataJson = encodeURIComponent(JSON.stringify(rowData));

            // //Abrimos la página del plano en una nueva pestaña
            // window.open(`/app/visualizarPlano?data=${rowDataJson}`, '_blank');

            if(opcion === 2){
                mostrarAlerta("Etapa/s creada/s", null, null, 1);
            } else {
                //Alerta
                Swal.fire({
                    title: 'Espere',
                    text: 'Añadiendo etapas',
                    icon: 'info',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        setTimeout(2000);
                        Swal.fire({
                            title: 'Etapas añadidas',
                            text: '¿Deseas añadir la información del plano?',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Sí',
                            cancelButtonText: 'No'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                // Si confirma, abrir el plano en una nueva pestaña
                                //visualizarPlano(puestoID, operacion_seleccionada);
                                // ************* MODAL EDITAR METROS *************
                                // Cerrar el modal actual
                                Swal.close();

                                // Recargar la página después de un pequeño retraso
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000); // Puedes ajustar este tiempo según sea necesario
                            } else if (!result.isConfirmed){
                                window.location.reload();
                            } else {
                                Swal.close();
                            }
                        });
                        /*setTimeout(() => {
                            Swal.close();
                            alertaFinalizacionEtapa(puestoID, operacion_seleccionada);
                        }, 6000);*/
                        //Swal.close();
                        //alertaFinalizacionEtapa(puestoID, operacion_seleccionada);
                    }
                });
            }
            
        });
}


/**
 * Función para cargar el mapa
 * @param {int} puesto_id Argumento que contiene el ID del puesto
 * @param {String} operacion_seleccionada Argumento que contiene el nombre de la operación seleccionada
 */
/*function cargarPlano(puesto_id, operacion_seleccionada) {
    //Creamos un array con los datos necesarios
    const rowData = [
        puesto_id,
        operacion_seleccionada
    ];

}*/

/**
 * Función para controlar la respuesta
 * @param {*} response Argumento que contiene la respuesta del backend
 */
function controlarRespuesta(response) {
    //En caso de que haya salido bien
    if (response.status === 201) {
        mostrarAlerta("Etapa creada", null, null, 1);

        //En caso de que haya salido mal
    } else if (response.status === 501) {
        mostrarAlerta("Error en la creación de la etapa", "Se ha producido un error a la hora de crear la etapa", "error", 0);

        //En cualquier otro caso...
    } else {
        mostrarAlerta("Estado no controlado", "No se ha sido capaz de controlar el estado de la creación de la etapa", "question", null);
    }
}

/**
 * Función para mostrar la alerta
 * @param {String} titulo Argumento que contiene el titulo de la alerta
 * @param {String} mensaje Argumento que contiene el mensaje de la alerta
 * @param {String} icono Argumento que contiene el nombre del icono
 * @param {int} opcion Argumento que contiene la opción de configuración de la alerta
 */
function mostrarAlerta(titulo, mensaje, icono, opcion) {
    //Controlamos la creación de la alerta usando el argumento "opcion"
    if (opcion === 1) {
        //Creamos una variable para configurar el timer
        let timerInterval;

        //Configuramos la alerta
        Swal.fire({
            title: titulo,
            html: "Recargando página, por favor espere <b></b> milliseconds...",
            timer: 500,
            allowOutsideClick: false,
            timerProgressBar: true,
            didOpen: () => {
                Swal.showLoading();
                const timer = Swal.getPopup().querySelector("b");
                timerInterval = setInterval(() => {
                    timer.textContent = `${Swal.getTimerLeft()}`;
                }, 100);
            },
            willClose: () => {
                clearInterval(timerInterval);
            }

            //Cuando el timer haga su cuenta atras
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
                //Recargammos la página
                window.location.reload();
            }
        });

        //En caso de que el valor de opcion sea 0 o null
    } else if (opcion == 0 || opcion === null) {
        Swal.fire({
            icon: icono,
            title: titulo,
            text: mensaje
        });
    }
}

/**
 * Función para visualizar la información de una etapa
 * @param {String} etapa_nombre Argumento que contiene el nombre de la etapa
 * @param {String} referencia_componente Argumento que contiene la referencia del componenten
 * @param {int} puesto_id Argumento que contiene el ID del puesto
 */
function editarDistancia(id_puesto, operacion) {
    if (id_puesto === '' || id_puesto === null) {
        //Llamamos al método para mostrar una alerta de aviso
        mostrarAlerta('Error al mostrar el moda de añadir etapa', 'Debes de seleccionar un puesto antes de añadir una etapa', 'error', 0);

        //En cualquier otro caso...
    } else {
        //Configuramos el titulo del modal
        $('#modal .modal-title').text(`Editar etapa`);

        //Configuramos el cuerpo del modal para que el usuario introduzca el referencia del componente y la línea
        $('#modal .modal-body').html(`
            <form id="actualizarEtapa" method="GET">
                <!--Distancia -->
                <div class="relative inline-block w-full mb-4">
                    <label for="distancia" class="block text-sm font-medium text-white mb-2">Introduzca la distancia a recorrer por el carretillero</label>
                    <input  id="distancia" name="distancia" class="block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-white" placeholder="Distancia a recorrer" required>
                </div>


                <!-- Botón actualizar -->
                <div class="mt-6">
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300">Actualizar etapa</button>
                </div>
            </form>
        `);

        //Ocultamos el footer del modal
        $('#modal .modal-footer').html('');

        $('#modal .modal-dialog').css('max-width', '450px');

        //Mostramos el modal
        $('#modal').modal('show');
    

        $('#actualizarEtapa').on('submit', async function (e) {
            //Paramos la propagación
            e.preventDefault();

            //Almacenamos en una variable el número de picadas
            numero_picadas = document.getElementById('distancia').value;
            console.log("Distancia: ", operacion)

            //Preparamos la petición GET para actualizar la etapa
            fetch(`/app/api/actualizarEtapa/${id_puesto}/${operacion}/${numero_picadas}/2`, {
                method: "PUT"
            })
                // Controlamos los datos
                .then(response => {
                    if (response.status === 200) {
                        mostrarAlerta('Etapas actualizadas correctamente', null, null, 1);
                    } else {
                        mostrarAlerta('Error', 'Ha fallado', 'error', 0);
                    }
                })
                .catch(error => {
                    console.error('Error en la solicitud:', error);
                    mostrarAlerta('Error', 'No se pudo conectar al servidor', 'error', 0);
                });
        });
    }

    
}

/**
 * Función para obtener la información de las etapas
 * @param {int} id_etapa Argumento que contiene el ID de la etap
 */
function disponerTablaOperaciones(id_etapa) {
    console.log("ID de la etapa dentro de la etapa de las opciones: ", id_etapa);

    //Preparamos la petición GET para obtener los valores de cada etapa
    fetch(`/app/api/obtenerInformacionEtapa_Valores/${id_etapa}`, {
        method: "GET"
    })

        //Controlamos la respuesta
        .then(response => {
            //En caso de que la respuesta no sea buena
            if (!response.ok) { throw new Error('Error fetching data'); }

            //Devolvemos los valores
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Declaramos las variables globales donde se almacenerán los datos obtenidos
            let fStandard, cantidad_a_mover, distancia_total, numero_curvas;

            //Iteramos por los datos obtenidos
            data.forEach(item => {
                /** Almacenamos los datos obtenidos en las variables globales */
                fStandard = item.F;
                cantidad_a_mover = item.cantidad_a_mover;
                distancia_total = item.distancia_total;
                numero_curvas = item.numero_curvas;
            });
        });
}


/**8
 * Función para disponer una alerta dependiendo del tipo de respuesta
 * @param {*} response Argumento que contiene la respuesta
 */
function controlarRespuesta_Etapa(response) {
    //Añadimos un control a la respuesta... en caso de que haya salido bien
    if (response.status === 501) {
        mostrarAlerta("Error", "Error en la actualización de la etapa", 'error', 0);

        //En caso de que haya salido bien...
    } else if (response.status === 201) {
        mostrarAlerta("Etapa actualizada", null, null, 1);

        //En otro caso...
    } else {
        mostrarAlerta("Estado no controlado", "No se ha sido capaz de controlar el estado de la creación del puesto", "question", null);
    }
}


/***
 * Función para llamar al end point para eliminar el registro
 * @param {int} id_elemento Argumento que contiene el ID del elemento a eliminar
 * @param {String} tabla Argumento que contiene el nombre de la tabla del elemento a eliminar
 * @param {int} id_puesto Argumento que contiene el ID del puesto
 */
function eliminarRegistro(tipo, id_elemento, tabla, id_puesto) {
    console.log("TIPO: ", tipo, "ID ELEMENTO: ", id_elemento, "TABLA: ", tabla, "ID PUESTO: ", id_puesto);
    //Preparamos la solicitud DELETE
    fetch(`/app/api/eliminarRegistro/${id_elemento}/${tabla}/${id_puesto}`, {
        method: "DELETE"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que todo haya salido bien
            if (response.status === 201) {
                switch (tipo) {
                    case "puesto":
                        mostrarAlerta("Eliminando puesto", null, null, 1);
                        break;
                    case "etapa_global":
                        mostrarAlerta("Eliminando etapas", null, null, 1);
                        break;
                    case "etapa_referencia":
                        mostrarAlerta("Eliminando etapa", null, null, 1);
                        break;
                }
                //En caso de que falle
            } else if (response.status === 501) {
                mostrarAlerta("Error en la creación del puesto", "Se ha producido un error a la hora de crear el puesto", "error", 0);

                //En casos no controlados
            } else {
                mostrarAlerta("Estado no controlado", "No se ha sido capaz de controlar el estado de la creación del puesto", "question", null);
            }
        });
}

/**
 * Función para dar funcionalidad al buscador
 */
function buscarEtapas() {
    //Creamos una instancia del buscador
    const buscador = document.getElementById('buscadorEtapa').value.toLowerCase();

    //Almacenamos todas las etapas
    const etapas = document.querySelectorAll('.mb-4');

    //Iteramos por todas las etapas
    etapas.forEach(function (etapa) {
        /** Almacenamos en variable la información de todas las etapas */
        const etapaTexto = etapa.querySelector('span') ? etapa.querySelector('span').textContent.toLowerCase() : '';
        const descripcionTexto = etapa.querySelector('span:nth-of-type(2)') ? etapa.querySelector('span:nth-of-type(2) strong')?.textContent.toLowerCase() : '';
        const componenteTexto = etapa.querySelector('span:nth-of-type(3)') ? etapa.querySelector('span:nth-of-type(3) strong')?.textContent.toLowerCase() : '';
        const lineaTexto = etapa.querySelector('span:nth-of-type(4)') ? etapa.querySelector('span:nth-of-type(4) strong')?.textContent.toLowerCase() : '';
        const tiempoTexto = etapa.querySelector('span:nth-of-type(5)') ? etapa.querySelector('span:nth-of-type(5) strong')?.textContent.toLowerCase() : '';

        //En caso de que la busqueda encuentre resultados
        if (etapaTexto.includes(buscador) || descripcionTexto.includes(buscador) || componenteTexto.includes(buscador) || lineaTexto.includes(buscador) || tiempoTexto.includes(buscador)) {
            //Mostramos la etapa
            etapa.style.display = '';

            //De los contrario
        } else {
            //Ocultamos la etapa
            etapa.style.display = 'none';
        }
    });
}

/**
 * Función para mostrar el modal para gestionar la etapa
 * @param {int} id_etapa Argumento que contiene el ID de la etapa
 */
function gestionarEtapa(id_etapa) {
    //Preparamos la solicitud GET para obtener todos los puestos
    fetch('/app/api/obtenerPuestos', {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que la respuesta no sea correcta
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos la respuesta
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Creamos una variable donde se almacenarán los puestos disponibles
            let opciones = data.map(item => `<option value="${item.id}">${item.nombre_puesto}</option>`).join("");

            //Configuramos el titulo del modal
            $('#modal .modal-title').text('Gestión de etapas');

            //Configure the body of the modal
            $('.modal-body').html(`
                <form id="gestionarEtapa" method="POST">
                    <!-- Select para los puestos -->
                    <div class="mt-6">
                        <label for="puesto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seleccione un puesto para gestionar la etapa</label>
                        <select id="puesto" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-white dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                            ${opciones}
                        </select>
                    </div>

                    <!-- Select para las opciones -->
                    <div class="mt-6">
                        <label for="gestion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seleccione una opción para gestionar la etapa</label>
                        <select id="gestion" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-white dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                            <option value="copiar">Copiar</option>
                            <option value="mover">Mover</option>
                        </select>
                    </div>

                    <!-- Botón de continuar -->
                    <div class="mt-6">
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300">Aceptar</button>
                    </div>
                </form>
            `);

            //Aplicamos la funcionalidad al formulario
            $('#gestionarEtapa').on('submit', async function (e) {
                //Paramos la propagación
                e.preventDefault();

                /** Almacenamos en variables las opciones elegidas */
                const id_puesto = document.getElementById('puesto').value, gestion = document.getElementById('gestion').value;

                //Preparamos la solicitud POST para llamar al end point para gestionar la etapa
                fetch(`/app/api/gestionarEtapa/${id_etapa}/${id_puesto}/${gestion}`, {
                    method: "POST"
                })
                    //Controlamos la respuesta
                    .then(response => {
                        console.log("Response: ", response);
                        //En caso de que todo haya salido bien
                        if (response.status === 201) {
                            //Configuramos la alerta para dar un aviso a la persona
                            Swal.fire({
                                title: "Etapa gestionada",
                                text: "¡Recuerda que debes de actualizar la información del plano!",
                                icon: "warning",
                                confirmButtonText: "De acuerdo",
                                allowOutsideClick: false
                            });

                            //En caso de que haya fallado
                        } else if (response.status === 501) {
                            mostrarAlerta("Error", "Se ha producido un error en la gestión de la etapa", "error", 0);

                            //En cualquier otro caso
                        } else {
                            mostrarAlerta("Estado no controlado", "No se ha sido capaz de controlar el estado de la creación del puesto", "question", null);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            });

            //Configuramos el footer del modal
            $('#modal .modal-footer').html('');

            //Mostramos el modal
            $('#modal').modal('show');
        })
}

/**
 * Función para configurar y mostrar el modal de selección de la planta
 */
/*function mostrarModalSeleccionPlanta() {
    //Configuramos el modal para que no se pueda cerrar
    $('#modalPlanta').modal({
        backdrop: 'static',
        keyboard: false
    });

    //Mostramos el modal
    $('#modalPlanta').fadeIn()
}*/

/**
 * Función para establecer la planta seleccionada
 */
/*function establecerPlanta() {
    //Almacenamos en una variable global la planta seleccionada
    planta = document.getElementById('planta').value;
    console.log("Planta: ", planta)

    //Llamamos a la función para almacenar la cookie
    setCookie("planta", planta, 30);

    console.log("Cookie almacenada: ", getCookie("planta"))

    //Ocultamos el modal del selector de planta
    $('#modalPlanta').fadeOut();

    //Llamamos a la función para establecer la planta seleccionada
    establecerPlantaSeleccionada(null);
}*/

/**
 * Función para establecer en el botón la planta seleccionada
 */
/*function establecerPlantaSeleccionada(planta_seleccion) {
    //En caso de que planta sea NULL
    if (planta_seleccion === '' || planta_seleccion === null) {
        //Almacenamos en una variable el valor seleccionado
        let planta_seleccionada = document.getElementById('planta').options[document.getElementById('planta').selectedIndex].text;

        console.log("Planta seleccionada: ", planta_seleccionada);

        //Establecemos el nombre de la planta seleccionada
        document.getElementById('plantaSeleccionada').innerHTML = `
            <span><h3>${planta_seleccionada}</span><br><i class="bi bi-house"></i></h3>
        `;

        //Llamamos a la función para establecer la cookie
        setCookie("planta", document.getElementById('planta').value, 30);

        //Estabecemos la planta en la variable global
        planta = document.getElementById('planta').value;

        //En caso de que haya un valor
    } else {
        //Establecemos el nombre de la planta seleccionada
        document.getElementById('plantaSeleccionada').innerHTML = `
            <span><h3>${obtenerPlantaPorCodigo(planta_seleccion)}</span><br><i class="bi bi-house"></i></h3>
        `;

        //Almacenamos en la variable global la planta seleccionada
        planta = planta_seleccion;

        //Llamamos a la función para establecer la cookie
        if (diccionario_plantas[planta_seleccion]) {
            setCookie("planta", diccionario_plantas[planta_seleccion], 30);
        } else {
            setCookie("planta", planta_seleccion, 30);
        }
    }
}*/

/**
 * Función para obtener el nombre de la planta 
 * @param {String} codigo Argumento que contiene el codigo de la planta
 * @returns Devuelve el nombre de la planta
 */
/*function obtenerPlantaPorCodigo(codigo) {
    return Object.entries(diccionario_plantas).find(([key, value]) => value === codigo)?.[0] || null;
}*/

/**
 * Función para configurar la disposición del input de la línea
 */
function configurarLinea() {
    //Creamos una intancia del tipo de operación
    const bbdd = document.getElementById('bbdd');

    //Creamos una instancia del contenedor de la línea
    const contenedorLinea = document.getElementById('contenedorLinea');

    //Creamos el eveneto para el dropdown del tipo de operación
    bbdd.addEventListener('change', (event) => {
        //Almacenamos en una variable el tipo de operación
        const tipoOperacion = event.target.value;

        //Almacenamos en la variable global el tipo de operación
        tipo_operacion = tipoOperacion;

        //Creamos un switch para controlar el tipo de operación
        switch (tipoOperacion) {
            //En caso de las opciones sean programa de expedición o programa de recepción...
            case 'Programa_Expedicion_Forklift':
            case 'Programa_Recepcion':
            case 'Programa_Fabricacion':
                //Ocultamos el contenedor de la linea
                contenedorLinea.hidden = true;
                break;

            default:
                console.warn("Operación no reconocida:", tipoOperacion);
                break;
        }
    });
}

/**
 * Función para disponer la fecha de inicio y la fecha de fin de los datos disponibles
 * @param {HTMLElement} grafico_principal Argumento que contiene el contenedor del gráfico 
 */
function obtenerTomaDatos(grafico_principal) {
    //Preparamos la peticion GET para obtener las fechas 
    fetch('/app/api/fechaTomaDatos', {
        method: "GET"
    })
        //Controlamos los datos
        .then(response => {
            //En caso de que no haya salido bien
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos los datos
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Almacenamos en una variable la fecha de inicio
            let fecha_actual = document.createElement('h4');
            fecha_actual.textContent = `Fecha de toma de datos:\n ${data.fecha_inicio.split('T')[0]}`;

            //Almacenamos en una variable la fecha de finalización
            let fecha_final = document.createElement('h4');
            fecha_final.textContent = `Fecha de toma de datos:\n ${data.fecha_fin.split('T')[0]}`;

            /**Añadimos ambas fechas al contenedor */
            grafico_principal.append(fecha_actual);
            grafico_principal.append(fecha_final);
        });
}

function graficoPrueba() {
    console.log("Dentro del modal");
    //Configuramos el título del modal
    $('#modal .modal-title').text("");

    //Configuramos el footer del modal
    $('#modal .modal-footer').html(`
        <button type="button" class="btn btn-danger" data-bs-dismiss="modal">Cerrar</button>
    `);

    //Configuramos el cuerpo del modal con el canvas para el gráfico
    $('#modal .modal-body').html('<canvas id="graficoCanvas"></canvas>');

    //Mostramos el modal
    $('#modal').modal('show');

    //Datos del gráfico
    const ctx = document.getElementById('graficoCanvas').getContext('2d');

    //Creamos una variable para contener los datos
    const datos = {
        labels: ['7', '9', '11', '13'],
        datasets: [
            {
                type: 'bar',
                label: 'Porcentaje de Uso',
                data: [40, 55, 30, 80],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            },
            {
                type: 'line',
                label: 'Tendencia',
                data: [50, 50, 50, 50],
                borderColor: 'rgba(255, 99, 132, 1)',
                //backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                fill: true
            }
        ]
    };

    //Configuramos el gráfico
    const config = {
        type: 'bar',
        data: datos,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Horas',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Porcentaje (%)',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff'
                    },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    };

    //Inicializamos el gráfico
    new Chart(ctx, config);
}

/**
 * Función para obtener el primer día
 * @param {String} tipo_operacion Argumento que contiene el nombre de la tabla de la base de datos
 */
function obtenerPrimerDia(tipo_operacion) {
    //Preparamos la petición GET
    fetch(`/app/api/obtenerPrimerDia/${tipo_operacion}`, {
        method: "GET"
    })
        //Controlamos la respuesta
        .then(response => {
            //En caso de que haya fallado
            if (!response.ok) {
                throw new Error('Error fetching data');
            }

            //Devolvemos los datos
            return response.json();
        })

        //Controlamos los datos
        .then(data => {
            //Asignamos el primer día a la variable global
            primer_dia = data[0].primer_dia.split('T')[0];
        });
}

/**
 * Función para subir las etapas manuales
 * @param {Array} referencia_embalaje Aregumento que contiene las referencias finales
 */
function subirEtapaManual(referencia_embalaje) {
    const referencia_embalaje_final = JSON.parse(decodeURIComponent(referencia_embalaje));
    console.log("Referencia embalaje: ", referencia_embalaje_final)
    //Iteramos por las referenicas finales
    Object.keys(referencia_embalaje_final).forEach(referencia => {
        //Preparamos la peticion POST para añadir la etapa manual
        fetch(`/app/api/anyadirEtapaManual/${puestoID}/${encodeURIComponent(JSON.stringify({ [referencia]: referencia_embalaje_final[referencia] }))}/${encodeURIComponent(operacion_seleccionada)}/${mote}/${tipo_operacion}/${numero_picadas}`, {
            method: "POST"
        })

            //Controlamos la respuesta
            .then(response => {
                console.log("> Response: ", response);
            })
    });
}

/**
 * Función para configurar el modal para introducir referencia manuales
 */
function anyadirReferenciaManual() {
    //Configuramos el título del modal
    $('#modal .modal-title').text('Introduzca los campos');

    //Configuramos el cuerpo del modal
    $('#modal .modal-body').html(`
        <!-- Referencia del componente -->
        <div class="mb-4">
            <label for="referencia_componente" class="block text-gray-700 font-bold mb-2" required>Referencia del componente:</label>
            <input type="text" id="referencia_componente" name="referencia_componente" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ingresa la referencia del componente" required>
        </div>

        <!-- Línea -->
        <div class="mb-4" id="contenedorLinea" hidden>
            <label for="linea" class="block text-gray-700 font-bold mb-2">Línea:</label>
            <input type="number" id="linea" name="linea" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Ingresa la línea">
        </div>

        <!-- Descripción -->
        <div class="mb-4">
            <label for="mote" class="block text-gray-700 font-bold mb-2">Descripción:</label>
            <input type="text" id="mote" name="mote" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ingrese una descripción">
        </div>

        <!-- Pieza por tipo de carga -->
        <div class="mb-4">
            <label for="pieza_por_carga" class="block text-gray-700 font-bold mb-2">Pieza por tipo de carga:</label>
            <input type="number" id="pieza_por_tipo_carga" required name="pieza_por_tipo_carga" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Pieza por tipo de carga">
        </div>

        <!-- Cantidad de piezas -->
        <div class="mb-4">
            <label for="cantidad_piezas" class="block text-gray-700 font-bold mb-2">Cantidad de piezas:</label>
            <input type="number" id="cantidad_piezas" name="cantidad_piezas" required class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Cantidad de piezas">
        </div>

        <!-- Numero de embalajes -->
        <div class="mb-4">
            <label for="numero_embalajes" class="block text-gray-700 font-bold mb-2">Número de embalajes:</label>
            <input type="number" id="numero_embalajes" name="numero_embalajes" required class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Número de embalajes">
        </div>

        <!-- Tipo de operación -->
        <div class="relative inline-block w-64 mb-4">
            <label for="bbdd" class="block text-sm font-medium text-gray-700 mb-2">Seleccione perímetro de trabajo</label>
            <select id="bbdd" name="bbdd" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" onclick="configurarLinea()">
                <option value="Programa_Expedicion_Forklift">Expedición</option>
                <option value="Programa_Fabricacion">Fabricación</option>
                <option value="Programa_Recepcion">Recepción</option>
            </select>
        </div>

        <!--Numero picadas -->
        <div class="relative inline-block w-64 mb-4">
            <label for="numeroPicadas" class="block text-sm font-medium text-white mb-2">Coger UC/UM y dejar en stock altura media</label>
            <select id="numeroPicadas" name="numeroPicadas" class="block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-white">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
            </select>
        </div>

        <!-- Tipo de carga -->
        <div class="relative inline-block w-64 mb-4" hidden>
            <label for="tipoCarga" class="block text-sm font-medium text-gray-700 mb-2">Seleccione un tipo de carga</label>
            <select id="tipoCarga" name="tipoCarga" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                <option value="UM">UM</option>
                <option value="UC">UC</option>
            </select>
        </div>

        <!-- Botón vincular etapa -->
        <div class="mt-6">
            <button 
                type="button" 
                class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300" 
                id="btnVincular">
                Vincular a una etapa <i class="bi bi-link-45deg"></i>
            </button>
        </div>
    `);

    //Mostramos el modal
    $('#modal').modal('show');

    //Añadimos un controlador al botón para almacenar los datos del formulario
    document.getElementById("btnVincular").addEventListener("click", function () {
        //Llamamos a la función para almacenar los datos
        almacenarDatosManuales();
    });
}

/**
 * Función para almacenar los datos del formulario
 */
function almacenarDatosManuales() {
    /**Almacenamos los datos del formulario */
    let referencia = document.getElementById('referencia_componente').value;
    mote = document.getElementById('mote').value;
    let pieza_por_carga = document.getElementById('pieza_por_tipo_carga')?.value || "";
    let cantidad_piezas = document.getElementById('cantidad_piezas')?.value || "";
    let numero_embalajes = document.getElementById('numero_embalajes')?.value || "";
    let bbdd = document.getElementById('bbdd')?.value || "";
    let tipo_carga = document.getElementById('tipoCarga')?.value || "";
    let linea = document.getElementById('linea')?.value || "";

    linea = linea;
    numero_picadas = document.getElementById('numeroPicadas').value;

    //Cerramos el modal principal
    //$('#modal').modal('hide');

    //Asignamos la referencia introducida por el usuario en la variable global
    referencia_componente = referencia;

    //Asignamos al diccionario la referencia y el nmúmero de embalajes
    referencia_embalaje[referencia] = numero_embalajes;

    //Almacenamos en la variable global el tipo de operación
    tipo_operacion = bbdd;

    //Llamamos a la funcion para disponer el modal de las etapas
    mostrarModalEtapas(1);
}

/**
 * Función para configurar la funcionalidad de la cookie de la planta
 */
function configurarPlanta() {
    //En caso de que no haya una cookie con la planta seleccionada
    document.getElementById('plantaSeleccionada').innerHTML = `
            <span><h3>Valladolid</span><br><i class="bi bi-house"></i></h3>
        `;
}

/**
 * Función para obtener el valor de la cookie usando el nombre de la misma
 * @param {String} name Argumento que contiene el nombre de la cookie
 * @returns Devuelve el valor de la cookie
 */
function getCookie(name) {
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

/**
 * Función para establecer la información de la cookie
 * @param {String} name Argumento que contiene el nombre de la cookie
 * @param {String} value Argumento que contiene el valor de la cookie
 * @param {Date} days Argumeto que contiene los días de duración de la cookie
 */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + "; path=/" + expires;
}

/**
 * Añadimos la configuación para cuando la página este cargada
 */
window.addEventListener('DOMContentLoaded', function () {
    //Llamamos a la función para establecer la planta
    configurarPlanta();

    //Llamamos a la función para disponer las fechas de la toma de datos
    //obtenerTomaDatos();

    //Llamamos al método para obtener los puestos
    fetchData();

    //Llamamos a la función para obtener el primer día
    //obtenerPrimerDia("Programa_Expedicion_Forklift");

    //Añadimos la funcionalidad al buscador de etapas
    //document.getElementById('buscadorEtapa').addEventListener('input', buscarEtapas);
});