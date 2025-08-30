// ---- CONFIGURACIONES Y CONSTANTES ----
const API_BASE_URL = '';
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos

// ---- FUNCIÓN HELPER PARA PETICIONES HTTP ----
async function fetchJSON(url, method = 'GET', body = null) {
    const opts = { 
        method, 
        credentials: 'include', 
        headers: {} 
    };
    
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    
    const res = await fetch(url, opts);

    if (res.status === 401) {
        localStorage.removeItem('rol');
        window.location.href = '/';
        return { res, data: null };
    }

    let data = null;
    try {
        data = await res.json();
    } catch(e) {}
    return { res, data };
}

// ---- CONTROL DE INACTIVIDAD ----
let inactivityTimer, warningTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);

    warningTimer = setTimeout(() => {
        if (confirm("Tu sesión expirará en 1 minuto. ¿Quieres mantenerla?")) {
            fetch('/auth/check', { credentials: 'include' });
            resetInactivityTimer();
        }
    }, INACTIVITY_LIMIT - 60 * 1000);

    inactivityTimer = setTimeout(() => {
        alert("Sesión cerrada por inactividad.");
        localStorage.removeItem('rol');
        fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/';
    }, INACTIVITY_LIMIT);
}

['mousemove', 'keydown', 'click'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer);
});

// ---- FUNCIONES UTILITARIAS ----
function calcularMontoTotal(montoPrincipal, interes) {
    const principal = parseFloat(montoPrincipal) || 0;
    const porcentajeInteres = parseFloat(interes) || 0;
    const montoInteres = principal * (porcentajeInteres / 100);
    return principal + montoInteres;
}

function formatearMoneda(monto) {
    return `S/ ${parseFloat(monto || 0).toFixed(2)}`;
}

function calcularDiasEntreFechas(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

function getEstadoBadgeClass(estado) {
    const clases = {
        'activo': 'badge-activo',
        'pagado': 'badge-pagado',
        'refinanciado': 'badge-refinanciado',
        'vencido': 'badge-vencido'
    };
    return clases[estado] || 'badge';
}

function getEstadoPagoBadgeClass(estadoPago) {
    const clases = {
        'a_tiempo': 'badge-a-tiempo',
        'con_retraso': 'badge-con-retraso',
        'anticipado': 'badge-anticipado'
    };
    return clases[estadoPago] || 'badge';
}

function getEstadoPagoText(estadoPago) {
    const textos = {
        'a_tiempo': 'A Tiempo',
        'con_retraso': 'Con Retraso',
        'anticipado': 'Anticipado'
    };
    return textos[estadoPago] || 'Desconocido';
}

// ---- FUNCIONES PARA CARGAR DATOS ----
// REEMPLAZA LA FUNCIÓN COMPLETA
async function cargarClientesAdmin(page = 1) {
    const tBody = document.querySelector('#clientesTableAdmin tbody');
    if (!tBody) return;

    // Añadimos un indicador de carga para mejorar la UX
    tBody.innerHTML = '<tr><td colspan="18" class="text-center">Cargando clientes...</td></tr>';

    try {
        // La URL ahora incluye la página que queremos cargar
        const { res, data } = await fetchJSON(`/api/clientes?page=${page}&per_page=10`);
        if (!res.ok) {
            console.error('Error al cargar clientes:', data?.msg || res.statusText);
            tBody.innerHTML = '<tr><td colspan="18">Error al cargar clientes.</td></tr>';
            return;
        }

        tBody.innerHTML = ''; // Limpiamos la tabla antes de añadir nuevos datos

        // Ahora los clientes están dentro de data.clientes
        if (data.clientes.length === 0) {
            tBody.innerHTML = '<tr><td colspan="18" class="text-center">No hay clientes con préstamos activos.</td></tr>';
            document.getElementById('pagination-container').innerHTML = ''; // Limpiar paginación si no hay resultados
            return;
        }

        data.clientes.forEach(cliente => {
            // ... Aquí va EXACTAMENTE el mismo código que ya tenías para crear la fila (tr) ...
            // ... No necesitas cambiar nada de esa lógica ...
            if (cliente.prestamos && cliente.prestamos.length > 0) {
                cliente.prestamos.forEach(prestamo => {
                    const tr = document.createElement('tr');
                    // Calcular clase de alerta por fecha de vencimiento y estado
                    let claseAlerta = '';
                    let diasRestantes = 'N/A';
                    if (prestamo.fecha_fin) {
                        const fechaHoy = new Date();
                        const fechaFin = new Date(prestamo.fecha_fin);
                        const diferenciaMs = fechaFin.getTime() - fechaHoy.getTime();
                        diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
                        
                        if (prestamo.estado === 'vencido') {
                            claseAlerta = 'alerta-vencido';
                        } else if (diasRestantes < 0) {
                            claseAlerta = 'alerta-vencido';
                        } else if (diasRestantes <= 3) {
                            claseAlerta = 'alerta-rojo';
                        } else if (diasRestantes <= 10) {
                            claseAlerta = 'alerta-amarillo';
                        }
                    }
                    
                    const iconoTipo = prestamo.tipo_prestamo === 'REF' ? 
                        '<i class="fas fa-redo-alt" title="Refinanciación"></i>' : 
                        '<i class="fas fa-plus-circle" title="Crédito Reciente"></i>';
                    
                    tr.className = claseAlerta;
                    tr.innerHTML = `
                        <td>${cliente.id}</td>
                        <td>${cliente.dni || 'N/A'}</td>
                        <td>${cliente.nombre || ''}</td>
                        <td>${cliente.direccion || ''}</td>
                        <td>${cliente.telefono || ''}</td>
                        <td>${cliente.trabajador_nombre || 'No asignado'}</td> 
                        <td>${formatearMoneda(prestamo.monto_principal)}</td>
                        <td><strong>${formatearMoneda(prestamo.monto_total)}</strong></td>
                        <td>${formatearMoneda(prestamo.saldo)}</td>
                        <td><i class="${prestamo.tipo_prestamo === 'REF' ? 'fas fa-redo-alt' : 'fas fa-plus-circle'}" title="${prestamo.tipo_prestamo === 'REF' ? 'Refinanciación' : 'Crédito Reciente'}"></i> ${prestamo.tipo_prestamo}</td>
                        <td>${prestamo.tipo_frecuencia || 'Diario'}</td>
                        <td><span class="badge">${prestamo.dt || 0}</span></td>
                        <td>${prestamo.total_cuotas || 0}</td>
                        <td class="deuda-vencida">${formatearMoneda(prestamo.deuda_vencida)}</td>
                        <td>${formatearMoneda(prestamo.cuota_diaria)}</td>
                        <td>${prestamo.fecha_fin || 'N/A'}</td>
                        <td><span class="${getEstadoBadgeClass(prestamo.estado)}">${prestamo.estado.toUpperCase()}</span></td>
                        <td class="actions-cell">
                            <div class="action-buttons">
                                <button class="action-btn" onclick="abrirEditClienteModal(${cliente.id}, '${cliente.nombre}', '${cliente.direccion}', '${cliente.telefono}', ${cliente.trabajador_id || 'null'})" title="Editar Cliente"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-btn" onclick="eliminarCliente(${cliente.id})" title="Eliminar Cliente"><i class="fas fa-trash-alt"></i></button>
                                ${prestamo.estado === 'activo' || prestamo.estado === 'vencido' ? `
                                <button class="action-btn success-btn" onclick="marcarPrestamoComoPagado(${prestamo.id})" title="Marcar como Pagado"><i class="fas fa-check"></i></button>
                                <button class="action-btn primary-btn" onclick="abrirModalCuota(${prestamo.id})" title="Registrar Cuota"><i class="fas fa-dollar-sign"></i></button>
                                <button class="action-btn warning-btn" onclick="abrirModalRefinanciar(${prestamo.id})" title="Refinanciar"><i class="fas fa-redo"></i></button>
                                ` : ''}
                                <button class="action-btn info-btn" onclick="verHistorialCuotas(${prestamo.id})" title="Ver Cuotas"><i class="fas fa-history"></i></button>
                            </div>
                        </td>
                    `;
                    tBody.appendChild(tr);
                });
            }
        });

        // Después de llenar la tabla, generamos los botones de paginación
        renderPagination(data);

    } catch (error) {
        console.error('Error al cargar clientes:', error);
        tBody.innerHTML = '<tr><td colspan="18">Error de conexión al servidor.</td></tr>';
    }
}

function renderPagination(paginationData) {
    const { total_pages, current_page, has_prev, has_next } = paginationData;
    const container = document.getElementById('pagination-container');
    container.innerHTML = ''; // Limpiar botones anteriores

    if (total_pages <= 1) return; // No mostrar si solo hay una página

    // Botón "Anterior"
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo; Anterior';
    prevButton.disabled = !has_prev;
    prevButton.onclick = () => cargarClientesAdmin(current_page - 1);
    container.appendChild(prevButton);

    // Lógica para mostrar números de página (ej. 1, 2, ..., 5, 6, 7, ..., 10, 11)
    for (let i = 1; i <= total_pages; i++) {
        // Simplificado: muestra todos los números. Para muchas páginas, esto se puede mejorar.
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        if (i === current_page) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => cargarClientesAdmin(i);
        container.appendChild(pageButton);
    }

    // Botón "Siguiente"
    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Siguiente &raquo;';
    nextButton.disabled = !has_next;
    nextButton.onclick = () => cargarClientesAdmin(current_page + 1);
    container.appendChild(nextButton);
}

function renderPaginationTrabajador(paginationData) {
    const { total_pages, current_page, has_prev, has_next } = paginationData;
    const container = document.getElementById('pagination-container-trabajador');
    container.innerHTML = ''; 

    if (total_pages <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo; Anterior';
    prevButton.disabled = !has_prev;
    prevButton.onclick = () => cargarClientesTrabajador(current_page - 1);
    container.appendChild(prevButton);

    for (let i = 1; i <= total_pages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        if (i === current_page) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => cargarClientesTrabajador(i);
        container.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Siguiente &raquo;';
    nextButton.disabled = !has_next;
    nextButton.onclick = () => cargarClientesTrabajador(current_page + 1);
    container.appendChild(nextButton);
}

async function cargarClientesTrabajador(page = 1) {
    const tBody = document.querySelector('#clientesTableTrabajador tbody');
    if (!tBody) return;

    tBody.innerHTML = '<tr><td colspan="17" class="text-center">Cargando clientes...</td></tr>';

    try {
        const { res, data } = await fetchJSON(`/api/trabajador/clientes?page=${page}&per_page=10`);
        if (!res.ok) {
            tBody.innerHTML = `<tr><td colspan="17">Error al cargar clientes: ${data?.msg || res.statusText}</td></tr>`;
            return;
        }

        tBody.innerHTML = '';
        
        if (data.clientes.length === 0) {
            tBody.innerHTML = '<tr><td colspan="17" class="text-center">No tienes clientes asignados con préstamos activos.</td></tr>';
            document.getElementById('pagination-container-trabajador').innerHTML = '';
            return;
        }

        data.clientes.forEach(cliente => {
            // (El código que crea cada fila de la tabla sigue igual que antes)
            if (cliente.prestamos && cliente.prestamos.length > 0) {
                cliente.prestamos.forEach(prestamo => {
                    const tr = document.createElement('tr');
                    // ... tu código tr.innerHTML completo aquí ...
                    let claseAlerta = '';
                    if (prestamo.estado === 'vencido') {
                        claseAlerta = 'alerta-vencido';
                    } else if (prestamo.fecha_fin) {
                        const diasRestantes = calcularDiasEntreFechas(new Date(), prestamo.fecha_fin);
                        if (diasRestantes <= 3) claseAlerta = 'alerta-rojo';
                        else if (diasRestantes <= 10) claseAlerta = 'alerta-amarillo';
                    }
                    
                    const iconoTipo = prestamo.tipo_prestamo === 'REF' ? 
                        '<i class="fas fa-redo-alt" title="Refinanciación"></i>' : 
                        '<i class="fas fa-plus-circle" title="Crédito Reciente"></i>';
                    
                    tr.className = claseAlerta;
                    tr.innerHTML = `
                        <td>${cliente.id}</td>
                        <td>${cliente.dni || 'N/A'}</td>
                        <td>${cliente.nombre || ''}</td>
                        <td>${cliente.direccion || ''}</td>
                        <td>${cliente.telefono || ''}</td>
                        <td>${cliente.trabajador_nombre || 'No asignado'}</td>
                        <td>${formatearMoneda(prestamo.monto_principal)}</td>
                        <td><strong>${formatearMoneda(prestamo.monto_total)}</strong></td>
                        <td>${formatearMoneda(prestamo.saldo)}</td>
                        <td><i class="${prestamo.tipo_prestamo === 'REF' ? 'fas fa-redo-alt' : 'fas fa-plus-circle'}" title="${prestamo.tipo_prestamo === 'REF' ? 'Refinanciación' : 'Crédito Reciente'}"></i> ${prestamo.tipo_prestamo}</td>
                        <td>${prestamo.tipo_frecuencia || 'Diario'}</td>
                        <td><span class="badge">${prestamo.dt || 0}</span></td>
                        <td>${prestamo.total_cuotas || 0}</td>
                        <td class="deuda-vencida">${formatearMoneda(prestamo.deuda_vencida)}</td>
                        <td>${formatearMoneda(prestamo.cuota_diaria)}</td>
                        <td><span class="${getEstadoBadgeClass(prestamo.estado)}">${prestamo.estado.toUpperCase()}</span></td>
                        <td>
                            <div class="action-buttons">
                                ${prestamo.estado === 'activo' || prestamo.estado === 'vencido' ? `
                                <button class="action-btn primary-btn" onclick="abrirModalCuota(${prestamo.id})" title="Registrar Cuota">
                                    <i class="fas fa-dollar-sign"></i>
                                </button>
                                ` : ''}
                                <button class="action-btn info-btn" onclick="verHistorialCuotas(${prestamo.id})" title="Ver Cuotas">
                                    <i class="fas fa-history"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    tBody.appendChild(tr);
                });
            }
        });

        // Llamamos a la nueva función para dibujar los botones
        renderPaginationTrabajador(data);

    } catch (error) {
        console.error('Error al cargar clientes del trabajador:', error);
        tBody.innerHTML = '<tr><td colspan="17">Error de conexión al servidor.</td></tr>';
    }
}

async function cargarTrabajadoresSelect(selectId) {
    try {
        const { res, data } = await fetchJSON('/api/trabajadores');
        if (res.ok) {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Seleccione un trabajador</option>';
            
            data.forEach(trabajador => {
                const option = document.createElement('option');
                option.value = trabajador.id;
                option.textContent = `${trabajador.nombre || trabajador.username} - ${trabajador.dni || 'N/A'}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar trabajadores:', error);
    }
}

async function cargarClientesSinPrestamo() {
    try {
        const { res, data } = await fetchJSON('/api/clientes_sin_prestamo');
        if (res.ok) {
            const selectCliente = document.getElementById('selectCliente');
            if (selectCliente) {
                selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>';
                
                data.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente.id;
                    option.textContent = `${cliente.nombre} - ${cliente.dni}`;
                    option.dataset.direccion = cliente.direccion || '';
                    option.dataset.telefono = cliente.telefono || '';
                    selectCliente.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error al cargar clientes sin préstamo:', error);
    }
}

async function cargarTrabajadoresAdmin() {
    const tBody = document.querySelector('#trabajadoresTableAdmin tbody');
    if (!tBody) return;

    try {
        const { res, data } = await fetchJSON('/api/trabajadores');
        if (!res.ok) {
            console.error('Error al cargar trabajadores:', data?.msg || res.statusText);
            tBody.innerHTML = '<tr><td colspan="5">Error al cargar trabajadores.</td></tr>';
            return;
        }

        tBody.innerHTML = '';
        
        if (data.length === 0) {
            tBody.innerHTML = '<tr><td colspan="5" class="text-center">No hay trabajadores registrados.</td></tr>';
            return;
        }

        data.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.username}</td>
                <td>${t.nombre || 'N/A'}</td> <!-- Nueva columna para nombre -->
                <td>${t.dni || 'N/A'}</td>
                <td>${t.telefono || 'N/A'}</td>
                <td>
                    <button class="action-btn" onclick="abrirModal(${t.id}, '${t.username}', '${t.dni || ''}', '${t.telefono || ''}', '${t.nombre || ''}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="eliminarTrabajador(${t.id})" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        tBody.innerHTML = '<tr><td colspan="5">Error de conexión al servidor.</td></tr>';
    }
}

async function cargarResumenCreditos() {
    try {
        const { res, data } = await fetchJSON('/api/resumen_creditos');
        if (res.ok) {
            // Elementos para admin
            const elementos = {
                'totalCreditos': document.getElementById('totalCreditos'),
                'creditosVigentes': document.getElementById('creditosVigentes'),
                'creditosVencidos': document.getElementById('creditosVencidos'),
                'deudaTotal': document.getElementById('deudaTotal'),
                'deudaVencidaTotal': document.getElementById('deudaVencidaTotal'),
                'gastosAdministrativosTotal': document.getElementById('gastosAdministrativosTotal')
            };

            // Elementos para trabajador (mismos IDs con sufijo)
            const elementosTrabajador = {
                'totalCreditos': document.getElementById('totalCreditosTrabajador'),
                'creditosVigentes': document.getElementById('creditosVigentesTrabajador'),
                'creditosVencidos': document.getElementById('creditosVencidosTrabajador'),
                'deudaTotal': document.getElementById('deudaTotalTrabajador')
            };

            // Actualizar elementos de admin
            Object.keys(elementos).forEach(key => {
                if (elementos[key]) {
                    if (key.includes('deuda') || key.includes('gastos')) {
                        elementos[key].textContent = formatearMoneda(data[key] || 0);
                    } else {
                        elementos[key].textContent = data[key] || 0;
                    }
                }
            });

            // Actualizar elementos de trabajador
            Object.keys(elementosTrabajador).forEach(key => {
                if (elementosTrabajador[key]) {
                    if (key.includes('deuda') || key.includes('gastos')) {
                        elementosTrabajador[key].textContent = formatearMoneda(data.deudaTotal || 0);
                    } else {
                        elementosTrabajador[key].textContent = data[key] || 0;
                    }
                }
            });
        } else {
            console.error('Error al cargar el resumen de créditos:', data?.msg);
        }
    } catch (error) {
        console.error('Error en la conexión con la API de resumen:', error);
    }
}

// ---- FUNCIONES DE MODAL Y FORMULARIOS ----

function abrirModalCuota(prestamoId) {
    document.getElementById('cuotaModal').style.display = 'block';
    document.getElementById('cuotaForm').reset();
    document.getElementById('cuotaPrestamoId').value = prestamoId;
    
    calcularCuotaSugerida(prestamoId);
}

function cerrarModalCuota() {
    document.getElementById('cuotaModal').style.display = 'none';
    document.getElementById('cuotaForm').reset();
}

function abrirModalRefinanciar(prestamoId) {
    document.getElementById('refinanciarModal').style.display = 'block';
    document.getElementById('refinanciarForm').reset();
    document.getElementById('refinanciarPrestamoId').value = prestamoId;
    document.getElementById('refinanciarCuotaDiariaDisplay').textContent = 'S/ 0.00'; // Resetear display
    cargarInfoPrestamoRefinanciar(prestamoId);
}

function cerrarModalRefinanciar() {
    document.getElementById('refinanciarModal').style.display = 'none';
    document.getElementById('refinanciarForm').reset();
}

async function verHistorialCuotas(prestamoId) {
    try {
        const { res, data } = await fetchJSON(`/api/prestamos/${prestamoId}/cuotas`);
        if (res.ok) {
            // Llama a la función para actualizar y mostrar el modal
            mostrarHistorialCuotas(data, true); 
        } else {
            alert('Error al cargar el historial de cuotas');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al servidor');
    }
}

function mostrarHistorialCuotas(data, mostrarModal = true) {
    const modal = document.getElementById('historialCuotasModal');
    const tbody = document.querySelector('#historialCuotasTable tbody');
    const totalPagado = document.getElementById('totalPagadoCuotas');
    const prestamoInfo = document.getElementById('prestamoInfoHistorial');

    // Almacenar el ID del préstamo para usarlo después
    const prestamoIdHidden = document.getElementById('historialPrestamoId') || document.createElement('span');
    prestamoIdHidden.id = 'historialPrestamoId';
    prestamoIdHidden.style.display = 'none';
    prestamoIdHidden.textContent = data.prestamo_id;
    if (!document.getElementById('historialPrestamoId')) {
        document.body.appendChild(prestamoIdHidden);
    }
    
    // ... (El resto del código que llena la tabla y la información del préstamo sigue igual)
    if (prestamoInfo && data.prestamo_info) {
        prestamoInfo.innerHTML = `
            <h4>Préstamo de ${data.prestamo_info.cliente_nombre}</h4>
            <p><strong>Monto Total:</strong> ${formatearMoneda(data.prestamo_info.monto_total)}</p>
            <p><strong>Saldo Actual:</strong> ${formatearMoneda(data.prestamo_info.saldo_actual)}</p>
            <p><strong>Mora Total:</strong> ${formatearMoneda(data.prestamo_info.mora_total)}</p>
            <p><strong>Estado:</strong> <span class="${getEstadoBadgeClass(data.prestamo_info.estado)}">${data.prestamo_info.estado.toUpperCase()}</span></p>
            <button class="action-btn primary-btn" onclick="exportarCuotasXLS(${data.prestamo_id})" title="Exportar a Excel">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        `;
    }

    tbody.innerHTML = '';

    if (data.cuotas && data.cuotas.length > 0) {
        data.cuotas.forEach(cuota => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cuota.id}</td>
                <td>${cuota.fecha_pago}</td>
                <td>${formatearMoneda(cuota.monto)}</td>
                <td>${cuota.descripcion || 'Cuota diaria'}</td>
                <td><span class="${getEstadoPagoBadgeClass(cuota.estado_pago)}">${getEstadoPagoText(cuota.estado_pago)}</span></td>
                <td>
                    <button class="action-btn" onclick="abrirModalEditarCuota(${cuota.id}, '${cuota.fecha_pago}')" title="Editar Fecha">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="eliminarCuota(${cuota.id})" title="Eliminar Cuota">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay cuotas registradas</td></tr>';
    }

    totalPagado.textContent = formatearMoneda(data.total_pagado || 0);
    
    // Esta es la parte clave: solo mostramos el modal si se nos indica
    if (mostrarModal) {
        modal.style.display = 'block';
    }
}

function cerrarHistorialCuotas() {
    document.getElementById('historialCuotasModal').style.display = 'none';
}

function exportarCuotasXLS(prestamoId) {
    // Obtener los elementos originales
    const prestamoInfo = document.getElementById('prestamoInfoHistorial');
    const table = document.getElementById('historialCuotasTable');
    const totalPagado = document.getElementById('totalPagadoCuotas');
    
    if (!prestamoInfo || !table || !totalPagado) {
        alert('No se encontró información para exportar');
        return;
    }

    // --- INICIO DE LA MODIFICACIÓN ---

    // 1. Clonamos los elementos para no modificar la vista actual
    const prestamoInfoClon = prestamoInfo.cloneNode(true);
    const tableClon = table.cloneNode(true);

    // 2. (Opcional, pero recomendado) Quitamos el botón de exportar del propio reporte
    const botonExportar = prestamoInfoClon.querySelector('button');
    if (botonExportar) {
        botonExportar.remove();
    }

    // 3. Encontrar y eliminar la columna 'Acciones' del clon de la tabla
    let columnIndex = -1;
    const headers = tableClon.querySelectorAll('thead th');
    headers.forEach((th, index) => {
        if (th.textContent.trim() === 'Acciones') {
            columnIndex = index;
        }
    });

    if (columnIndex > -1) {
        // Eliminar la celda del encabezado
        tableClon.querySelector('thead tr').children[columnIndex].remove();
        
        // Eliminar las celdas de la misma columna en cada fila del cuerpo
        const rows = tableClon.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.children[columnIndex]) {
                row.children[columnIndex].remove();
            }
        });
    }

    // --- FIN DE LA MODIFICACIÓN ---

    // Crear un contenedor HTML para el contenido del archivo
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h4 { font-size: 16px; }
                p { margin: 5px 0; }
            </style>
        </head>
        <body>
            ${prestamoInfoClon.innerHTML}
            <br>
            ${tableClon.outerHTML}
            <p><strong>Total Pagado:</strong> ${totalPagado.textContent}</p>
        </body>
        </html>
    `;

    // Crear y descargar el archivo
    let url = 'data:application/vnd.ms-excel,' + encodeURIComponent(html);
    let a = document.createElement('a');
    a.href = url;
    a.download = `Historial_Cuotas_Prestamo_${prestamoId}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Historial de cuotas exportado correctamente', 'success');
}

async function calcularCuotaSugerida(prestamoId) {
    try {
        const rows = document.querySelectorAll('#clientesTableAdmin tbody tr, #clientesTableTrabajador tbody tr');
        
        for (let row of rows) {
            const buttons = row.querySelectorAll('button[onclick*="abrirModalCuota"]');
            for (let button of buttons) {
                if (button.onclick.toString().includes(prestamoId)) {
                    const cells = row.querySelectorAll('td');
                    const deudaVencidaText = cells[13]?.textContent || 'S/ 0.00';
                    const deudaVencida = parseFloat(deudaVencidaText.replace('S/ ', ''));
                    const montoTotalText = cells[7]?.textContent || 'S/ 0.00';
                    const montoTotal = parseFloat(montoTotalText.replace('S/ ', ''));
                    const cuotaDiariaText = cells[14]?.textContent || 'S/ 0.00';
                    const cuotaDiaria = parseFloat(cuotaDiariaText.replace('S/ ', ''));
                    
                    const cuotaInput = document.getElementById('cuotaMonto');
                    const sugerenciaDiv = document.getElementById('cuotaSugerencia');
                    
                    if (deudaVencida > 0) {
                        // Incluir deuda vencida (que ahora incluye mora)
                        cuotaInput.placeholder = `Sugerido: ${formatearMoneda(deudaVencida)}`;
                        sugerenciaDiv.innerHTML = `
                            <i class="fas fa-exclamation-triangle"></i>
                            Deuda vencida (incluye mora): ${formatearMoneda(deudaVencida)} - Se sugiere pagar esta cantidad para ponerse al día.
                        `;
                        sugerenciaDiv.className = 'sugerencia-alerta';
                        cuotaInput.value = deudaVencida.toFixed(2);
                    } else {
                        cuotaInput.placeholder = `Cuota diaria: ${formatearMoneda(cuotaDiaria)}`;
                        sugerenciaDiv.innerHTML = `
                            <i class="fas fa-info-circle"></i>
                            Cliente al día. Cuota diaria sugerida: ${formatearMoneda(cuotaDiaria)}
                        `;
                        sugerenciaDiv.className = 'sugerencia-info';
                        cuotaInput.value = cuotaDiaria.toFixed(2);
                    }
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Error calculando cuota sugerida:', error);
        const sugerenciaDiv = document.getElementById('cuotaSugerencia');
        sugerenciaDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Error al calcular la cuota sugerida.
        `;
        sugerenciaDiv.className = 'sugerencia-error';
    }
}

async function cargarInfoPrestamoRefinanciar(prestamoId) {
    try {
        const rows = document.querySelectorAll('#clientesTableAdmin tbody tr');
        for (let row of rows) {
            const buttons = row.querySelectorAll('button[onclick*="abrirModalRefinanciar"]');
            for (let button of buttons) {
                if (button.onclick.toString().includes(prestamoId)) {
                    const cells = row.querySelectorAll('td');
                    const saldoText = cells[8]?.textContent || 'S/ 0.00';
                    const saldoPendiente = parseFloat(saldoText.replace('S/ ', ''));
                    
                    document.getElementById('saldoPendienteRefinanciar').textContent = formatearMoneda(saldoPendiente);
                    document.getElementById('refinanciarInteres').value = '';
                    actualizarRefinanciarCuotaDiaria();
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Error cargando info para refinanciar:', error);
    }
}

function actualizarMontoTotal() {
    const montoPrincipal = parseFloat(document.getElementById('prestamoMontoInput')?.value || 0);
    const interes = parseFloat(document.getElementById('prestamoInteresInput')?.value || 0);
    const montoTotal = calcularMontoTotal(montoPrincipal, interes);
    
    const montoTotalDisplay = document.getElementById('montoTotalDisplay');
    if (montoTotalDisplay) {
        montoTotalDisplay.textContent = formatearMoneda(montoTotal);
    }
    actualizarCuotaDiaria();
}

function actualizarNuevoMontoTotal() {
    const montoPrincipal = parseFloat(document.getElementById('nuevoPrestamoMonto')?.value || 0);
    const interes = parseFloat(document.getElementById('nuevoPrestamoInteres')?.value || 0);
    const montoTotal = calcularMontoTotal(montoPrincipal, interes);
    
    const montoTotalDisplay = document.getElementById('nuevoMontoTotalDisplay');
    if (montoTotalDisplay) {
        montoTotalDisplay.textContent = formatearMoneda(montoTotal);
    }
    actualizarNuevoCuotaDiaria();
}

// Funciones de modal para trabajadores
function abrirModal(id = null, username = '', dni = '', telefono = '', nombre = '') {
    document.getElementById('workerId').value = id || '';
    document.getElementById('usernameInput').value = username;
    document.getElementById('nombreInput').value = nombre; // Nuevo campo
    document.getElementById('dniInput').value = dni;
    document.getElementById('telefonoInput').value = telefono;

    const modalTitle = document.getElementById('modalTitle');
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('submitBtn');

    if (id) {
        modalTitle.innerText = 'Editar Trabajador';
        passwordInput.required = false;
        passwordInput.placeholder = 'Dejar en blanco para no cambiar';
        submitBtn.innerText = 'Actualizar';
    } else {
        modalTitle.innerText = 'Añadir Trabajador';
        passwordInput.required = true;
        passwordInput.placeholder = '';
        submitBtn.innerText = 'Guardar';
    }

    document.getElementById('workerModal').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('workerModal').style.display = 'none';
    document.getElementById('workerForm').reset();
    document.getElementById('passwordInput').required = true;
    document.getElementById('passwordInput').placeholder = '';
}

function agregarTrabajador() {
    abrirModal();
}

// Funciones de modal para clientes
function abrirClienteModal() {
    document.getElementById('clienteModal').style.display = 'block';
    document.getElementById('clienteForm').reset();
    document.getElementById('clienteModalTitle').innerText = 'Añadir Cliente y Préstamo';
    document.getElementById('clienteSubmitBtn').innerText = 'Guardar';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('prestamoFechaInicioInput').value = today;
    
    const montoTotalDisplay = document.getElementById('montoTotalDisplay');
    if (montoTotalDisplay) {
        montoTotalDisplay.textContent = formatearMoneda(0);
    }
    cargarTrabajadoresSelect('clienteTrabajadorInput');
}

function cerrarClienteModal() {
    document.getElementById('clienteModal').style.display = 'none';
    document.getElementById('clienteForm').reset();
}

function abrirEditClienteModal(id, nombre, direccion, telefono, trabajador_id) {
    document.getElementById('editClienteId').value = id;
    document.getElementById('editClienteNombre').value = nombre;
    document.getElementById('editClienteDireccion').value = direccion || '';
    document.getElementById('editClienteTelefono').value = telefono || '';
    document.getElementById('editClienteTrabajador').value = trabajador_id || '';
    document.getElementById('editClienteModal').style.display = 'block';

    cargarTrabajadoresSelect('editClienteTrabajador');
}

function cerrarEditClienteModal() {
    document.getElementById('editClienteModal').style.display = 'none';
    document.getElementById('editClienteForm').reset();
}

// Nueva función para el modal de nuevo préstamo
function abrirNuevoPrestamoModal() {
    cargarClientesSinPrestamo();
    document.getElementById('nuevoPrestamoModal').style.display = 'block';
    document.getElementById('nuevoPrestamoForm').reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('nuevoPrestamoFechaInicio').value = today;
    
    const montoTotalDisplay = document.getElementById('nuevoMontoTotalDisplay');
    if (montoTotalDisplay) {
        montoTotalDisplay.textContent = formatearMoneda(0);
    }
    
    // Limpiar info del cliente
    document.getElementById('clienteSeleccionadoInfo').style.display = 'none';
}

function cerrarNuevoPrestamoModal() {
    document.getElementById('nuevoPrestamoModal').style.display = 'none';
    document.getElementById('nuevoPrestamoForm').reset();
}

function onClienteSeleccionado() {
    const select = document.getElementById('selectCliente');
    const selectedOption = select.options[select.selectedIndex];
    const infoDiv = document.getElementById('clienteSeleccionadoInfo');
    
    if (selectedOption.value) {
        const direccion = selectedOption.dataset.direccion || 'No especificada';
        const telefono = selectedOption.dataset.telefono || 'No especificado';
        
        infoDiv.innerHTML = `
            <h4>Cliente Seleccionado:</h4>
            <p><strong>Nombre:</strong> ${selectedOption.textContent.split(' - ')[0]}</p>
            <p><strong>DNI:</strong> ${selectedOption.textContent.split(' - ')[1]}</p>
            <p><strong>Dirección:</strong> ${direccion}</p>
            <p><strong>Teléfono:</strong> ${telefono}</p>
        `;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

// Funciones de eliminación y confirmación
async function eliminarTrabajador(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este trabajador?')) {
        return;
    }
    
    try {
        const { res, data } = await fetchJSON(`/api/trabajadores/${id}`, 'DELETE');
        if (res.ok) {
            await cargarTrabajadoresAdmin();
            showNotification('Trabajador eliminado correctamente', 'success');
        } else {
            alert(data?.msg || 'Error al eliminar el trabajador.');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Error de conexión al servidor.');
    }
}

async function eliminarCliente(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este cliente? Se eliminarán también todos sus préstamos.')) {
        return;
    }
    
    try {
        const { res, data } = await fetchJSON(`/api/clientes/${id}`, 'DELETE');
        if (res.ok) {
            await cargarClientesAdmin(1);
            await cargarResumenCreditos();
            showNotification('Cliente eliminado correctamente', 'success');
        } else {
            alert(data?.msg || 'Error al eliminar el cliente.');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Error de conexión al servidor.');
    }
}

async function marcarPrestamoComoPagado(prestamoId) {
    if (!confirm('¿Estás seguro de que deseas marcar este préstamo como pagado? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const { res, data } = await fetchJSON(`/api/prestamos/${prestamoId}/pagado_manual`, 'PUT');

        if (res.ok) {
            showNotification('Préstamo marcado como pagado exitosamente', 'success');
            await cargarClientesAdmin();
            await cargarResumenCreditos();
        } else {
            alert(data?.msg || 'Error al marcar el préstamo como pagado.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al servidor.');
    }
}

// Funciones de búsqueda y filtrado
async function buscarHistorial(searchText) {
    const tBody = document.querySelector('#prestamosTableAdmin tbody');
    if (!tBody) return;
    
    tBody.innerHTML = '';

    if (searchText.length < 2) {
        tBody.innerHTML = '<tr><td colspan="10">Ingresa al menos 2 caracteres para buscar.</td></tr>';
        return;
    }

    try {
        const { res, data } = await fetchJSON(`/api/clientes/search?q=${encodeURIComponent(searchText)}`);
        if (!res.ok) {
            console.error('Error al buscar historial:', data?.msg || res.statusText);
            tBody.innerHTML = '<tr><td colspan="10">Error al cargar el historial.</td></tr>';
            return;
        }

        if (data.length === 0) {
            tBody.innerHTML = '<tr><td colspan="10">No se encontraron clientes para esa búsqueda.</td></tr>';
            return;
        }

        data.forEach(cliente => {
            if (cliente.prestamos && cliente.prestamos.length > 0) {
                cliente.prestamos.forEach(prestamo => {
                    const tr = document.createElement('tr');
                    const iconoTipo = prestamo.tipo_prestamo === 'REF' ? 
                        '<i class="fas fa-redo-alt" title="Refinanciación"></i>' : 
                        '<i class="fas fa-plus-circle" title="Crédito Reciente"></i>';
                    
                    tr.innerHTML = `
                        <td>${cliente.nombre}</td>
                        <td>${cliente.dni || 'N/A'}</td>
                        <td>${formatearMoneda(prestamo.monto_principal)}</td>
                        <td>${formatearMoneda(prestamo.monto_total)}</td>
                        <td>${(prestamo.interes || 0).toFixed(2)}%</td>
                        <td>${iconoTipo} ${prestamo.tipo_prestamo}</td>
                        <td>${prestamo.fecha_inicio || 'N/A'}</td>
                        <td>${prestamo.fecha_pago_completo || 'N/A'}</td>
                        <td><span class="${getEstadoBadgeClass(prestamo.estado)}">${prestamo.estado.toUpperCase()}</span></td>
                        <td>
                            <button class="action-btn info-btn" onclick="verHistorialCuotas(${prestamo.id})" title="Ver Cuotas">
                                <i class="fas fa-history"></i>
                            </button>
                        </td>
                    `;
                    tBody.appendChild(tr);
                });
            }
        });

    } catch (error) {
        console.error('Error en la búsqueda del historial:', error);
        tBody.innerHTML = '<tr><td colspan="10">Error de conexión al servidor.</td></tr>';
    }
}

// NUEVAS FUNCIONES PARA FLUJO DE CAJA
async function cargarFlujoCaja({ fecha = null, mes = null } = {}) {
    const resumenDiarioIngresos = document.getElementById('ingresosDiarios');
    const resumenDiarioEgresos = document.getElementById('egresosDiarios');
    const resumenDiarioBalance = document.getElementById('balanceDiario');
    const resumenMensualIngresos = document.getElementById('ingresosMensuales');
    const resumenMensualEgresos = document.getElementById('egresosMensuales');
    const resumenMensualBalance = document.getElementById('balanceMensual');
    const tableBody = document.querySelector('#flujoCajaTable tbody');

    try {
        // 👇 construimos la query string
        let qs = '';
        if (fecha) {
            qs = `?fecha=${fecha}`;
        } else if (mes) {
            qs = `?mes=${mes}`;
        }

        const { res, data } = await fetchJSON(`/api/flujo-caja${qs}`);
        if (!res.ok) {
            throw new Error(data?.msg || 'Error al cargar el flujo de caja');
        }

        const { resumen_diario, resumen_mensual, historial } = data;

        // Rellenar resúmenes diarios
        resumenDiarioIngresos.textContent = formatearMoneda(resumen_diario.ingresos);
        resumenDiarioEgresos.textContent = formatearMoneda(resumen_diario.egresos);
        resumenDiarioBalance.textContent = formatearMoneda(resumen_diario.balance);
        resumenDiarioBalance.style.color = resumen_diario.balance >= 0 ? '#4CAF50' : '#F44336';
        
        // Rellenar resúmenes mensuales
        resumenMensualIngresos.textContent = formatearMoneda(resumen_mensual.ingresos);
        resumenMensualEgresos.textContent = formatearMoneda(resumen_mensual.egresos);
        resumenMensualBalance.textContent = formatearMoneda(resumen_mensual.balance);
        resumenMensualBalance.style.color = resumen_mensual.balance >= 0 ? '#4CAF50' : '#F44336';
        
        // Rellenar historial
        tableBody.innerHTML = '';
        if (!historial || historial.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay transacciones</td></tr>';
        } else {
            historial.forEach(item => {
                const tr = document.createElement('tr');
                let colorClase = (item.tipo === 'ingreso') ? 'text-green'
                               : (item.tipo === 'egreso') ? 'text-red'
                               : 'text-yellow';
                tr.innerHTML = `
                    <td>${item.fecha}</td>
                    <td>${item.descripcion}</td>
                    <td class="${colorClase}">${item.tipo.toUpperCase()}</td>
                    <td class="${colorClase}">${formatearMoneda(item.monto)}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

    } catch (error) {
        console.error('Error al cargar el flujo de caja:', error);
        tableBody.innerHTML = '<tr><td colspan="4">Error al cargar datos.</td></tr>';
    }
}

function abrirModalMovimiento() {
    const modal = document.getElementById('movimientoModal');
    modal.style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaMovimiento').value = today;
}

function cerrarModalMovimiento() {
    const modal = document.getElementById('movimientoModal');
    modal.style.display = 'none';
    document.getElementById('formMovimiento').reset();
}

async function guardarMovimiento(event) {
    event.preventDefault();
    const form = document.getElementById('formMovimiento');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const { res, data: resData } = await fetchJSON('/api/movimiento-administrativo', 'POST', data);
        if (!res.ok) {
            throw new Error(resData?.msg || 'Error al guardar el movimiento');
        }
        alert('Movimiento guardado exitosamente');
        cerrarModalMovimiento();
        cargarFlujoCaja(); // Recargar los datos para ver el nuevo movimiento
    } catch (error) {
        console.error('Error al guardar movimiento:', error);
        alert(error.message);
    }
}

// Función para exportar el flujo de caja a Excel
function exportarFlujoCajaExcel() {
    // Obtener el contenedor de información del resumen y la tabla
    const resumenInfo = document.querySelector('.flujo-resumen');
    const table = document.getElementById('flujoCajaTable');
    
    if (!resumenInfo || !table) {
        alert('No se encontró la información del flujo de caja para exportar.');
        return;
    }

    // Clonar los elementos para modificar su contenido sin alterar la página
    const resumenClon = resumenInfo.cloneNode(true);
    const tableClon = table.cloneNode(true);

    // Eliminar los botones de los selectores de fecha en el resumen clonado
    resumenClon.querySelectorAll('.date-selector-container button').forEach(button => {
        button.remove();
    });

    // Crear un contenedor HTML para el contenido del archivo
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h3 { font-size: 16px; margin-top: 20px; }
                p { margin: 5px 0; }
            </style>
        </head>
        <body>
            ${resumenClon.outerHTML}
            <br>
            ${tableClon.outerHTML}
        </body>
        </html>
    `;

    // Crear y descargar el archivo
    const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(html);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Flujo_de_Caja_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Flujo de caja exportado a Excel correctamente', 'success');
}

function filtrarClientes(searchText) {
    const table = document.getElementById('clientesTableAdmin') || document.getElementById('clientesTableTrabajador');
    if (!table) return;
    
    const rows = table.getElementsByTagName('tr');
    const filter = searchText.toLowerCase();

    for (let i = 1; i < rows.length; i++) {
        const dni = rows[i].getElementsByTagName('td')[1];
        const nombre = rows[i].getElementsByTagName('td')[2];

        if (dni && nombre) {
            const dniText = dni.textContent || dni.innerText;
            const nombreText = nombre.textContent || nombre.innerText;

            if (dniText.toLowerCase().indexOf(filter) > -1 || 
                nombreText.toLowerCase().indexOf(filter) > -1) {
                rows[i].style.display = "";
            } else {
                rows[i].style.display = "none";
            }
        }
    }
}

function filtrarTrabajadores(searchText) {
    const table = document.getElementById('trabajadoresTableAdmin');
    if (!table) return;
    
    const rows = table.getElementsByTagName('tr');
    const filter = searchText.toLowerCase();

    for (let i = 1; i < rows.length; i++) {
        const username = rows[i].getElementsByTagName('td')[0];
        const nombre = rows[i].getElementsByTagName('td')[1]; // Nueva columna para nombre
        const dni = rows[i].getElementsByTagName('td')[1];

        if (username && nombre && dni) {
            const usernameText = username.textContent || username.innerText;
            const nombreText = nombre.textContent || nombre.innerText;
            const dniText = dni.textContent || dni.innerText;

            if (usernameText.toLowerCase().indexOf(filter) > -1 || 
                nombreText.toLowerCase().indexOf(filter) > -1 || // Incluir nombre en la búsqueda
                dniText.toLowerCase().indexOf(filter) > -1) {
                rows[i].style.display = "";
            } else {
                rows[i].style.display = "none";
            }
        }
    }
}

// Funciones utilitarias
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('passwordInput');
    const passwordIcon = document.getElementById('passwordIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.src = "/static/icons/eye-close.svg";
        passwordIcon.alt = 'Ocultar contraseña';
    } else {
        passwordInput.type = 'password';
        passwordIcon.src = "/static/icons/eye-open.svg";
        passwordIcon.alt = 'Mostrar contraseña';
    }
}

function exportarClientesExcel() {
    // Obtener la tabla de clientes
    const table = document.getElementById('clientesTableAdmin');
    
    if (!table) {
        alert('No se encontró la tabla de clientes para exportar.');
        return;
    }

    // Clonar la tabla para no modificar la original en la página
    const tableClon = table.cloneNode(true);

    // Encontrar y eliminar la columna 'Acciones' del clon
    // Primero, encontrar el índice de la columna 'Acciones'
    let columnIndex = -1;
    const headers = tableClon.querySelectorAll('thead th');
    headers.forEach((th, index) => {
        if (th.textContent.trim() === 'Acciones') {
            columnIndex = index;
        }
    });

    if (columnIndex > -1) {
        // Eliminar la celda de encabezado
        tableClon.querySelector('thead tr').children[columnIndex].remove();
        
        // Eliminar las celdas de la misma columna en cada fila del cuerpo de la tabla
        const rows = tableClon.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.children[columnIndex]) {
                row.children[columnIndex].remove();
            }
        });
    }

    // Crear un contenedor HTML con el clon de la tabla
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h3 { font-size: 16px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h3>Reporte de Clientes</h3>
            ${tableClon.outerHTML}
        </body>
        </html>
    `;

    // Crear y descargar el archivo
    const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(html);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clientes_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Lista de clientes exportada a Excel correctamente', 'success');
}

function exportarClientesTrabajadorExcel() {
    // Obtener la tabla de clientes del trabajador
    const table = document.getElementById('clientesTableTrabajador');
    
    if (!table) {
        alert('No se encontró la tabla de clientes para exportar.');
        return;
    }

    // Clonar la tabla para no modificar la original en la página
    const tableClon = table.cloneNode(true);

    // Encontrar y eliminar la columna 'Acciones' del clon
    // Primero, encontrar el índice de la columna 'Acciones'
    let columnIndex = -1;
    const headers = tableClon.querySelectorAll('thead th');
    headers.forEach((th, index) => {
        if (th.textContent.trim() === 'Acciones') {
            columnIndex = index;
        }
    });

    if (columnIndex > -1) {
        // Eliminar la celda de encabezado
        tableClon.querySelector('thead tr').children[columnIndex].remove();
        
        // Eliminar las celdas de la misma columna en cada fila del cuerpo de la tabla
        const rows = tableClon.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.children[columnIndex]) {
                row.children[columnIndex].remove();
            }
        });
    }

    // Crear un contenedor HTML con el clon de la tabla
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h3 { font-size: 16px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h3>Reporte de Clientes</h3>
            ${tableClon.outerHTML}
        </body>
        </html>
    `;

    // Crear y descargar el archivo
    const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(html);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clientes_Trabajador_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Lista de clientes exportada a Excel correctamente', 'success');
}

function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            display: none;
            max-width: 400px;
            word-wrap: break-word;
        `;
        document.body.appendChild(notification);
    }

    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }

    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Mantener compatibilidad con funciones antiguas
function abrirModalPago(prestamoId) {
    abrirModalCuota(prestamoId);
}

function cerrarModalPago() {
    cerrarModalCuota();
}

// INICIALIZACIÓN PRINCIPAL
document.addEventListener('DOMContentLoaded', async () => {
    const rol = localStorage.getItem('rol');
    const currentPath = window.location.pathname;

    if (currentPath === '/admin' && rol !== 'admin') {
        window.location.href = '/';
        return;
    } else if (currentPath === '/trabajador' && !['admin', 'trabajador'].includes(rol)) {
        window.location.href = '/';
        return;
    }

    const bienvenida = document.getElementById('bienvenida');
    // Obtener datos del usuario autenticado
    try {
        const response = await fetch('/api/usuario', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
                // El token JWT se envía automáticamente en la cookie gracias a flask_jwt_extended
            },
            credentials: 'include' // Necesario para enviar la cookie JWT
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const nombreUsuario = data.nombre || data.username || 'Usuario';
            const rolUsuario = data.rol ? data.rol.charAt(0).toUpperCase() + data.rol.slice(1) : 'Usuario';
            if (bienvenida) {
                bienvenida.textContent = `Bienvenido, ${rolUsuario} ${nombreUsuario}`;
            }
        } else {
            console.error('Error al obtener datos del usuario:', data.msg);
            if (bienvenida) {
                bienvenida.textContent = 'Bienvenido, Usuario';
            }
        }
    } catch (error) {
        console.error('Error de conexión al obtener datos del usuario:', error);
        if (bienvenida) {
            bienvenida.textContent = 'Bienvenido, Usuario';
        }
    }

    resetInactivityTimer();

    // CONFIGURACIÓN PARA PÁGINA DE ADMIN
    if (currentPath === '/admin') {
        // Configurar pestañas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

                this.classList.add('active');
                document.getElementById(this.dataset.target).classList.add('active');

                if (this.dataset.target === 'trabajadoresTab') {
                    cargarTrabajadoresAdmin();
                } else if (this.dataset.target === 'clientesTab') {
                    cargarClientesAdmin();
                }
            });
        });

        await cargarClientesAdmin();
        await cargarResumenCreditos();

        // EVENT LISTENERS PARA FORMULARIOS

        // Formulario de trabajadores
        const workerForm = document.getElementById('workerForm');
        if (workerForm) {
            workerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const id = document.getElementById('workerId').value;
                const username = document.getElementById('usernameInput').value;
                const nombre = document.getElementById('nombreInput').value; // Nuevo campo
                const dni = document.getElementById('dniInput').value;
                const telefono = document.getElementById('telefonoInput').value;
                const password = document.getElementById('passwordInput').value;
                const submitBtn = document.getElementById('submitBtn');

                submitBtn.disabled = true;
                submitBtn.innerText = 'Guardando...';

                try {
                    if (id) {
                        const body = { username, nombre, dni, telefono };
                        if (password) body.password = password;
                        const { res, data } = await fetchJSON(`/api/trabajadores/${id}`, 'PUT', body);
                        
                        if (res.ok) {
                            await cargarTrabajadoresAdmin();
                            showNotification('Trabajador actualizado correctamente', 'success');
                        } else {
                            alert(data?.msg || 'Error al actualizar el trabajador.');
                        }
                    } else {
                        const { res, data } = await fetchJSON('/api/trabajadores', 'POST', { 
                            username, password, nombre, dni, telefono 
                        });
                        
                        if (res.ok) {
                            await cargarTrabajadoresAdmin();
                            showNotification('Trabajador creado correctamente', 'success');
                        } else {
                            alert(data?.msg || 'Error al crear el trabajador.');
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }

                cerrarModal();
                submitBtn.disabled = false;
                submitBtn.innerText = 'Guardar';
            });
        }

        // Formulario de clientes y préstamo inicial
        const clienteForm = document.getElementById('clienteForm');
        if (clienteForm) {
            const montoInput = document.getElementById('prestamoMontoInput');
            const interesInput = document.getElementById('prestamoInteresInput');
            
            if (montoInput && interesInput) {
                montoInput.addEventListener('input', actualizarMontoTotal);
                interesInput.addEventListener('input', actualizarMontoTotal);
            }

            clienteForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const clienteData = {
                    nombre: document.getElementById('clienteNombreInput').value,
                    dni: document.getElementById('clienteDniInput').value,
                    telefono: document.getElementById('clienteTelefonoInput').value,
                    direccion: document.getElementById('clienteLugarInput').value,
                    trabajador_id: document.getElementById('clienteTrabajadorInput').value || null
                };

                const prestamoData = {
                    monto: parseFloat(document.getElementById('prestamoMontoInput').value),
                    interes: parseFloat(document.getElementById('prestamoInteresInput').value),
                    tipo_frecuencia: document.getElementById('prestamoTipoInput').value,
                    fecha_inicio: document.getElementById('prestamoFechaInicioInput').value
                };

                const body = { cliente: clienteData, prestamo: prestamoData };
                const submitBtn = document.getElementById('clienteSubmitBtn');
                submitBtn.disabled = true;
                submitBtn.innerText = 'Guardando...';

                try {
                    const { res, data } = await fetchJSON('/api/clientes_con_prestamo', 'POST', body);

                    if (res.ok) {
                        showNotification('Cliente y préstamo creados con éxito', 'success');
                        cerrarClienteModal();
                        await cargarClientesAdmin();
                        await cargarResumenCreditos();
                    } else {
                        alert(data?.msg || 'Error al crear el cliente y el préstamo.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }

                submitBtn.disabled = false;
                submitBtn.innerText = 'Guardar';
            });
        }

        // Formulario de nuevo préstamo para cliente existente
        const nuevoPrestamoForm = document.getElementById('nuevoPrestamoForm');
        if (nuevoPrestamoForm) {
            const montoInput = document.getElementById('nuevoPrestamoMonto');
            const interesInput = document.getElementById('nuevoPrestamoInteres');
            const selectCliente = document.getElementById('selectCliente');
            
            if (montoInput && interesInput) {
                montoInput.addEventListener('input', actualizarNuevoMontoTotal);
                interesInput.addEventListener('input', actualizarNuevoMontoTotal);
            }

            if (selectCliente) {
                selectCliente.addEventListener('change', onClienteSeleccionado);
            }

            nuevoPrestamoForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const clienteId = document.getElementById('selectCliente').value;
                if (!clienteId) {
                    alert('Por favor seleccione un cliente');
                    return;
                }

                const body = {
                    cliente_id: parseInt(clienteId),
                    monto: parseFloat(document.getElementById('nuevoPrestamoMonto').value),
                    interes: parseFloat(document.getElementById('nuevoPrestamoInteres').value),
                    tipo_frecuencia: document.getElementById('nuevoPrestamoTipo').value,
                    fecha_inicio: document.getElementById('nuevoPrestamoFechaInicio').value
                };

                const submitBtn = document.getElementById('nuevoPrestamoSubmitBtn');
                submitBtn.disabled = true;
                submitBtn.innerText = 'Creando...';

                try {
                    const { res, data } = await fetchJSON('/api/prestamos', 'POST', body);

                    if (res.ok) {
                        showNotification('Préstamo creado con éxito', 'success');
                        cerrarNuevoPrestamoModal();
                        await cargarClientesAdmin();
                        await cargarResumenCreditos();
                    } else {
                        alert(data?.msg || 'Error al crear el préstamo.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }

                submitBtn.disabled = false;
                submitBtn.innerText = 'Crear Préstamo';
            });
        }

        // Formulario de edición de cliente
        const editClienteForm = document.getElementById('editClienteForm');
        if (editClienteForm) {
            editClienteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const id = document.getElementById('editClienteId').value;
                const nombre = document.getElementById('editClienteNombre').value;
                const direccion = document.getElementById('editClienteDireccion').value;
                const telefono = document.getElementById('editClienteTelefono').value;
                const trabajador_id = document.getElementById('editClienteTrabajador').value || null;

                const body = { nombre, direccion, telefono, trabajador_id  };

                try {
                    const { res, data } = await fetchJSON(`/api/clientes/${id}`, 'PUT', body);

                    if (res.ok) {
                        showNotification('Cliente actualizado con éxito', 'success');
                        cerrarEditClienteModal();
                        await cargarClientesAdmin();
                    } else {
                        alert(data?.msg || 'Error al actualizar el cliente.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }
            });
        }

        // Formulario de cuotas
        const cuotaForm = document.getElementById('cuotaForm');
        if (cuotaForm) {
            cuotaForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const prestamoId = document.getElementById('cuotaPrestamoId').value;
                const monto = parseFloat(document.getElementById('cuotaMonto').value);
                const descripcion = document.getElementById('cuotaDescripcion').value;

                try {
                    const { res, data } = await fetchJSON(`/api/prestamos/${prestamoId}/cuota`, 'POST', { 
                        monto, 
                        descripcion 
                    });

                    if (res.ok) {
                        showNotification(data.msg || 'Cuota registrada exitosamente', 'success');
                        
                        // Mostrar notificación especial si el préstamo se completó
                        if (data.prestamo_completado) {
                            setTimeout(() => {
                                showNotification('¡FELICIDADES! El cliente ha completado el pago de su préstamo.', 'success');
                            }, 3000);
                        }
                        
                        cerrarModalCuota();
                        await cargarClientesAdmin();
                        await cargarResumenCreditos();
                    } else {
                        alert(data?.msg || 'Error al registrar la cuota.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }
            });
        }

        // Formulario de refinanciación
        const refinanciarForm = document.getElementById('refinanciarForm');
        if (refinanciarForm) {
            refinanciarForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const prestamoId = document.getElementById('refinanciarPrestamoId').value;
                const interes = parseFloat(document.getElementById('refinanciarInteres').value);

                if (!confirm('¿Estás seguro de refinanciar este préstamo? Esta acción marcará el préstamo original como refinanciado.')) {
                    return;
                }

                try {
                    const { res, data } = await fetchJSON(`/api/prestamos/${prestamoId}/refinanciar`, 'POST', { 
                        interes 
                    });

                    if (res.ok) {
                        showNotification('Préstamo refinanciado exitosamente', 'success');
                        cerrarModalRefinanciar();
                        await cargarClientesAdmin();
                        await cargarResumenCreditos();
                    } else {
                        alert(data?.msg || 'Error al refinanciar el préstamo.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }
            });
            // Event listener para actualizar cuota diaria al cambiar el interés
            // Event listener para actualizar cuota diaria al cambiar el interés
    document.getElementById('refinanciarInteres').addEventListener('input', actualizarRefinanciarCuotaDiaria);
        }
    }
        

    // CONFIGURACIÓN PARA PÁGINA DE TRABAJADOR
    if (currentPath === '/trabajador') {
        await cargarClientesTrabajador(1);
        await cargarResumenCreditos();

        const cuotaForm = document.getElementById('cuotaForm');
        if (cuotaForm) {
            cuotaForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const prestamoId = document.getElementById('cuotaPrestamoId').value;
                const monto = parseFloat(document.getElementById('cuotaMonto').value);
                const descripcion = document.getElementById('cuotaDescripcion')?.value || 'Cuota diaria';

                try {
                    const { res, data } = await fetchJSON(`/api/prestamos/${prestamoId}/cuota`, 'POST', { 
                        monto, 
                        descripcion 
                    });

                    if (res.ok) {
                        showNotification(data.msg || 'Cuota registrada exitosamente', 'success');
                        
                        if (data.prestamo_completado) {
                            setTimeout(() => {
                                showNotification('¡FELICIDADES! El cliente ha completado el pago de su préstamo.', 'success');
                            }, 3000);
                        }
                        
                        cerrarModalCuota();
                        await cargarClientesTrabajador();
                        await cargarResumenCreditos();
                    } else {
                        alert(data?.msg || 'Error al registrar la cuota.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión al servidor.');
                }
            });
        }
    }

    // VINCULAR EL FORMULARIO DE EDITAR CUOTA (PARA AMBAS PÁGINAS)
    const formEditCuota = document.getElementById('formEditCuota');
    if (formEditCuota) {
        formEditCuota.addEventListener('submit', editarCuota);
    }


    // EVENT LISTENER PARA CERRAR SESIÓN
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async () => {
            try {
                await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (e) {
                console.warn('Error al cerrar sesión:', e);
            }
            localStorage.removeItem('rol');
            window.location.href = '/';
        });
    }

    // CERRAR MODALES AL HACER CLIC FUERA
    window.onclick = function(event) {
        const modales = [
            'workerModal', 'clienteModal', 'editClienteModal', 
            'nuevoPrestamoModal', 'pagoModal', 'cuotaModal', 
            'refinanciarModal', 'historialCuotasModal'
        ];
        
        modales.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    console.log(`Aplicación inicializada correctamente para rol: ${rol}`);
});

function actualizarCuotaDiaria() {
    const montoPrincipal = parseFloat(document.getElementById('prestamoMontoInput')?.value || 0);
    const interes = parseFloat(document.getElementById('prestamoInteresInput')?.value || 0);
    const montoTotal = calcularMontoTotal(montoPrincipal, interes);
    const cuotaDiaria = montoTotal / 22;
    const cuotaDiariaDisplay = document.getElementById('cuotaDiariaDisplay');
    if (cuotaDiariaDisplay) {
        cuotaDiariaDisplay.textContent = formatearMoneda(cuotaDiaria);
    }
    // Actualiza también el monto total
    const montoTotalDisplay = document.getElementById('montoTotalDisplay');
    if (montoTotalDisplay) {
        montoTotalDisplay.textContent = formatearMoneda(montoTotal);
    }
}

function actualizarNuevoCuotaDiaria() {
    const montoPrincipal = parseFloat(document.getElementById('nuevoPrestamoMonto')?.value || 0);
    const interes = parseFloat(document.getElementById('nuevoPrestamoInteres')?.value || 0);
    const montoTotal = calcularMontoTotal(montoPrincipal, interes);
    const cuotaDiaria = montoTotal / 22;
    const cuotaDiariaDisplay = document.getElementById('nuevoCuotaDiariaDisplay');
    if (cuotaDiariaDisplay) {
        cuotaDiariaDisplay.textContent = formatearMoneda(cuotaDiaria);
    }
}

// Función para actualizar la cuota diaria en el modal de refinanciamiento
function actualizarRefinanciarCuotaDiaria() {
    const saldoPendienteElement = document.getElementById('saldoPendienteRefinanciar');
    const interes = parseFloat(document.getElementById('refinanciarInteres')?.value || 0);
    
    // Extraer el saldo pendiente del texto (eliminar "S/ " y convertir a número)
    const saldoPendienteText = saldoPendienteElement?.textContent || '0.00';
    const saldoPendiente = parseFloat(saldoPendienteText.replace('S/ ', '').replace(',', '')) || 0;
    
    // Calcular monto total y cuota diaria
    const montoTotal = calcularMontoTotal(saldoPendiente, interes);
    const cuotaDiaria = montoTotal / 22;
    
    // Actualizar el display de la cuota diaria
    const cuotaDiariaDisplay = document.getElementById('refinanciarCuotaDiariaDisplay');
    if (cuotaDiariaDisplay) {
        cuotaDiariaDisplay.textContent = formatearMoneda(cuotaDiaria);
    }
}

// --- FUNCIONES PARA EDITAR/ELIMINAR CUOTAS ---
function abrirModalEditarCuota(cuotaId, fechaActual) {
    document.getElementById('editCuotaId').value = cuotaId;
    document.getElementById('editFechaPago').value = fechaActual;
    document.getElementById('editCuotaModal').style.display = 'flex';
}

function cerrarModalEditarCuota() {
    document.getElementById('editCuotaModal').style.display = 'none';
    document.getElementById('formEditCuota').reset();
}

async function editarCuota(event) {
    event.preventDefault();
    const cuotaId = document.getElementById('editCuotaId').value;
    const nuevaFecha = document.getElementById('editFechaPago').value;

    if (!cuotaId || !nuevaFecha) {
        alert("Falta el ID de la cuota o la nueva fecha.");
        return;
    }

    if (confirm(`¿Estás seguro de que deseas cambiar la fecha de la cuota #${cuotaId} a ${nuevaFecha}?`)) {
        try {
            const { res, data } = await fetchJSON(`/api/cuotas/${cuotaId}`, 'PUT', { fecha_pago: nuevaFecha });

            if (res.ok) {
                alert("Cuota actualizada correctamente.");
                cerrarModalEditarCuota();
                // Recargar el historial para reflejar el cambio
                const prestamoId = data.cuota.prestamo_id;
                verHistorialCuotas(prestamoId);
            } else {
                alert("Error al editar la cuota: " + (data?.msg || res.statusText));
            }
        } catch (error) {
            console.error('Error al editar cuota:', error);
            alert("Error de conexión al servidor.");
        }
    }
}

async function eliminarCuota(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta cuota? Esta acción es irreversible.")) {
        try {
            // Obtener el ID del préstamo desde el elemento oculto
            const prestamoId = document.getElementById('historialPrestamoId')?.textContent;
            if (!prestamoId) {
                alert("Error: No se pudo encontrar el ID del préstamo asociado para actualizar la vista.");
                return;
            }

            const url = `${API_BASE_URL}/api/cuotas/${id}`;
            const { res, data } = await fetchJSON(url, 'DELETE');
            
            if (res.ok) {
                showNotification("Cuota eliminada exitosamente.", 'success');
                
                // ¡AQUÍ ESTÁ LA MAGIA! Llamamos a la función que solo refresca
                await refrescarContenidoHistorialCuotas(prestamoId);
                
                // Actualizar también las tablas y resúmenes principales
                if(window.location.pathname === '/admin') {
                    await cargarClientesAdmin();
                } else if(window.location.pathname === '/trabajador') {
                    await cargarClientesTrabajador();
                }
                await cargarResumenCreditos();

            } else {
                alert(data.msg || "Error al eliminar la cuota.");
            }
        } catch (error) {
            console.error("Error al eliminar cuota:", error);
            alert("Error de conexión. Intente de nuevo.");
        }
    }
}

async function refrescarContenidoHistorialCuotas(prestamoId) {
    try {
        const { res, data } = await fetchJSON(`/api/prestamos/${prestamoId}/cuotas`);
        if (res.ok) {
            // Pasamos los datos a la función que SÍ actualiza el HTML
            mostrarHistorialCuotas(data, false); // El 'false' es para que no vuelva a mostrar el modal
        } else {
            alert('Error al recargar el historial de cuotas');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al servidor');
    }
}

// FUNCIONES GLOBALES ADICIONALES
window.addEventListener('error', function(event) {
    console.error('Error global capturado:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Promesa rechazada no manejada:', event.reason);
    event.preventDefault();
});

// Actualización automática cada 5 minutos
setInterval(async () => {
    try {
        await fetchJSON('/api/actualizar_prestamos', 'POST');
        console.log('Préstamos actualizados automáticamente');
    } catch (error) {
        console.warn('Error en actualización automática:', error);
    }
}, 5 * 60 * 1000);

// Exportar funciones principales para uso global
window.cargarClientesAdmin = cargarClientesAdmin;
window.cargarClientesTrabajador = cargarClientesTrabajador;
window.cargarTrabajadoresAdmin = cargarTrabajadoresAdmin;
window.cargarResumenCreditos = cargarResumenCreditos;
window.filtrarClientes = filtrarClientes;
window.filtrarTrabajadores = filtrarTrabajadores;
window.exportarClientesExcel = exportarClientesExcel;
window.buscarHistorial = buscarHistorial;
window.marcarPrestamoComoPagado = marcarPrestamoComoPagado;
window.eliminarCliente = eliminarCliente;
window.eliminarTrabajador = eliminarTrabajador;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.agregarTrabajador = agregarTrabajador;
window.abrirClienteModal = abrirClienteModal;
window.cerrarClienteModal = cerrarClienteModal;
window.abrirNuevoPrestamoModal = abrirNuevoPrestamoModal;
window.cerrarNuevoPrestamoModal = cerrarNuevoPrestamoModal;
window.abrirEditClienteModal = abrirEditClienteModal;
window.cerrarEditClienteModal = cerrarEditClienteModal;
window.abrirModalPago = abrirModalPago;
window.cerrarModalPago = cerrarModalPago;
window.abrirModalCuota = abrirModalCuota;
window.cerrarModalCuota = cerrarModalCuota;
window.abrirModalRefinanciar = abrirModalRefinanciar;
window.cerrarModalRefinanciar = cerrarModalRefinanciar;
window.verHistorialCuotas = verHistorialCuotas;
window.cerrarHistorialCuotas = cerrarHistorialCuotas;
window.togglePasswordVisibility = togglePasswordVisibility;
window.actualizarMontoTotal = actualizarMontoTotal;
window.calcularMontoTotal = calcularMontoTotal;
window.formatearMoneda = formatearMoneda;

// NUEVOS LISTENERS
document.querySelector('[data-target="flujoCajaTab"]').addEventListener('click', cargarFlujoCaja);
document.getElementById('formMovimiento').addEventListener('submit', guardarMovimiento);

// Exponer las nuevas funciones para que puedan ser llamadas desde el HTML
window.abrirModalMovimiento = abrirModalMovimiento;
window.cerrarModalMovimiento = cerrarModalMovimiento;
window.exportarFlujoCajaExcel = exportarFlujoCajaExcel;
window.guardarMovimiento = guardarMovimiento;
window.cargarFlujoCaja = cargarFlujoCaja;

document.getElementById('formEditCuota').addEventListener('submit', editarCuota);