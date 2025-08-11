const horarioSelect = document.getElementById('horario');
const asientosDiv   = document.getElementById('asientos');
const reservarBtn   = document.getElementById('reservar-btn');
const nombreInput   = document.getElementById('nombre');
const dniInput      = document.getElementById('dni');
const listaReservasDiv = document.getElementById('lista-reservas');

let asientoSeleccionado = null;
let horarioSeleccionado = null;

// Configuración: 2 + pasillo + 2, 12 filas
const columnas = ["A", "B", "C", "D"];
const FILAS = 12;

// --- Storage ---
const STORAGE_KEY = 'reservas_estrella_tour_v1';

function cargarReservas() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function guardarReservas(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function getReservadosPorHorario(horario) {
  const db = cargarReservas();
  return db[horario] || [];
}
function asientoYaReservado(horario, seatId) {
  return getReservadosPorHorario(horario).some(r => r.asiento === seatId);
}
function crearReserva(horario, seatId, nombre, dni) {
  const db = cargarReservas();
  if (!db[horario]) db[horario] = [];
  if (db[horario].some(r => r.asiento === seatId)) {
    return { ok:false, error:'Asiento ya reservado para ese horario' };
  }
  db[horario].push({
    asiento: seatId,
    nombre: nombre || '',
    dni: dni || '',
    created_at: new Date().toISOString()
  });
  guardarReservas(db);
  return { ok:true };
}
function cancelarReserva(horario, seatId) {
  const db = cargarReservas();
  if (!db[horario]) return { ok:false, error:'No hay reservas para ese horario' };
  const before = db[horario].length;
  db[horario] = db[horario].filter(r => r.asiento !== seatId);
  const after = db[horario].length;
  if (before === after) return { ok:false, error:'No se encontró esa reserva' };
  guardarReservas(db);
  return { ok:true };
}

// --- UI principal ---
horarioSelect.addEventListener('change', async () => {
  horarioSeleccionado = horarioSelect.value;
  await mostrarAsientos();
  renderListaReservas();
});

async function mostrarAsientos() {
  asientosDiv.innerHTML = '';
  asientoSeleccionado = null;
  reservarBtn.disabled = true;

  const reservados = horarioSeleccionado
    ? getReservadosPorHorario(horarioSeleccionado).map(r => r.asiento)
    : [];

  for (let fila = 1; fila <= FILAS; fila++) {
    // A, B
    agregarAsiento(`${columnas[0]}${fila}`, reservados);
    agregarAsiento(`${columnas[1]}${fila}`, reservados);

    // Pasillo
    const pasillo = document.createElement('div');
    pasillo.classList.add('pasillo');
    asientosDiv.appendChild(pasillo);

    // C, D
    agregarAsiento(`${columnas[2]}${fila}`, reservados);
    agregarAsiento(`${columnas[3]}${fila}`, reservados);
  }
}

function agregarAsiento(id, reservados) {
  const asiento = document.createElement('div');
  asiento.classList.add('asiento');
  asiento.textContent = id;

  if (reservados.includes(id)) {
    asiento.classList.add('ocupado');
    // Mostrar info de la reserva al clickear un ocupado
    asiento.title = 'Asiento ocupado. Click para ver.';
    asiento.addEventListener('click', () => {
      const r = getReservadosPorHorario(horarioSeleccionado).find(x => x.asiento === id);
      if (!r) return;
      const confirmar = confirm(
        `Asiento ${r.asiento} está reservado por:\n` +
        `Nombre: ${r.nombre || '(sin nombre)'}\n` +
        `DNI: ${r.dni || '(sin DNI)'}\n\n` +
        `¿Querés cancelar esta reserva?`
      );
      if (confirmar) {
        const out = cancelarReserva(horarioSeleccionado, id);
        if (out.ok) {
          alert('Reserva cancelada.');
          mostrarAsientos();
          renderListaReservas();
        } else {
          alert(out.error || 'No se pudo cancelar.');
        }
      }
    });
  } else {
    // Seleccionar asiento libre
    asiento.addEventListener('click', () => {
      document.querySelectorAll('.asiento').forEach(a => a.classList.remove('seleccionado'));
      asiento.classList.add('seleccionado');
      asientoSeleccionado = id;
      reservarBtn.disabled = false;
    });
  }

  asientosDiv.appendChild(asiento);
}

reservarBtn.addEventListener('click', async () => {
  if (!horarioSeleccionado || !asientoSeleccionado) {
    alert('Seleccioná horario y asiento');
    return;
  }
  const nombre = nombreInput.value.trim();
  const dni = dniInput.value.trim();

  const res = crearReserva(horarioSeleccionado, asientoSeleccionado, nombre, dni);
  if (res.ok) {
    alert(`Reserva confirmada: ${asientoSeleccionado} en ${horarioSeleccionado}`);
    await mostrarAsientos();
    renderListaReservas();
  } else {
    alert(res.error || 'No se pudo guardar la reserva');
    await mostrarAsientos();
  }
});

// --- Listado de reservas ---
function renderListaReservas() {
  listaReservasDiv.innerHTML = '';
  if (!horarioSeleccionado) {
    listaReservasDiv.textContent = 'Elegí un horario para ver reservas…';
    return;
  }
  const reservas = getReservadosPorHorario(horarioSeleccionado);
  if (!reservas.length) {
    listaReservasDiv.textContent = 'No hay reservas para este horario.';
    return;
  }

  reservas
    .sort((a,b) => a.asiento.localeCompare(b.asiento))
    .forEach(r => {
      const row = document.createElement('div');
      row.className = 'reserva-item';

      const meta = document.createElement('div');
      meta.className = 'reserva-meta';
      meta.textContent = `${r.asiento} — ${r.nombre || '(sin nombre)'} — DNI: ${r.dni || '-'}`;

      const btn = document.createElement('button');
      btn.className = 'btn-cancelar';
      btn.textContent = 'Cancelar';
      btn.addEventListener('click', () => {
        const ok = confirm(`¿Cancelar la reserva del asiento ${r.asiento}?`);
        if (!ok) return;
        const out = cancelarReserva(horarioSeleccionado, r.asiento);
        if (out.ok) {
          mostrarAsientos();
          renderListaReservas();
        } else {
          alert(out.error || 'No se pudo cancelar.');
        }
      });

      row.appendChild(meta);
      row.appendChild(btn);
      listaReservasDiv.appendChild(row);
    });
}

// Inicial (opcional: seleccionar un horario por defecto)
// horarioSelect.value = '08:00';
// horarioSeleccionado = '08:00';
// mostrarAsientos(); renderListaReservas();
// --- Exportar / Importar ---
// const STORAGE_KEY = 'reservas_estrella_tour_v1'; // (si ya existe arriba, no la declares de nuevo)
const btnExportar = document.getElementById('btn-exportar');
const fileImport  = document.getElementById('file-import');

btnExportar.addEventListener('click', () => {
  const data = localStorage.getItem(STORAGE_KEY) || '{}';
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.href = url;
  a.download = `reservas-estrella-tour-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

fileImport.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const incoming = JSON.parse(text);

    // Validación mínima de formato { "08:00": [ { asiento, nombre, dni, created_at }, ... ], ... }
    if (typeof incoming !== 'object' || Array.isArray(incoming)) {
      alert('Archivo inválido: el JSON debe ser un objeto por horarios.');
      fileImport.value = '';
      return;
    }

    const db = cargarReservas(); // usa tu función existente
    let cambios = 0;

    for (const horario of Object.keys(incoming)) {
      const lista = incoming[horario];
      if (!Array.isArray(lista)) continue;

      if (!db[horario]) db[horario] = [];

      // índice rápido de asientos existentes en ese horario
      const ocupados = new Set(db[horario].map(r => r.asiento));

      for (const r of lista) {
        if (!r || typeof r !== 'object') continue;
        const seat = String(r.asiento || '').trim();
        if (!seat) continue;

        // evitar duplicados por (horario, asiento)
        if (!ocupados.has(seat)) {
          db[horario].push({
            asiento: seat,
            nombre: (r.nombre || '').toString(),
            dni: (r.dni || '').toString(),
            created_at: r.created_at || new Date().toISOString()
          });
          ocupados.add(seat);
          cambios++;
        }
      }
    }

    guardarReservas(db);  // usa tu función existente
    alert(`Importación lista. Reservas nuevas agregadas: ${cambios}.`);
    // refrescar UI si hay horario seleccionado
    if (horarioSeleccionado) {
      await mostrarAsientos();
      renderListaReservas();
    }
  } catch (err) {
    console.error(err);
    alert('No se pudo importar el archivo. Verificá que sea JSON válido.');
  } finally {
    fileImport.value = ''; // reset para permitir reimportar el mismo archivo si querés
  }
});
// --- Comando oculto para borrar todas las reservas ---
window.resetReservasEstrellaTour = function() {
  if (confirm('⚠ Esto borrará TODAS las reservas. ¿Estás seguro?')) {
    localStorage.removeItem(STORAGE_KEY);
    alert('Reservas borradas.');
    if (horarioSeleccionado) {
      mostrarAsientos();
      renderListaReservas();
    }
  }
};
