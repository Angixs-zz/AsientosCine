(() => {
  'use strict';

  const STORAGE_KEY = 'asientos-cine:v1';
  const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LEVEL_LABEL = { 2: 'Ideal', 1: 'Aceptable', '-1': 'Evitar' };
  const LEVEL_CLASS = { 2: 'ideal', 1: 'acceptable', '-1': 'avoid' };

  const $ = (selector, root = document) => root.querySelector(selector);

  const el = {
    roomList: $('#roomList'),
    main: $('#main'),
    sidebar: $('#sidebar'),
    scrim: $('#scrim'),
    menuBtn: $('#menuBtn'),
    addRoomBtn: $('#addRoomBtn'),
    addCinemaBtn: $('#addCinemaBtn'),
    resetBtn: $('#resetBtn'),
    exportBtn: $('#exportBtn'),
    importBtn: $('#importBtn'),
    importFile: $('#importFile'),
    seatSheet: $('#seatSheet'),
    sheetContent: $('#sheetContent'),
    sheetScrim: $('#sheetScrim'),
    modalWrap: $('#modalWrap'),
    modalCard: $('#modalCard'),
    toast: $('#toast'),
  };

  let state = loadState();
  let sheetSeat = null;
  let toastTimer = null;

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function seedState() {
    const makeRoom = (id, name, note, levels, rows = 14, cols = 16) => ({
      id,
      name,
      note,
      rows,
      cols,
      seats: Object.fromEntries(
        Object.entries(levels).map(([seatId, level]) => [seatId, { level, note: '' }])
      ),
    });

    return {
      version: 1,
      activeRoomId: 'sala-11',
      cinemas: [
        {
          id: 'cinemex',
          name: 'Cinemex',
          rooms: [
            makeRoom(
              'sala-2',
              'Sala 2',
              'En la K se ve bien: asientos 13 y 14. También dentro de las J.',
              { K13: 2, K14: 2, J13: 1, J14: 1 }
            ),
            makeRoom(
              'sala-3',
              'Sala 3',
              'La fila F está un poco abajo: mejor G o H. En F puede ser 4-5 o 5-6.',
              { G5: 2, G6: 2, H5: 2, H6: 2, F4: 1, F5: 1, F6: 1 }
            ),
            makeRoom(
              'sala-4',
              'Sala 4',
              'Sin datos todavía. Agrega tus asientos cuando la pruebes.',
              {}
            ),
            makeRoom(
              'sala-5',
              'Sala 5',
              'La fila G está muy abajo: mejor H o, mucho mejor, J. El 6 se ve centrado; en G pueden ser 5, 6 y 7.',
              {
                H5: 2, H6: 2, H7: 2,
                J5: 2, J6: 2, J7: 2,
                G5: 1, G6: 1, G7: 1,
              }
            ),
            makeRoom(
              'sala-7',
              'Sala 7',
              'Fila H: la pantalla se ve bien. Los del centro son del 3 en adelante.',
              { H3: 2, H4: 2, H5: 2, H6: 2, H7: 2, H8: 2, H9: 2, H10: 2 }
            ),
            makeRoom(
              'sala-9',
              'Sala 9',
              'Fila H, asientos 7 y 8.',
              { H7: 2, H8: 2 }
            ),
            makeRoom(
              'sala-10',
              'Sala 10',
              'Centrados: J13 y J14. En la L, 15 y 16. Santi dice que más abajo se ve mejor.',
              { J13: 2, J14: 2, L15: 2, L16: 2 }
            ),
            makeRoom(
              'sala-11',
              'Sala 11',
              'Zootopia: fila G, asientos 9, 8, 7 y 6.',
              { G9: 2, G8: 2, G7: 2, G6: 2 }
            ),
            makeRoom(
              'sala-13',
              'Sala 13',
              'Asientos G8 y G9. Bien (Levoticus).',
              { G8: 2, G9: 2 }
            ),
          ],
        },
        {
          id: 'plaza-bella',
          name: 'Cinemex Plaza Bella',
          rooms: [
            makeRoom(
              'plaza-bella-j',
              'Sala por confirmar',
              'J8 y J9 se ven bien. Falta confirmar el número de sala.',
              { J8: 2, J9: 2 }
            ),
          ],
        },
      ],
    };
  }

  function normalizeRoom(raw, index) {
    const rows = clampInt(raw?.rows, 1, 26, 14);
    const cols = clampInt(raw?.cols, 1, 30, 16);
    const seats = {};

    if (raw?.seats && typeof raw.seats === 'object') {
      for (const [seatId, value] of Object.entries(raw.seats)) {
        const match = /^([A-Z])(\d{1,2})$/.exec(seatId);
        if (!match) continue;
        if (ROW_LETTERS.indexOf(match[1]) >= rows) continue;
        const num = Number(match[2]);
        if (num < 1 || num > cols) continue;

        const level = [2, 1, -1].includes(Number(value?.level)) ? Number(value.level) : 0;
        const note = typeof value?.note === 'string' ? value.note.slice(0, 600) : '';
        if (level || note) seats[seatId] = { level, note };
      }
    }

    return {
      id: typeof raw?.id === 'string' && raw.id ? raw.id : uid('sala'),
      name: String(raw?.name || `Sala ${index + 1}`).slice(0, 60),
      rows,
      cols,
      note: typeof raw?.note === 'string' ? raw.note.slice(0, 800) : '',
      seats,
    };
  }

  function normalizeState(raw) {
    const cinemas = (Array.isArray(raw?.cinemas) ? raw.cinemas : []).map((cinema, index) => {
      const rooms = (Array.isArray(cinema?.rooms) ? cinema.rooms : []).map(normalizeRoom);
      return {
        id: typeof cinema?.id === 'string' && cinema.id ? cinema.id : uid('cine'),
        name: String(cinema?.name || `Cine ${index + 1}`).slice(0, 60),
        rooms,
      };
    });

    if (!cinemas.length) {
      cinemas.push({ id: uid('cine'), name: 'Mi cine', rooms: [] });
    }

    const roomIds = new Set(cinemas.flatMap((cinema) => cinema.rooms.map((room) => room.id)));
    const activeRoomId = roomIds.has(raw?.activeRoomId)
      ? raw.activeRoomId
      : (cinemas.flatMap((cinema) => cinema.rooms)[0]?.id ?? null);

    return { version: 1, activeRoomId, cinemas };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return seedState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      toast('No pude guardar en este navegador. Exporta un respaldo.');
    }
  }

  function findRoom(roomId) {
    for (const cinema of state.cinemas) {
      const room = cinema.rooms.find((item) => item.id === roomId);
      if (room) return { cinema, room };
    }
    return null;
  }

  function allRooms() {
    return state.cinemas.flatMap((cinema) => cinema.rooms.map((room) => ({ cinema, room })));
  }

  function countSeats(room) {
    const counts = { ideal: 0, acceptable: 0, avoid: 0, noted: 0 };
    for (const seat of Object.values(room.seats)) {
      if (seat.level === 2) counts.ideal += 1;
      else if (seat.level === 1) counts.acceptable += 1;
      else if (seat.level === -1) counts.avoid += 1;
      else if (seat.note) counts.noted += 1;
    }
    return counts;
  }

  function ensureActiveRoom() {
    const exists = allRooms().some(({ room }) => room.id === state.activeRoomId);
    if (exists) return;
    state.activeRoomId = allRooms()[0]?.room.id ?? null;
    saveState();
  }

  function seatInGrid(seatId, rows, cols) {
    const match = /^([A-Z])(\d{1,2})$/.exec(seatId);
    if (!match) return false;
    return ROW_LETTERS.indexOf(match[1]) < rows && Number(match[2]) <= cols;
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  function render() {
    ensureActiveRoom();
    renderSidebar();
    renderMain();
  }

  function renderSidebar() {
    if (!state.cinemas.length) {
      el.roomList.innerHTML = '<p class="empty">Agrega tu primer cine.</p>';
      return;
    }

    el.roomList.innerHTML = state.cinemas.map((cinema) => {
      const rooms = cinema.rooms.length
        ? cinema.rooms.map((room) => {
          const counts = countSeats(room);
          const pills = [
            counts.ideal ? `<span class="pill ideal">${counts.ideal}</span>` : '',
            counts.acceptable ? `<span class="pill acceptable">${counts.acceptable}</span>` : '',
            counts.avoid ? `<span class="pill avoid">${counts.avoid}</span>` : '',
          ].join('');

          return `
            <button class="room-link${room.id === state.activeRoomId ? ' active' : ''}" data-room="${esc(room.id)}" title="${esc(room.name)}">
              <span class="room-link-name">${esc(room.name)}</span>
              <span class="room-counts">${pills}</span>
            </button>`;
        }).join('')
        : '<p class="empty small">Sin salas todavía.</p>';

      return `
        <section class="cine-group">
          <div class="cine-head">
            <h3>${esc(cinema.name)}</h3>
            <span class="cine-count">${cinema.rooms.length}</span>
          </div>
          ${rooms}
        </section>`;
    }).join('');
  }

  function seatButton(room, row, num) {
    const seatId = `${row}${num}`;
    const seat = room.seats[seatId];
    const level = seat?.level ?? 0;
    const classes = ['seat'];

    if (level === 2) classes.push('ideal');
    else if (level === 1) classes.push('acceptable');
    else if (level === -1) classes.push('avoid');
    else if (seat) classes.push('noted');

    if (seat?.note) classes.push('has-note');

    const parts = [`${row}${num}`];
    if (level) parts.push(LEVEL_LABEL[level]);
    if (seat?.note) parts.push(seat.note);
    const label = parts.join(' · ');

    return `<button type="button" class="${classes.join(' ')}" data-seat="${seatId}" title="${esc(label)}" aria-label="${esc(label)}">${num}</button>`;
  }

  function renderMain() {
    const found = findRoom(state.activeRoomId);

    if (!found) {
      el.main.innerHTML = `
        <div class="empty-state">
          <span class="big">🎟️</span>
          <h2>Tu mapa de asientos está vacío</h2>
          <p>Todavía no hay salas. Crea una para empezar a marcar los asientos que te gustan.</p>
          <button class="btn primary" id="emptyAddRoom">+ Nueva sala</button>
        </div>`;
      $('#emptyAddRoom')?.addEventListener('click', () => openRoomModal());
      return;
    }

    const { cinema, room } = found;
    const counts = countSeats(room);
    const rowsHtml = [];

    for (let r = 0; r < room.rows; r += 1) {
      const row = ROW_LETTERS[r];
      const seats = [];
      for (let num = 1; num <= room.cols; num += 1) {
        seats.push(seatButton(room, row, num));
      }
      rowsHtml.push(`
        <div class="seat-row">
          <span class="row-label">${row}</span>
          ${seats.join('')}
        </div>`);
    }

    el.main.innerHTML = `
      <section class="room-header">
        <div>
          <p class="eyebrow">${esc(cinema.name)}</p>
          <h2>${esc(room.name)}</h2>
          <p class="room-note${room.note ? '' : ' muted'}">${room.note ? esc(room.note) : 'Sin observación general de la sala.'}</p>
        </div>
        <div class="room-actions">
          <button class="btn ghost" id="editRoomBtn">Editar sala</button>
        </div>
      </section>

      <section class="stats" aria-label="Resumen de la sala">
        <div class="stat">
          <span class="stat-num">${counts.ideal}</span>
          <span class="stat-label"><i class="swatch ideal"></i>Ideales</span>
        </div>
        <div class="stat">
          <span class="stat-num">${counts.acceptable}</span>
          <span class="stat-label"><i class="swatch acceptable"></i>Aceptables</span>
        </div>
        <div class="stat">
          <span class="stat-num">${counts.avoid}</span>
          <span class="stat-label"><i class="swatch avoid"></i>Para evitar</span>
        </div>
        <div class="stat">
          <span class="stat-num">${room.rows}×${room.cols}</span>
          <span class="stat-label">Filas × asientos</span>
        </div>
      </section>

      <section class="map-card">
        <div class="screen-wrap">
          <div class="screen"></div>
          <p class="screen-label">PANTALLA</p>
        </div>
        <div class="map-scroll">
          <div class="seat-map" id="seatMap" style="--cols:${room.cols}">
            ${rowsHtml.join('')}
          </div>
        </div>
        <div class="legend">
          <span><i class="swatch ideal"></i>Ideal</span>
          <span><i class="swatch acceptable"></i>Aceptable</span>
          <span><i class="swatch avoid"></i>Evitar</span>
          <span><i class="swatch noted"></i>Solo nota</span>
        </div>
        <p class="map-hint">Toca un asiento para marcarlo y agregar una observación.</p>
      </section>`;

    $('#seatMap')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-seat]');
      if (button) openSeat(button.dataset.seat);
    });

    $('#editRoomBtn')?.addEventListener('click', () => openRoomModal(room));
  }

  /* ------------------------------------------------------------------ */
  /* Seat sheet                                                          */
  /* ------------------------------------------------------------------ */

  function statusButton(level, title, hint, currentLevel) {
    return `
      <button type="button" class="status-btn ${LEVEL_CLASS[level]}${currentLevel === level ? ' active' : ''}" data-level="${level}">
        <strong>${title}</strong>
        <span>${hint}</span>
      </button>`;
  }

  function renderSheet() {
    const found = findRoom(state.activeRoomId);
    if (!found || !sheetSeat) return;

    const { cinema, room } = found;
    const row = sheetSeat.slice(0, 1);
    const num = sheetSeat.slice(1);
    const seat = room.seats[sheetSeat] ?? { level: 0, note: '' };
    const level = seat.level || 0;

    el.sheetContent.innerHTML = `
      <div class="sheet-head">
        <div>
          <p class="eyebrow">${esc(cinema.name)} · ${esc(room.name)}</p>
          <h3>Fila ${row}, asiento ${num}</h3>
        </div>
        <button type="button" class="icon-btn" id="closeSheet" aria-label="Cerrar">✕</button>
      </div>

      <p class="sheet-help">¿Cómo es este asiento?</p>
      <div class="status-grid">
        ${statusButton(2, 'Ideal', 'Mi primera opción, se ve perfecto.', level)}
        ${statusButton(1, 'Aceptable', 'Sirve si no quedan ideales.', level)}
        ${statusButton(-1, 'Evitar', 'Muy abajo, incómodo o mala vista.', level)}
      </div>

      <label class="field">
        <span>Observación</span>
        <textarea id="seatNoteInput" rows="4" maxlength="600" placeholder="Ej. Centrado con la pantalla, pasillo a la derecha...">${esc(seat.note || '')}</textarea>
      </label>

      <div class="sheet-actions">
        <button type="button" class="btn primary block" id="saveSeatNote">Guardar observación</button>
        <button type="button" class="btn ghost block danger" id="clearSeat">Quitar marca y nota</button>
      </div>`;
  }

  function openSeat(seatId) {
    sheetSeat = seatId;
    renderSheet();
    el.seatSheet.hidden = false;
    el.sheetScrim.hidden = false;
    requestAnimationFrame(() => {
      el.seatSheet.classList.add('open');
      el.sheetScrim.classList.add('open');
      updateScrollLock();
    });
  }

  function closeSeat() {
    sheetSeat = null;
    el.seatSheet.classList.remove('open');
    el.sheetScrim.classList.remove('open');
    updateScrollLock();
    window.setTimeout(() => {
      if (!sheetSeat) {
        el.seatSheet.hidden = true;
        el.sheetScrim.hidden = true;
      }
    }, 240);
  }

  function applyLevel(level) {
    const found = findRoom(state.activeRoomId);
    if (!found || !sheetSeat) return;

    const noteInput = $('#seatNoteInput');
    const note = noteInput ? noteInput.value.trim() : (found.room.seats[sheetSeat]?.note ?? '');

    found.room.seats[sheetSeat] = { level, note };
    saveState();
    renderSidebar();
    renderMain();
    renderSheet();
  }

  function saveSeatNote() {
    const found = findRoom(state.activeRoomId);
    if (!found || !sheetSeat) return;

    const noteInput = $('#seatNoteInput');
    const note = noteInput ? noteInput.value.trim() : '';
    const existing = found.room.seats[sheetSeat];

    if (!existing && !note) {
      closeSeat();
      return;
    }

    if (!existing) {
      found.room.seats[sheetSeat] = { level: 0, note };
    } else {
      existing.note = note;
      if (!existing.level && !note) delete found.room.seats[sheetSeat];
    }

    saveState();
    renderSidebar();
    renderMain();
    renderSheet();
    toast('Observación guardada');
  }

  function clearSeat() {
    const found = findRoom(state.activeRoomId);
    if (!found || !sheetSeat) return;

    delete found.room.seats[sheetSeat];
    saveState();
    renderSidebar();
    renderMain();
    closeSeat();
    toast('Marca eliminada');
  }

  /* ------------------------------------------------------------------ */
  /* Modals                                                              */
  /* ------------------------------------------------------------------ */

  function updateScrollLock() {
    const locked = el.sidebar.classList.contains('open')
      || el.seatSheet.classList.contains('open')
      || el.modalWrap.classList.contains('open');
    document.body.classList.toggle('no-scroll', locked);
  }

  function openModal(html) {
    el.modalCard.innerHTML = html;
    el.modalWrap.hidden = false;
    requestAnimationFrame(() => {
      el.modalWrap.classList.add('open');
      updateScrollLock();
    });
  }

  function closeModal() {
    el.modalWrap.classList.remove('open');
    updateScrollLock();
    window.setTimeout(() => {
      if (!el.modalWrap.classList.contains('open')) el.modalWrap.hidden = true;
    }, 180);
  }

  function openRoomModal(room = null) {
    const editing = Boolean(room);
    const current = editing ? findRoom(room.id) : null;
    const selectedCinemaId = current?.cinema.id ?? state.cinemas[0]?.id;
    const cinemaOptions = state.cinemas.map((cinema) => (
      `<option value="${esc(cinema.id)}"${cinema.id === selectedCinemaId ? ' selected' : ''}>${esc(cinema.name)}</option>`
    )).join('');

    openModal(`
      <form id="roomForm">
        <div class="modal-head">
          <h3>${editing ? 'Editar sala' : 'Nueva sala'}</h3>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button>
        </div>

        <label class="field">
          <span>Cine</span>
          <select id="roomCinema">${cinemaOptions}</select>
        </label>

        <label class="field">
          <span>Nombre de la sala</span>
          <input id="roomName" maxlength="60" required value="${esc(room?.name || '')}" placeholder="Sala 14" />
        </label>

        <div class="field-row">
          <label class="field">
            <span>Filas</span>
            <input id="roomRows" type="number" min="1" max="26" required value="${room?.rows ?? 14}" />
          </label>
          <label class="field">
            <span>Asientos por fila</span>
            <input id="roomCols" type="number" min="1" max="30" required value="${room?.cols ?? 16}" />
          </label>
        </div>

        <label class="field">
          <span>Observación de la sala</span>
          <textarea id="roomNote" rows="3" maxlength="800" placeholder="Ej. La fila G está muy abajo; mejor H o J.">${esc(room?.note || '')}</textarea>
        </label>

        <div class="modal-actions">
          ${editing ? '<button type="button" class="btn ghost danger" id="deleteRoomBtn">Eliminar sala</button>' : ''}
          <span class="spacer"></span>
          <button type="button" class="btn ghost" data-close>Cancelar</button>
          <button type="submit" class="btn primary">${editing ? 'Guardar cambios' : 'Crear sala'}</button>
        </div>
      </form>`);

    const form = $('#roomForm', el.modalCard);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitRoom(room, editing);
    });

    $('#deleteRoomBtn', el.modalCard)?.addEventListener('click', () => deleteRoom(room));

    window.setTimeout(() => $('#roomName', el.modalCard)?.focus(), 60);
  }

  function submitRoom(room, editing) {
    const name = $('#roomName', el.modalCard).value.trim();
    const cinemaId = $('#roomCinema', el.modalCard).value;
    const rows = clampInt($('#roomRows', el.modalCard).value, 1, 26, 14);
    const cols = clampInt($('#roomCols', el.modalCard).value, 1, 30, 16);
    const note = $('#roomNote', el.modalCard).value.trim();
    const targetCinema = state.cinemas.find((cinema) => cinema.id === cinemaId);

    if (!name || !targetCinema) return;

    if (!editing) {
      const newRoom = {
        id: uid('sala'),
        name,
        rows,
        cols,
        note,
        seats: {},
      };
      targetCinema.rooms.push(newRoom);
      state.activeRoomId = newRoom.id;
      saveState();
      closeModal();
      render();
      toast('Sala creada');
      return;
    }

    const outside = Object.keys(room.seats).filter((seatId) => !seatInGrid(seatId, rows, cols));
    if (outside.length) {
      const ok = window.confirm(`Al reducir la sala se eliminarán ${outside.length} asiento(s) marcado(s). ¿Continuar?`);
      if (!ok) return;
      outside.forEach((seatId) => delete room.seats[seatId]);
    }

    const previous = findRoom(room.id);
    room.name = name;
    room.rows = rows;
    room.cols = cols;
    room.note = note;

    if (previous && previous.cinema.id !== cinemaId) {
      previous.cinema.rooms = previous.cinema.rooms.filter((item) => item.id !== room.id);
      targetCinema.rooms.push(room);
    }

    saveState();
    closeModal();
    render();
    toast('Sala actualizada');
  }

  function deleteRoom(room) {
    const found = findRoom(room.id);
    if (!found) return;

    const marked = Object.keys(room.seats).length;
    const message = marked
      ? `¿Eliminar "${room.name}" y sus ${marked} asiento(s) marcado(s)?`
      : `¿Eliminar "${room.name}"?`;
    if (!window.confirm(message)) return;

    found.cinema.rooms = found.cinema.rooms.filter((item) => item.id !== room.id);
    if (state.activeRoomId === room.id) state.activeRoomId = null;
    ensureActiveRoom();
    closeSeat();
    closeModal();
    saveState();
    render();
    toast('Sala eliminada');
  }

  function openCinemaModal() {
    const list = state.cinemas.map((cinema) => `
      <li>
        <span>${esc(cinema.name)} <small style="color:var(--muted-2)">· ${cinema.rooms.length} sala(s)</small></span>
        <button type="button" class="btn tiny ghost danger" data-cinema="${esc(cinema.id)}">Eliminar</button>
      </li>`).join('');

    openModal(`
      <form id="cinemaForm">
        <div class="modal-head">
          <h3>Agregar cine</h3>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button>
        </div>
        <label class="field">
          <span>Nombre del cine</span>
          <input id="cinemaName" maxlength="60" required placeholder="Cinemex Plaza Bella" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close>Cancelar</button>
          <button type="submit" class="btn primary">Agregar cine</button>
        </div>
      </form>
      <div class="divider"></div>
      <h4 style="font-size:13px;color:var(--muted)">Cines existentes</h4>
      <ul class="cinema-list">${list}</ul>`);

    const form = $('#cinemaForm', el.modalCard);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#cinemaName', el.modalCard);
      const name = input.value.trim();
      if (!name) return;
      state.cinemas.push({ id: uid('cine'), name, rooms: [] });
      saveState();
      renderSidebar();
      toast('Cine agregado');
      input.value = '';
      input.focus();
    });

    el.modalCard.querySelectorAll('[data-cinema]').forEach((button) => {
      button.addEventListener('click', () => {
        const cinema = state.cinemas.find((item) => item.id === button.dataset.cinema);
        if (!cinema) return;
        if (state.cinemas.length === 1) {
          window.alert('Necesitas al menos un cine. Agrega otro antes de eliminar este.');
          return;
        }
        const message = cinema.rooms.length
          ? `¿Eliminar "${cinema.name}" con sus ${cinema.rooms.length} sala(s)?`
          : `¿Eliminar "${cinema.name}"?`;
        if (!window.confirm(message)) return;

        state.cinemas = state.cinemas.filter((item) => item.id !== cinema.id);
        ensureActiveRoom();
        saveState();
        render();
        closeModal();
        toast('Cine eliminado');
      });
    });

    window.setTimeout(() => $('#cinemaName', el.modalCard)?.focus(), 60);
  }

  /* ------------------------------------------------------------------ */
  /* Sidebar / toast / backup                                            */
  /* ------------------------------------------------------------------ */

  function openSidebar() {
    el.sidebar.classList.add('open');
    el.scrim.hidden = false;
    requestAnimationFrame(() => {
      el.scrim.classList.add('open');
      updateScrollLock();
    });
    el.menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    el.sidebar.classList.remove('open');
    el.scrim.classList.remove('open');
    el.menuBtn.setAttribute('aria-expanded', 'false');
    updateScrollLock();
    window.setTimeout(() => {
      if (!el.sidebar.classList.contains('open')) el.scrim.hidden = true;
    }, 220);
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    window.clearTimeout(toastTimer);
    requestAnimationFrame(() => el.toast.classList.add('open'));
    toastTimer = window.setTimeout(() => {
      el.toast.classList.remove('open');
      window.setTimeout(() => { el.toast.hidden = true; }, 220);
    }, 2400);
  }

  function exportData() {
    const payload = { ...state, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asientos-cine-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
    toast('Respaldo descargado');
  }

  async function importData(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.cinemas)) {
        throw new Error('El archivo no tiene el formato esperado.');
      }

      const next = normalizeState(parsed);
      const rooms = next.cinemas.flatMap((cinema) => cinema.rooms);
      if (!rooms.length && !window.confirm('El archivo no contiene salas. ¿Importar de todos modos?')) return;

      state = next;
      saveState();
      closeSeat();
      closeModal();
      render();
      toast('Datos importados');
    } catch (error) {
      window.alert(`No pude importar el archivo: ${error.message}`);
    } finally {
      el.importFile.value = '';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  el.roomList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-room]');
    if (!button) return;
    state.activeRoomId = button.dataset.room;
    saveState();
    render();
    closeSidebar();
  });

  el.sheetContent.addEventListener('click', (event) => {
    if (event.target.closest('#closeSheet')) {
      closeSeat();
      return;
    }

    const status = event.target.closest('[data-level]');
    if (status) {
      applyLevel(Number(status.dataset.level));
      return;
    }

    if (event.target.closest('#saveSeatNote')) {
      saveSeatNote();
      return;
    }

    if (event.target.closest('#clearSeat')) clearSeat();
  });

  el.modalWrap.addEventListener('click', (event) => {
    if (event.target === el.modalWrap || event.target.closest('[data-close]')) closeModal();
  });

  el.menuBtn.addEventListener('click', () => {
    if (el.sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  $('#closeSidebarBtn').addEventListener('click', closeSidebar);

  el.scrim.addEventListener('click', closeSidebar);
  el.sheetScrim.addEventListener('click', closeSeat);

  el.addRoomBtn.addEventListener('click', () => {
    closeSidebar();
    openRoomModal();
  });

  el.addCinemaBtn.addEventListener('click', () => {
    closeSidebar();
    openCinemaModal();
  });

  el.exportBtn.addEventListener('click', exportData);
  el.importBtn.addEventListener('click', () => el.importFile.click());
  el.importFile.addEventListener('change', () => {
    const file = el.importFile.files?.[0];
    if (file) importData(file);
  });

  el.resetBtn.addEventListener('click', () => {
    const ok = window.confirm('Esto reemplaza tus salas y marcas actuales por los datos de ejemplo. ¿Continuar?');
    if (!ok) return;
    state = seedState();
    saveState();
    closeSeat();
    closeModal();
    render();
    closeSidebar();
    toast('Datos de ejemplo restaurados');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (el.modalWrap.classList.contains('open')) closeModal();
    else if (el.seatSheet.classList.contains('open')) closeSeat();
    else if (el.sidebar.classList.contains('open')) closeSidebar();
  });

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  saveState();
  render();
})();
