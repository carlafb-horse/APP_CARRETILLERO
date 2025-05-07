//Creamos las variable globales que hacen falta
let referencia_componente = "", operacion_seleccionada, puestoID, conteosPorPuesto = [], numero_picadas;

//Variable global donde almacenarems en un diccionario la referencia y el número de embalajes
let referencia_embalaje = {};

//Variable que contiene los datos para el gráfico de chimenea
let conteoGraficoChimenea = [];

//Variable de control para gráfico del puesto
let chartPuesto = null;

//Creamos un array donde contendrá la información para representar los gráficos
let peticionesFinalizadas = {
    puestos: false,
    graficoChimenea: false
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
    titulo.style.textAlign = 'center';

    //Contenedor para el gráfico de puesto
    const contenedor_grafico_puesto = document.createElement('div');
    contenedor_grafico_puesto.style.flex = '0';
    contenedor_grafico_puesto.style.maxWidth = '0';
    contenedor_grafico_puesto.style.padding = '15px';
    contenedor_grafico_puesto.style.borderRadius = '10px';
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

    const media = (conteos_controlados.reduce((a, b) => a + b, 0)) / conteos_controlados.length

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
            afterDraw: function (chart) {
                const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                const yPos = y.getPixelForValue(media);

                // Dibujar la línea de la media
                ctx.save();
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
        const { ctx } = chart;
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
    const datasets = conteoGraficoChimenea.map((item) => ({
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
    const valores = datos_filtrados.map(data => data.data[0]);

    console.log("VALORES -> ", valores)

    //variables para establecer la información de la saturación
    const conteo_libre = conteo > 100 ? 0 : 100 - conteo;

    //Actualizamos el gráfico donut
    chartPuesto.data.labels = ['Tiempo Utilizado', 'Tiempo Libre'];
    chartPuesto.data.datasets[0].data = [conteo, conteo_libre.toFixed(2)];
    chartPuesto.data.datasets[0].backgroundColor = ['rgba(231, 76, 60, 0.7)', 'rgba(46, 204, 113, 0.7)'];
    chartPuesto.data.datasets[0].borderColor = '#5b5b5b';
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

    etapas.forEach((etapa) => {
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
                etapasDeF.forEach((etapaDeF) => {
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

                            //Generamos el HTML de la tabla para la etapa
                            const tablaHTML = `
                                <div id="${id_etapa1}-${id_puesto}" class="mb-4" data-id-etapa="${id_etapa}">
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
                                } else if (etapa.simbolo === 'DS10') {
                                    tiempoCalculado = DS10;
                                } else if (etapa.simbolo === 'CDL') {
                                    tiempoCalculado = CDL;
                                } else if (etapa.simbolo === 'M1') {
                                    tiempoCalculado = M1;
                                } else if (etapa.simbolo === 'DC113') {
                                    tiempoCalculado = DC113;
                                } else if (etapa.simbolo === 'CDC') {
                                    tiempoCalculado = CDC;
                                } else if (etapa.simbolo === 'PS15') {
                                    tiempoCalculado = PS15;
                                } else if (etapa.simbolo === 'DI21') {
                                    tiempoCalculado = DI21;
                                } else if (etapa.simbolo === 'DS14') {
                                    tiempoCalculado = DS14;
                                } else if (etapa.simbolo === 'DS15') {
                                    tiempoCalculado = DS15;
                                } else if (etapa.simbolo === 'DC') {
                                    tiempoCalculado = DC;
                                } else if (etapa.simbolo === 'D1') {
                                    tiempoCalculado = D1;
                                } else if (etapa.simbolo === 'W5') {
                                    tiempoCalculado = W5;
                                } else if (etapa.simbolo === 'TT') {
                                    tiempoCalculado = TT;
                                } else if (etapa.simbolo === 'AL') {
                                    tiempoCalculado = AL;
                                } else if (etapa.simbolo === 'G1') {
                                    tiempoCalculado = G1;
                                } else if (etapa.simbolo === 'P5') {
                                    tiempoCalculado = P5
                                } else if (etapa.simbolo === 'W5_2') {
                                    tiempoCalculado = W5_2;
                                } else if (etapa.simbolo === "TT_2") {
                                    tiempoCalculado = TT_2;
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


                            contenedorTablas.insertAdjacentHTML('beforeend', tablaHTML);
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
                    <label for="numeroPicadas" class="block text-sm font-medium text-white mb-2">Número de embalajes a mover en simultáneo:</label>
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
        $('#modal .modal-title').text('Rellene los campos para añadir una etapa');

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
                <div class="relative inline-block w-80">
                    <label for="numeroPicadas" class="block text-sm font-medium text-white mb-2">Número de embalajes a mover en simultáneo:</label>
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
                <div class="relative inline-block w-80">
                    <label for="operacion" class="block text-sm font-medium text-gray-700 mb-2">Operación:</label>
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
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition duration-300">Añadir etapa</button>
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
/*function obtenerValorCarga(item, cantidad_a_expedir, tipo_operacion, tipo_carga) {
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

            let valor_carga;

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
}*/

/**
 * Función para añadir la etapa
 */
function anyadirEtapaFinal(id_puesto, operacion_seleccionada, num_picadas, numero_embalajes) {
    //Serializamos el diccionario con las referencias y el número de embalahjes
    referencia_embalaje = encodeURIComponent(JSON.stringify(referencia_embalaje));

    if (id_puesto) {
        puestoID = id_puesto;
    }

    if (num_picadas) {
        numero_picadas = num_picadas;
    }

    fetch(`/app/api/anyadirEtapa/${puestoID}/${referencia_embalaje}/${encodeURIComponent(operacion_seleccionada)}/${numero_picadas}`, {
        method: "POST"
    });
}


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

    if (operacion) {
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
            if (opcion === 2) {
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
                        Swal.fire({
                            title: 'Etapas añadidas',
                            text: '¿Deseas añadir la información del plano?',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Sí',
                            cancelButtonText: 'No'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                // Si confirma, abrir el modal para añadir la distancia
                                editarDistancia(id_puesto, operacion_seleccionada)
                            } else if (!result.isConfirmed) {
                                window.location.reload();
                            } else {
                                Swal.close();
                            }
                        });
                    }
                });
            }

        });
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
 * Función para configurar la funcionalidad de la cookie de la planta
 */
function configurarPlanta() {
    //En caso de que no haya una cookie con la planta seleccionada
    document.getElementById('plantaSeleccionada').innerHTML = `
            <span><h3>Valladolid</span><br><i class="bi bi-house"></i></h3>
        `;
}

/**
 * Añadimos la configuación para cuando la página este cargada
 */
window.addEventListener('DOMContentLoaded', function () {
    //Llamamos a la función para establecer la planta
    configurarPlanta();

    //Llamamos al método para obtener los puestos
    fetchData();
});