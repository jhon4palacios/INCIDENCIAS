let db_usuarios = JSON.parse(localStorage.getItem('ugel_users')) || [
    { user: "admin", pass: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", role: "soporte", area: "Sistemas" },
    { user: "ugeluser", pass: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", role: "usuario", area: "Contabilidad" }
];
let baseIncidencias = JSON.parse(localStorage.getItem('ugel_incidencias')) || [];

let sessionActive = null;
let filtroInicio = null;
let filtroFin = null;

// FUNCIÓN AUXILIAR: Genera el Hash SHA-256 de cualquier texto de forma nativa
async function generarSHA256(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Control de Formulario de Login (ASÍNCRONO para esperar el cálculo del Hash)
document.getElementById('formLogin').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value;
    
    // Convertimos la contraseña ingresada a Hash SHA-256 para compararla
    const hashIngresado = await generarSHA256(p);
    const cuenta = db_usuarios.find(x => x.user === u && x.pass === hashIngresado);

    if(!cuenta) { 
        alert('Credenciales incorrectas.'); 
        return; 
    }
    sessionActive = cuenta;
    document.getElementById('formLogin').reset();
    arrancarDashboard();
});

// Cierre de Sesión Seguro
function logout() {
    sessionActive = null;
    document.getElementById('viewMainApp').classList.add('hidden');
    document.getElementById('viewLogin').classList.remove('hidden');
}

// Direccionamiento de Vistas según Roles de Cuentas
function arrancarDashboard() {
    document.getElementById('viewLogin').classList.add('hidden');
    document.getElementById('viewMainApp').classList.remove('hidden');
    document.getElementById('lblSessionUser').textContent = `Usuario actual: ${sessionActive.user.toUpperCase()} | Área: ${sessionActive.area || 'No Asignada'} | Rol: ${sessionActive.role === 'soporte' ? 'Soporte TI / Admin' : 'Personal General'}`;

    if(sessionActive.role === 'soporte') {
        document.getElementById('adminTabContainer').classList.remove('hidden');
        document.getElementById('sectionDescargasSoporte').classList.remove('hidden');
        switchModuleTab('incidencias'); 
    } else {
        document.getElementById('adminTabContainer').classList.add('hidden');
        document.getElementById('sectionDescargasSoporte').classList.add('hidden');
        document.getElementById('moduloUsuarios').classList.add('hidden');
        document.getElementById('moduloIncidencias').classList.remove('hidden');
        document.getElementById('panelFormulario').classList.remove('hidden');
        document.getElementById('gridIncidencias').style.gridTemplateColumns = "";
        
        // Auto-completar el campo Oficina/Área en el formulario con el dato del perfil logueado
        if(document.getElementById('txtArea')) {
            document.getElementById('txtArea').value = sessionActive.area || "";
        }
        
        reestablecerFiltro();
    }
}

// Navegación de Pestañas Interactivas (Exclusivo Perfil Admin)
function switchModuleTab(modulo) {
    document.getElementById('btnTabIncidencias').classList.remove('active');
    document.getElementById('btnTabUsuarios').classList.remove('active');
    document.getElementById('moduloUsuarios').classList.add('hidden');
    document.getElementById('moduloIncidencias').classList.add('hidden');

    if(modulo === 'incidencias') {
        document.getElementById('btnTabIncidencias').classList.add('active');
        document.getElementById('moduloIncidencias').classList.remove('hidden');
        document.getElementById('panelFormulario').classList.add('hidden');
        document.getElementById('gridIncidencias').style.gridTemplateColumns = "1fr";
        reestablecerFiltro();
    } else if(modulo === 'usuarios') {
        document.getElementById('btnTabUsuarios').classList.add('active');
        document.getElementById('moduloUsuarios').classList.remove('hidden');
        renderizarUsuarios();
    }
}

// CREACIÓN DE USUARIOS NUEVOS (Guarda la contraseña directamente en SHA-256)
document.getElementById('formRegister').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('regUser').value.trim().toLowerCase();
    const a = document.getElementById('regArea').value.trim();
    const p = document.getElementById('regPass').value;
    const r = document.getElementById('regRole').value;

    if(db_usuarios.some(x => x.user === u)) { 
        alert('El usuario ya existe.'); 
        return; 
    }

    // Convertimos la contraseña en Hash SHA-256 antes de guardarla en el arreglo
    const hashNuevaClave = await generarSHA256(p);

    db_usuarios.push({ user: u, area: a, pass: hashNuevaClave, role: r });
    localStorage.setItem('ugel_users', JSON.stringify(db_usuarios));
    document.getElementById('formRegister').reset();
    renderizarUsuarios();
    alert('Usuario creado con éxito.');
});

// RESTABLECER CONTRASEÑAS DE USUARIOS (Encripta la nueva contraseña)
async function restablecerClave(username) {
    const nuevaClave = prompt(`Ingrese la nueva contraseña para el usuario ${username}:`);
    if(!nuevaClave) return;

    // Encriptamos la clave en formato SHA-256
    const hashNuevaClave = await generarSHA256(nuevaClave);

    db_usuarios = db_usuarios.map(x => {
        if(x.user === username) x.pass = hashNuevaClave;
        return x;
    });
    localStorage.setItem('ugel_users', JSON.stringify(db_usuarios));
    alert('Contraseña actualizada con éxito.');
    renderizarUsuarios();
}

// MODIFICAR ROL Y ÁREA DE UN USUARIO
function editarRolUsuario(username) {
    const usuario = db_usuarios.find(x => x.user === username);
    if (!usuario) return;

    // 1. Modificación de Área
    const nuevaArea = prompt(`Modificar Oficina/Área para ${username}:`, usuario.area || "");
    if (nuevaArea === null) return; // Si cancela, detiene el flujo

    // 2. Modificación de Rol
    const nuevoRol = prompt(`Modificar rol para ${username}.\nEscriba 'usuario' para Personal General o 'soporte' para Admin/Soporte Técnico:`, usuario.role).trim().toLowerCase();
    
    if (nuevoRol === 'usuario' || nuevoRol === 'soporte') {
        db_usuarios = db_usuarios.map(x => {
            if (x.user === username) {
                x.area = nuevaArea.trim() || "No Especificada";
                x.role = nuevoRol;
            }
            return x;
        });
        localStorage.setItem('ugel_users', JSON.stringify(db_usuarios));
        alert(`Datos de '${username}' actualizados.`);
        renderizarUsuarios();
    } else if (nuevoRol !== null) {
        alert("Rol no válido. Los cambios generales no se aplicaron.");
    }
}

// ELIMINAR UN USUARIO DEL SISTEMA
function eliminarUsuario(username) {
    if (username === 'admin') {
        alert("No se puede eliminar al administrador principal del sistema.");
        return;
    }

    const confirmar = confirm(`¿Está completamente seguro de eliminar de forma permanente al usuario '${username}'?\nEsta acción no se puede deshacer.`);
    
    if (confirmar) {
        db_usuarios = db_usuarios.filter(x => x.user !== username);
        localStorage.setItem('ugel_users', JSON.stringify(db_usuarios));
        alert(`Usuario '${username}' removido del sistema.`);
        renderizarUsuarios();
    }
}

// Renderizado de Lista de Usuarios (Muestra el Área correspondiente)
function renderizarUsuarios() {
    const tbody = document.getElementById('tbodyUsuarios');
    tbody.innerHTML = '';
    
    db_usuarios.forEach(x => {
        const esAdminPrincipal = (x.user === 'admin');
        const areaMostrada = x.area || "No Especificada";
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${x.user}</strong><br><span style="font-size:11px; color:#7f8c8d;">Área: ${areaMostrada}</span></td>
            <td><span class="badge" style="background:${x.role === 'soporte' ? '#003366' : '#e1b12c'}; color:white;">${x.role.toUpperCase()}</span></td>
            <td>
                <div class="btn-action-group">
                    <button class="btn" style="background:var(--secondary); padding:5px 8px; font-size:11px; width:auto;" onclick="restablecerClave('${x.user}')" title="Restablecer Clave">🔑 Clave</button>
                    <button class="btn btn-warning-alt" style="padding:5px 8px; font-size:11px; width:auto; ${esAdminPrincipal ? 'display:none;' : ''}" onclick="editarRolUsuario('${x.user}')" title="Editar Rol y Área">📝 Editar</button>
                    <button class="btn btn-danger-alt" style="padding:5px 8px; font-size:11px; width:auto; ${esAdminPrincipal ? 'display:none;' : ''}" onclick="eliminarUsuario('${x.user}')" title="Eliminar Cuenta">🗑️ Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// REGISTRO DE NUEVA INCIDENCIA (Áreas UGEL)
document.getElementById('formIncidencia').addEventListener('submit', async function(e) {
    e.preventDefault();
    const imgInput = document.getElementById('fileImagenUsuario');
    let b64Img = "";
    
    if(imgInput.files.length > 0) {
        const reader = new FileReader();
        b64Img = await new Promise(res => {
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(imgInput.files[0]);
        });
    }

    const ahora = new Date();
    baseIncidencias.push({
        id: Date.now(),
        fechaIso: ahora.toISOString().split('T')[0],
        creador: sessionActive.user,
        responsable: document.getElementById('txtNombre').value,
        area: document.getElementById('txtArea').value,
        tipo: document.getElementById('selTipo').value,
        descripcion: document.getElementById('txtDescripcion').value,
        imgUser: b64Img,
        imgSoporte: "",
        status: "Pendiente",
        fechaRegistro: ahora.toLocaleString('es-PE'),
        fechaAtencion: "—",
        observaciones: ""
    });

    localStorage.setItem('ugel_incidencias', JSON.stringify(baseIncidencias));
    document.getElementById('formIncidencia').reset();
    
    // Mantener el área si el usuario común sigue logueado
    if(sessionActive.role === 'usuario') {
        document.getElementById('txtArea').value = sessionActive.area || "";
    }
    
    reestablecerFiltro();
    alert('Incidencia guardada correctamente.');
});

// Cambiar Estados (Soporte Técnico)
function actualizarEstado(id, val) {
    baseIncidencias = baseIncidencias.map(x => {
        if(x.id === id) {
            x.status = val;
            x.fechaAtencion = val !== 'Pendiente' ? new Date().toLocaleString('es-PE') : '—';
        }
        return x;
    });
    localStorage.setItem('ugel_incidencias', JSON.stringify(baseIncidencias));
    renderizarIncidencias();
}

// Guardar Notas Técnicas o Bitácora
function guardarObsSoporte(id) {
    const obs = document.getElementById(`obs_${id}`).value;
    baseIncidencias = baseIncidencias.map(x => {
        if(x.id === id) {
            x.observaciones = obs;
            if(x.fechaAtencion === '—') x.fechaAtencion = new Date().toLocaleString('es-PE');
        }
        return x;
    });
    localStorage.setItem('ugel_incidencias', JSON.stringify(baseIncidencias));
    alert('Bitácora técnica actualizada.');
    renderizarIncidencias();
}

// Controladores de Rangos de Fechas
function aplicarFiltroFechas() {
    const i = document.getElementById('filterFechaInicio').value;
    const f = document.getElementById('filterFechaFin').value;
    if(!i || !f) { 
        alert('Defina ambas fechas para realizar la búsqueda.'); 
        return; 
    }
    filtroInicio = i; 
    filtroFin = f;
    renderizarIncidencias();
}

function reestablecerFiltro() {
    document.getElementById('filterFechaInicio').value = "";
    document.getElementById('filterFechaFin').value = "";
    filtroInicio = null; 
    filtroFin = null;
    renderizarIncidencias();
}

// RENDERIZADO CENTRAL DE TICKETS DE INCIDENCIAS
function renderizarIncidencias() {
    const tbody = document.getElementById('tbodyIncidencias');
    tbody.innerHTML = '';
    
    let dataset = baseIncidencias;
    if(sessionActive.role === 'usuario') {
        dataset = baseIncidencias.filter(x => x.creador === sessionActive.user);
    }

    if(sessionActive.role === 'soporte' && filtroInicio && filtroFin) {
        dataset = dataset.filter(x => x.fechaIso >= filtroInicio && x.fechaIso <= filtroFin);
        document.getElementById('lblReportCounter').textContent = `Filtrados: Encontrados ${dataset.length} registros en el rango indicado.`;
    } else if (sessionActive.role === 'soporte') {
        document.getElementById('lblReportCounter').textContent = `Total Histórico UGEL Jaén: ${dataset.length} incidencias registradas.`;
    }

    if(dataset.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#95a5a6;">No existen registros cargados en el sistema.</td></tr>';
        return;
    }

    [...dataset].reverse().forEach(inc => {
        const tr = document.createElement('tr');
        const bClase = inc.tipo === 'Urgente' ? 'badge-urgente' : 'badge-con-tiempo';
        
        let stClase = 'st-pendiente';
        if(inc.status === 'Atendido') stClase = 'st-atendido';
        if(inc.status === 'En espera - Hardware') stClase = 'st-espera-hw';
        if(inc.status === 'En espera - Software') stClase = 'st-espera-sw';
        if(inc.status === 'En espera - Otro') stClase = 'st-espera-otro';

        let imgHtml = inc.imgUser ? `<br><img src="${inc.imgUser}" class="img-preview" onclick="window.open(this.src)">` : "";

        let blockAtencion = "";
        if(sessionActive.role === 'soporte') {
            blockAtencion = `
                <select class="status-select ${stClase}" onchange="actualizarEstado(${inc.id}, this.value)">
                    <option value="Pendiente" ${inc.status==='Pendiente'?'selected':''}>Pendiente</option>
                    <option value="Atendido" ${inc.status==='Atendido'?'selected':''}>Atendido</option>
                    <option value="En espera - Hardware" ${inc.status==='En espera - Hardware'?'selected':''}>En espera por Hardware</option>
                    <option value="En espera - Software" ${inc.status==='En espera - Software'?'selected':''}>En espera por Software</option>
                    <option value="En espera - Otro" ${inc.status==='En espera - Otro'?'selected':''}>En espera por Otro motivo</option>
                </select>
                <div style="margin-top:5px;">
                    <textarea id="obs_${inc.id}" class="obs-textarea" placeholder="Observaciones técnicas">${inc.observaciones||''}</textarea>
                    <button class="btn btn-success" style="padding:4px; font-size:10px;" onclick="guardarObsSoporte(${inc.id})">Guardar Notas</button>
                </div>
                <span class="timestamp"><strong>Atendido:</strong> ${inc.fechaAtencion}</span>
            `;
        } else {
            blockAtencion = `
                <span class="status-static ${stClase}">${inc.status}</span>
                <p style="font-size:12px; margin:5px 0; color:#34495e;"><strong>Notas TI:</strong> ${inc.observaciones || 'Sin notas.'}</p>
                <span class="timestamp"><strong>Atendido:</strong> ${inc.fechaAtencion}</span>
            `;
        }

        tr.innerHTML = `
            <td><strong>${inc.responsable}</strong><br><span style="color:#7f8c8d;">Área: ${inc.area}</span><span class="timestamp">Reg: ${inc.fechaRegistro}</span></td>
            <td><span class="badge ${bClase}">${inc.tipo}</span></td>
            <td><div style="white-space:pre-line; word-break:break-word;">${inc.descripcion}</div>${imgHtml}</td>
            <td>${blockAtencion}</td>
        `;
        tbody.appendChild(tr);
    });
}

// EXPORTACIÓN EN FORMATO EXCEL NATIVO (.xls)
function descargarExcel() {
    let tablaHTML = document.getElementById("tablaIncidenciasMaestra").outerHTML;
    
    // Limpieza de inputs interactivos para no corromper la lectura del Excel
    tablaHTML = tablaHTML.replace(/<select[^>]*>([\s\S]*?)<\/select>/gi, "");
    tablaHTML = tablaHTML.replace(/<textarea[^>]*>([\s\S]*?)<\/textarea>/gi, "");
    tablaHTML = tablaHTML.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, "");

    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body><table>{table}</table></body></html>';
    const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))); };
    const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }); };

    const ctx = { worksheet: 'Reporte UGEL', table: tablaHTML };
    const link = document.createElement("a");
    link.download = `Reporte_Incidencias_UGEL_JAEN_${Date.now()}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
}

// EXPORTACIÓN EN FORMATO PDF (Nativo optimizado)
function descargarPDF() {
    window.print();
}