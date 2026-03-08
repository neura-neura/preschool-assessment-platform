(() => {
  'use strict';

  const STORAGE_KEY = 'evaluador_preescolar_v2';
  const BACKUP_SIGNATURE = '# EVALUADOR_PREESCOLAR_BACKUP_V1';

  const FIELD_DEFS = [
    { key: 'lenguajes', title: 'LENGUAJES', reportLabel: 'LENGUAJES', type: 'desc', min: 190, max: 200 },
    { key: 'rec_lenguajes', title: 'RECOMENDACIONES LENGUAJES', reportLabel: 'RECOMENDACIONES', type: 'rec', min: 90, max: 100 },
    { key: 'saberes', title: 'SABERES Y PENSAMIENTO CIENTIFICO', reportLabel: 'SABERES Y PENSAMIENTO CIENTIFICO', type: 'desc', min: 190, max: 200 },
    { key: 'rec_saberes', title: 'RECOMENDACIONES SABERES', reportLabel: 'RECOMENDACIONES', type: 'rec', min: 90, max: 100 },
    { key: 'etica', title: 'ETICA NATURALEZA Y SOCIEDADES', reportLabel: 'ETICA NATURALEZA Y SOCIEDADES', type: 'desc', min: 190, max: 200 },
    { key: 'rec_etica', title: 'RECOMENDACIONES ETICA', reportLabel: 'RECOMENDACIONES', type: 'rec', min: 90, max: 100 },
    { key: 'humano', title: 'DE LO HUMANO Y LO COMUNITARIO', reportLabel: 'DE LO HUMANO Y LO COMUNITARIO', type: 'desc', min: 190, max: 200 },
    { key: 'rec_humano', title: 'RECOMENDACIONES HUMANO', reportLabel: 'RECOMENDACIONES', type: 'rec', min: 90, max: 100 }
  ];

  const BACKUP_KEYS = {
    LENGUAJES: 'lenguajes',
    RECOMENDACIONES_LENGUAJES: 'rec_lenguajes',
    SABERES_Y_PENSAMIENTO_CIENTIFICO: 'saberes',
    RECOMENDACIONES_SABERES_Y_PENSAMIENTO_CIENTIFICO: 'rec_saberes',
    ETICA_NATURALEZA_Y_SOCIEDADES: 'etica',
    RECOMENDACIONES_ETICA_NATURALEZA_Y_SOCIEDADES: 'rec_etica',
    DE_LO_HUMANO_Y_LO_COMUNITARIO: 'humano',
    RECOMENDACIONES_DE_LO_HUMANO_Y_LO_COMUNITARIO: 'rec_humano'
  };

  const PUNCTUATION_CHARS = '.,!?;:()[]{}"\'`/|@#$%^&*_+=<>~-';
  const ISSUE_LABELS = {
    EMPTY: 'CAMPO VACIO',
    LENGTH_OUT_RANGE: 'LONGITUD FUERA DE RANGO',
    INVALID_CHARS: 'CARACTERES NO PERMITIDOS',
    PUNCTUATION: 'NO SE PERMITEN SIGNOS DE PUNTUACION',
    UPPERCASE: 'DEBE ESTAR EN MAYUSCULAS',
    TRUNCATED: 'PARECE FRASE RECORTADA',
    EXACT_DUPLICATE: 'TEXTO EXACTO REPETIDO EN OTRO CAMPO',
    PHRASE_DUPLICATE: 'FRASES REPETIDAS'
  };

  const VALIDATABLE_CODES = new Set(Object.keys(ISSUE_LABELS));
  const LETTER_OR_DIGIT_REGEX = /^[A-Za-z0-9Ññ]$/;
  const FIELD_BY_KEY = new Map(FIELD_DEFS.map((def) => [def.key, def]));

  const stopwords = new Set([
    'DE', 'LA', 'EL', 'Y', 'EN', 'CON', 'DEL', 'AL', 'LOS', 'LAS', 'UN', 'UNA', 'POR', 'PARA',
    'SE', 'SU', 'SUS', 'QUE', 'CON', 'COMO', 'A', 'O', 'LO', 'LE', 'LES', 'MAS', 'SIN', 'YA'
  ]);

  const connectors = new Set(['Y', 'DE', 'DEL', 'LA', 'EL', 'EN', 'CON', 'PARA', 'AL', 'LOS', 'LAS']);

  const dom = {
    saveStatus: document.getElementById('saveStatus'),
    lastSaved: document.getElementById('lastSaved'),
    addStudentBtn: document.getElementById('addStudentBtn'),
    duplicateStudentBtn: document.getElementById('duplicateStudentBtn'),
    deleteStudentBtn: document.getElementById('deleteStudentBtn'),
    saveBtn: document.getElementById('saveBtn'),
    normalizeAllBtn: document.getElementById('normalizeAllBtn'),
    exportProgressBtn: document.getElementById('exportProgressBtn'),
    exportIssuesBtn: document.getElementById('exportIssuesBtn'),
    downloadReportBtn: document.getElementById('downloadReportBtn'),
    importFileInput: document.getElementById('importFileInput'),
    allowCommasToggle: document.getElementById('allowCommasToggle'),
    allowPunctuationToggle: document.getElementById('allowPunctuationToggle'),
    forceUppercaseToggle: document.getElementById('forceUppercaseToggle'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    studentList: document.getElementById('studentList'),
    searchStudent: document.getElementById('searchStudent'),
    studentName: document.getElementById('studentName'),
    fieldGrid: document.getElementById('fieldGrid'),
    fieldCardTemplate: document.getElementById('fieldCardTemplate'),
    globalMetrics: document.getElementById('globalMetrics'),
    repeatedWords: document.getElementById('repeatedWords'),
    repeatedPhrases: document.getElementById('repeatedPhrases'),
    similarityList: document.getElementById('similarityList'),
    issuesList: document.getElementById('issuesList'),
    validatedIssuesList: document.getElementById('validatedIssuesList'),
    downloadSummaryDialog: document.getElementById('downloadSummaryDialog'),
    downloadSummaryBody: document.getElementById('downloadSummaryBody'),
    cancelDownloadBtn: document.getElementById('cancelDownloadBtn'),
    confirmDownloadBtn: document.getElementById('confirmDownloadBtn'),
    exportIssuesDialog: document.getElementById('exportIssuesDialog'),
    includeDetectedErrors: document.getElementById('includeDetectedErrors'),
    includeValidatedErrors: document.getElementById('includeValidatedErrors'),
    exportIssuesStats: document.getElementById('exportIssuesStats'),
    cancelExportIssuesBtn: document.getElementById('cancelExportIssuesBtn'),
    confirmExportIssuesBtn: document.getElementById('confirmExportIssuesBtn')
  };

  const state = {
    students: [],
    selectedId: null,
    updatedAt: null,
    dirty: false,
    settings: defaultSettings()
  };

  let saveTimer = null;

  function uid() {
    return `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function emptyFields() {
    return {
      lenguajes: '',
      rec_lenguajes: '',
      saberes: '',
      rec_saberes: '',
      etica: '',
      rec_etica: '',
      humano: '',
      rec_humano: ''
    };
  }

  function defaultSettings() {
    return {
      allowCommas: false,
      allowPunctuation: false,
      forceUppercase: true,
      darkMode: false
    };
  }

  function normalizeSettings(raw) {
    const defaults = defaultSettings();
    if (!raw || typeof raw !== 'object') return defaults;
    return {
      allowCommas: Boolean(raw.allowCommas),
      allowPunctuation: Boolean(raw.allowPunctuation),
      forceUppercase: raw.forceUppercase === undefined ? defaults.forceUppercase : Boolean(raw.forceUppercase),
      darkMode: raw.darkMode === undefined ? defaults.darkMode : Boolean(raw.darkMode)
    };
  }

  function emptyValidations() {
    const out = {};
    FIELD_DEFS.forEach((def) => {
      out[def.key] = [];
    });
    return out;
  }

  function cleanValidationCodes(codes) {
    if (!Array.isArray(codes)) return [];
    const seen = new Set();
    const out = [];
    codes.forEach((raw) => {
      const code = String(raw || '').trim().toUpperCase();
      if (!VALIDATABLE_CODES.has(code)) return;
      if (seen.has(code)) return;
      seen.add(code);
      out.push(code);
    });
    return out;
  }

  function normalizeValidations(source) {
    const base = emptyValidations();
    if (!source || typeof source !== 'object') return base;
    FIELD_DEFS.forEach((def) => {
      base[def.key] = cleanValidationCodes(source[def.key]);
    });
    return base;
  }

  function createStudent(name = 'NUEVO ALUMNO') {
    return {
      id: uid(),
      name: sanitizeName(name),
      fields: emptyFields(),
      validated: emptyValidations()
    };
  }

  function sanitizeName(text) {
    return sanitizeText(text, state.settings).trim();
  }

  function removeAccentsKeepEnye(text) {
    return String(text || '')
      .replace(/[ÁÀÂÄ]/g, 'A')
      .replace(/[áàâä]/g, 'a')
      .replace(/[ÉÈÊË]/g, 'E')
      .replace(/[éèêë]/g, 'e')
      .replace(/[ÍÌÎÏ]/g, 'I')
      .replace(/[íìîï]/g, 'i')
      .replace(/[ÓÒÔÖ]/g, 'O')
      .replace(/[óòôö]/g, 'o')
      .replace(/[ÚÙÛÜ]/g, 'U')
      .replace(/[úùûü]/g, 'u');
  }

  function charAllowedBySettings(ch, settings) {
    if (ch === ' ') return true;
    if (LETTER_OR_DIGIT_REGEX.test(ch)) return true;
    if (ch === ',') return settings.allowCommas;
    if (PUNCTUATION_CHARS.includes(ch)) return settings.allowPunctuation;
    return false;
  }

  function normalizeForRules(text, settings = state.settings) {
    const safe = normalizeSettings(settings);
    const source = removeAccentsKeepEnye(text);
    const out = [];

    for (const ch of source) {
      if (ch === '\n' || ch === '\r' || ch === '\t') {
        out.push(' ');
        continue;
      }
      if (charAllowedBySettings(ch, safe)) out.push(ch);
      else out.push(' ');
    }

    let value = out.join('').replace(/\s{2,}/g, ' ').trim();
    if (safe.forceUppercase) value = value.toUpperCase();
    return value;
  }

  function sanitizeText(text, settings = state.settings) {
    return normalizeForRules(text, settings);
  }

  function hasForbiddenPunctuation(text, settings = state.settings) {
    const safe = normalizeSettings(settings);
    const src = removeAccentsKeepEnye(text);
    for (const ch of src) {
      if (!PUNCTUATION_CHARS.includes(ch)) continue;
      if (ch === ',' && safe.allowCommas) continue;
      if (ch !== ',' && safe.allowPunctuation) continue;
      return true;
    }
    return false;
  }

  function hasForbiddenCharacters(text, settings = state.settings) {
    const safe = normalizeSettings(settings);
    const src = removeAccentsKeepEnye(text);
    for (const ch of src) {
      if (ch === '\n' || ch === '\r' || ch === '\t') continue;
      if (charAllowedBySettings(ch, safe)) continue;
      return true;
    }
    return false;
  }

  function needsManualCleanup(text) {
    const src = removeAccentsKeepEnye(text);
    return /[a-z]/.test(src) || /[,.!?;:()[\]{}"'`\/|@#$%^&*_+=<>~-]/.test(src);
  }

  function strictCleanText(text) {
    return sanitizeText(text, { allowCommas: false, allowPunctuation: false, forceUppercase: true });
  }

  function normalizeForAnalysis(text) {
    return strictCleanText(text);
  }

  function makeIssue(code, def = null, detail = '') {
    if (code === 'LENGTH_OUT_RANGE' && def) {
      return { code, message: `LONGITUD FUERA DE RANGO ${def.min}-${def.max}` };
    }
    if (code === 'PHRASE_DUPLICATE' && detail) {
      return { code, message: `FRASES REPETIDAS: ${detail}` };
    }
    return { code, message: ISSUE_LABELS[code] || code };
  }

  function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }

  function validateField(text, def, settings = state.settings) {
    const value = text || '';
    const issues = [];
    const chars = value.length;
    const words = countWords(value);
    const safe = normalizeSettings(settings);

    if (!value.trim()) issues.push(makeIssue('EMPTY', def));
    if (chars < def.min || chars > def.max) issues.push(makeIssue('LENGTH_OUT_RANGE', def));
    if (hasForbiddenCharacters(value, safe)) issues.push(makeIssue('INVALID_CHARS', def));
    if (hasForbiddenPunctuation(value, safe)) issues.push(makeIssue('PUNCTUATION', def));
    if (safe.forceUppercase && /[a-z]/.test(removeAccentsKeepEnye(value))) issues.push(makeIssue('UPPERCASE', def));
    const lastWord = value.split(/\s+/).filter(Boolean).pop() || '';
    if (connectors.has(lastWord.toUpperCase())) issues.push(makeIssue('TRUNCATED', def));

    return {
      chars,
      words,
      issues,
      isValid: issues.length === 0
    };
  }

  function getValidatedCodes(student, fieldKey) {
    if (!student || !student.validated) return [];
    return cleanValidationCodes(student.validated[fieldKey]);
  }

  function getActiveIssues(student, fieldKey, issues) {
    const allowed = new Set(getValidatedCodes(student, fieldKey));
    return (issues || []).filter((issue) => !allowed.has(issue.code));
  }

  function extractPhrases(text, size = 5) {
    const words = normalizeForAnalysis(text).split(/\s+/).filter(Boolean);
    if (words.length < size) return [];
    const unique = new Set();
    for (let i = 0; i <= words.length - size; i += 1) {
      unique.add(words.slice(i, i + size).join(' '));
    }
    return [...unique];
  }

  function escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function compactOccurrenceList(list) {
    const seen = new Set();
    const out = [];
    (list || []).forEach((item) => {
      const id = `${item.studentId}::${item.fieldKey}`;
      if (seen.has(id)) return;
      seen.add(id);
      out.push(item);
    });
    return out;
  }

  function tooltipFromOccurrences(list, limit = 14) {
    const rows = compactOccurrenceList(list)
      .slice(0, limit)
      .map((x) => `${x.studentName} | ${x.fieldTitle}`);
    if (!rows.length) return '';
    if (compactOccurrenceList(list).length > limit) rows.push('...');
    return rows.join('\n');
  }

  function findStudentById(id) {
    return state.students.find((s) => s.id === id) || null;
  }

  function getSelectedStudent() {
    return findStudentById(state.selectedId) || state.students[0] || null;
  }

  function studentQuality(student) {
    let valid = 0;
    let completed = 0;
    let issues = 0;
    const duplicateData = getDuplicateData();
    for (const def of FIELD_DEFS) {
      const fieldIssues = collectFieldIssues(student, def, duplicateData);
      const activeIssues = getActiveIssues(student, def.key, fieldIssues);
      if (student.fields[def.key].trim()) completed += 1;
      if (!activeIssues.length) valid += 1;
      issues += activeIssues.length;
    }
    return { valid, completed, issues };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.settings = defaultSettings();
        state.students = [createStudent('ALUMNO 1')];
        state.selectedId = state.students[0].id;
        state.updatedAt = null;
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.students) || !parsed.students.length) throw new Error('DATA INVALIDA');
      state.settings = normalizeSettings(parsed.settings);
      state.students = parsed.students.map((s) => ({
        id: s.id || uid(),
        name: sanitizeName(s.name || 'ALUMNO'),
        fields: Object.assign(emptyFields(), s.fields || {}),
        validated: normalizeValidations(s.validated)
      }));
      state.selectedId = parsed.selectedId && findStudentById(parsed.selectedId) ? parsed.selectedId : state.students[0].id;
      state.updatedAt = parsed.updatedAt || null;
    } catch {
      state.settings = defaultSettings();
      state.students = [createStudent('ALUMNO 1')];
      state.selectedId = state.students[0].id;
      state.updatedAt = null;
    }
  }

  function setSavedStatus() {
    dom.saveStatus.textContent = state.dirty ? 'CAMBIOS SIN GUARDAR' : 'GUARDADO';
    dom.saveStatus.classList.toggle('muted', !state.dirty);
    dom.lastSaved.textContent = state.updatedAt
      ? `ULTIMO GUARDADO ${new Date(state.updatedAt).toLocaleString()}`
      : 'SIN REGISTRO';
  }

  function renderSettings() {
    const safe = normalizeSettings(state.settings);
    dom.allowCommasToggle.checked = safe.allowCommas;
    dom.allowPunctuationToggle.checked = safe.allowPunctuation;
    dom.forceUppercaseToggle.checked = safe.forceUppercase;
    dom.darkModeToggle.checked = safe.darkMode;
    document.body.classList.toggle('dark-mode', safe.darkMode);
  }

  function markDirty() {
    state.dirty = true;
    setSavedStatus();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(false), 800);
  }

  function saveState(manual = false) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      students: state.students,
      selectedId: state.selectedId,
      updatedAt: state.updatedAt,
      settings: state.settings
    }));
    state.dirty = false;
    setSavedStatus();
    if (manual) flash('GUARDADO MANUAL');
  }

  function flash(msg) {
    dom.saveStatus.textContent = msg;
    setTimeout(() => setSavedStatus(), 900);
  }

  function normalizeAll() {
    state.students.forEach((st) => {
      st.name = sanitizeName(st.name);
      for (const def of FIELD_DEFS) {
        st.fields[def.key] = sanitizeText(st.fields[def.key], state.settings);
        st.validated[def.key] = cleanValidationCodes(st.validated[def.key]);
      }
    });
    markDirty();
    renderAll();
  }

  function addStudent() {
    const name = prompt('NOMBRE DEL ALUMNO');
    if (name === null) return;
    const student = createStudent(name || `ALUMNO ${state.students.length + 1}`);
    state.students.push(student);
    state.selectedId = student.id;
    markDirty();
    renderAll();
  }

  function duplicateStudent() {
    const selected = getSelectedStudent();
    if (!selected) return;
    const clone = {
      id: uid(),
      name: sanitizeName(`${selected.name} COPIA`),
      fields: { ...selected.fields },
      validated: emptyValidations()
    };
    state.students.push(clone);
    state.selectedId = clone.id;
    markDirty();
    renderAll();
  }

  function deleteStudent() {
    const selected = getSelectedStudent();
    if (!selected) return;
    if (!confirm(`BORRAR A ${selected.name}?`)) return;
    state.students = state.students.filter((s) => s.id !== selected.id);
    if (!state.students.length) state.students.push(createStudent('ALUMNO 1'));
    state.selectedId = state.students[0].id;
    markDirty();
    renderAll();
  }

  function renderStudentList() {
    const query = normalizeForAnalysis(dom.searchStudent.value || '');
    dom.studentList.innerHTML = '';

    state.students
      .filter((s) => !query || normalizeForAnalysis(s.name).includes(query))
      .forEach((student) => {
        const li = document.createElement('li');
        li.className = 'student-item';
        if (student.id === state.selectedId) li.classList.add('active');

        const quality = studentQuality(student);
        const statusClass = quality.valid === FIELD_DEFS.length ? 'ok' : quality.completed >= 4 ? 'warn' : 'err';

        li.innerHTML = `
          <div class="top">
            <div class="name">${student.name || 'SIN NOMBRE'}</div>
            <span class="student-status ${statusClass}"></span>
          </div>
          <div class="meta">VALIDOS ${quality.valid}/8 | COMPLETOS ${quality.completed}/8</div>
        `;

        li.addEventListener('click', () => {
          state.selectedId = student.id;
          renderAll();
        });

        dom.studentList.appendChild(li);
      });
  }

  function getDuplicateData() {
    const textRows = [];
    state.students.forEach((st) => {
      FIELD_DEFS.forEach((def) => {
        const text = normalizeForAnalysis(st.fields[def.key]);
        if (!text) return;
        textRows.push({
          id: st.id,
          name: st.name,
          key: def.key,
          fieldTitle: def.title,
          text
        });
      });
    });

    const exact = new Map();
    const exactDetails = new Map();
    textRows.forEach((r) => {
      exact.set(r.text, (exact.get(r.text) || 0) + 1);
      if (!exactDetails.has(r.text)) exactDetails.set(r.text, []);
      exactDetails.get(r.text).push({
        studentId: r.id,
        studentName: r.name,
        fieldKey: r.key,
        fieldTitle: r.fieldTitle
      });
    });

    const phraseMap = new Map();
    const phraseDetails = new Map();
    textRows.forEach((r) => {
      extractPhrases(r.text, 5).forEach((ph) => {
        phraseMap.set(ph, (phraseMap.get(ph) || 0) + 1);
        if (!phraseDetails.has(ph)) phraseDetails.set(ph, []);
        phraseDetails.get(ph).push({
          studentId: r.id,
          studentName: r.name,
          fieldKey: r.key,
          fieldTitle: r.fieldTitle
        });
      });
    });

    const wordMap = new Map();
    const wordDetails = new Map();
    textRows.forEach((r) => {
      const seenInRow = new Set();
      r.text
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 4 && !stopwords.has(w))
        .forEach((w) => {
          if (seenInRow.has(w)) return;
          seenInRow.add(w);
          wordMap.set(w, (wordMap.get(w) || 0) + 1);
          if (!wordDetails.has(w)) wordDetails.set(w, []);
          wordDetails.get(w).push({
            studentId: r.id,
            studentName: r.name,
            fieldKey: r.key,
            fieldTitle: r.fieldTitle
          });
        });
    });

    return { exact, exactDetails, phraseMap, phraseDetails, wordMap, wordDetails, textRows };
  }

  function fieldExtraIssues(student, def, duplicateData) {
    const current = normalizeForAnalysis(student.fields[def.key]);
    if (!current) return [];
    const issues = [];
    if ((duplicateData.exact.get(current) || 0) > 1) issues.push(makeIssue('EXACT_DUPLICATE', def));
    const repeatedSegments = extractPhrases(current, 5).filter((s) => (duplicateData.phraseMap.get(s) || 0) > 1);
    if (repeatedSegments.length) issues.push(makeIssue('PHRASE_DUPLICATE', def, repeatedSegments.slice(0, 2).join(' | ')));
    return issues;
  }

  function collectFieldIssues(student, def, duplicateData) {
    const base = validateField(student.fields[def.key], def, state.settings).issues;
    return [...base, ...fieldExtraIssues(student, def, duplicateData)];
  }

  function setFieldValidated(student, fieldKey, issueCodes) {
    const prev = getValidatedCodes(student, fieldKey);
    const merged = cleanValidationCodes([...prev, ...(issueCodes || [])]);
    student.validated[fieldKey] = merged;
  }

  function removeFieldValidatedCode(student, fieldKey, code) {
    const next = getValidatedCodes(student, fieldKey).filter((x) => x !== code);
    student.validated[fieldKey] = next;
  }

  function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    textarea.setRangeText(text, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function attachSmartPaste(textarea) {
    textarea.addEventListener('paste', (ev) => {
      const txt = ev.clipboardData ? ev.clipboardData.getData('text') : '';
      ev.preventDefault();
      const corrected = sanitizeText(txt, state.settings);
      if (!corrected) return;
      insertTextAtCursor(textarea, corrected);
    });

    textarea.addEventListener('drop', (ev) => {
      const txt = ev.dataTransfer ? ev.dataTransfer.getData('text') : '';
      ev.preventDefault();
      const corrected = sanitizeText(txt, state.settings);
      if (!corrected) return;
      insertTextAtCursor(textarea, corrected);
    });
  }

  function renderEditor() {
    const student = getSelectedStudent();
    if (!student) return;

    dom.studentName.value = student.name;
    dom.fieldGrid.innerHTML = '';

    FIELD_DEFS.forEach((def) => {
      const node = dom.fieldCardTemplate.content.firstElementChild.cloneNode(true);
      const title = node.querySelector('h3');
      const badge = node.querySelector('.field-badge');
      const textarea = node.querySelector('textarea');
      const meta = node.querySelector('.field-meta');
      const issuesBox = node.querySelector('.field-issues');
      const cleanBtn = node.querySelector('.clean-btn');
      const validateBtn = node.querySelector('.validate-btn');

      title.textContent = def.title;
      badge.textContent = `${def.min}-${def.max}`;
      textarea.value = student.fields[def.key];
      attachSmartPaste(textarea);

      const refreshFieldState = () => {
        const val = sanitizeText(textarea.value, state.settings);
        if (val !== textarea.value) textarea.value = val;
        student.fields[def.key] = val;

        const duplicateDataNow = getDuplicateData();
        const result = validateField(val, def, state.settings);
        const allIssues = collectFieldIssues(student, def, duplicateDataNow);
        const activeIssues = getActiveIssues(student, def.key, allIssues);
        const validatedIssues = allIssues.filter((issue) => !activeIssues.includes(issue));
        const canClean = needsManualCleanup(student.fields[def.key]);

        textarea.classList.toggle('invalid', activeIssues.length > 0);
        meta.innerHTML = `
          <span>CARACTERES: <b>${result.chars}</b></span>
          <span>PALABRAS: <b>${result.words}</b></span>
          <span>RANGO: <b>${def.min}-${def.max}</b></span>
          <span>ESTADO: <b>${activeIssues.length ? 'REVISAR' : 'OK'}</b></span>
          <span>VALIDADOS: <b>${validatedIssues.length}</b></span>
        `;

        issuesBox.textContent = activeIssues.map((x) => x.message).join(' | ');
        cleanBtn.disabled = !canClean;
        validateBtn.disabled = activeIssues.length === 0;
      };

      refreshFieldState();

      textarea.addEventListener('input', () => {
        refreshFieldState();
        markDirty();
        renderMetrics();
        renderStudentList();
      });

      validateBtn.addEventListener('click', () => {
        const duplicateDataNow = getDuplicateData();
        const allIssues = collectFieldIssues(student, def, duplicateDataNow);
        const activeIssues = getActiveIssues(student, def.key, allIssues);
        if (!activeIssues.length) {
          flash('NO HAY ERRORES ACTIVOS EN ESTE CAMPO');
          return;
        }
        setFieldValidated(student, def.key, activeIssues.map((i) => i.code));
        markDirty();
        renderAll();
        flash('ERRORES VALIDADOS EN EL CAMPO');
      });

      cleanBtn.addEventListener('click', () => {
        const current = student.fields[def.key] || '';
        const cleaned = strictCleanText(current);
        if (cleaned === current) return;
        student.fields[def.key] = cleaned;
        textarea.value = cleaned;
        refreshFieldState();
        markDirty();
        renderMetrics();
        renderStudentList();
        flash('TEXTO LIMPIO APLICADO');
      });

      dom.fieldGrid.appendChild(node);
    });
  }

  function buildMetrics() {
    let descWords = 0;
    let recWords = 0;
    let totalWords = 0;
    let rangeOk = 0;
    let rangeOkWithValidated = 0;
    let invalidPunct = 0;
    let forbiddenChars = 0;
    let totalFields = 0;

    const issuesActive = [];
    const fieldIssueMap = new Map();
    const duplicateData = getDuplicateData();

    state.students.forEach((st) => {
      FIELD_DEFS.forEach((def) => {
        totalFields += 1;
        const text = st.fields[def.key];
        const v = validateField(text, def, state.settings);
        const allIssues = collectFieldIssues(st, def, duplicateData);
        const activeIssues = getActiveIssues(st, def.key, allIssues);

        totalWords += v.words;
        if (def.type === 'desc') descWords += v.words;
        else recWords += v.words;

        const isInRange = v.chars >= def.min && v.chars <= def.max;
        if (isInRange) rangeOk += 1;
        const lengthValidated = getValidatedCodes(st, def.key).includes('LENGTH_OUT_RANGE');
        if (isInRange || lengthValidated) rangeOkWithValidated += 1;
        if (hasForbiddenPunctuation(text, state.settings)) invalidPunct += 1;
        if (hasForbiddenCharacters(text, state.settings)) forbiddenChars += 1;

        fieldIssueMap.set(`${st.id}::${def.key}`, allIssues);
        activeIssues.forEach((issue) => {
          issuesActive.push({
            studentId: st.id,
            fieldKey: def.key,
            studentName: st.name,
            fieldTitle: def.title,
            code: issue.code,
            message: issue.message
          });
        });
      });
    });

    const validatedRecords = [];
    state.students.forEach((st) => {
      FIELD_DEFS.forEach((def) => {
        const allIssues = fieldIssueMap.get(`${st.id}::${def.key}`) || [];
        const issueCodesNow = new Set(allIssues.map((issue) => issue.code));
        getValidatedCodes(st, def.key).forEach((code) => {
          validatedRecords.push({
            studentId: st.id,
            fieldKey: def.key,
            studentName: st.name,
            fieldTitle: def.title,
            code,
            message: ISSUE_LABELS[code] || code,
            activeNow: issueCodesNow.has(code)
          });
        });
      });
    });

    const repeatedWords = [...duplicateData.wordMap.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 36)
      .map(([term, count]) => ({
        term,
        count,
        occurrences: compactOccurrenceList(duplicateData.wordDetails.get(term) || [])
      }));

    const repeatedPhrases = [...duplicateData.phraseMap.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([term, count]) => ({
        term,
        count,
        occurrences: compactOccurrenceList(duplicateData.phraseDetails.get(term) || [])
      }));

    const exactRepeats = [...duplicateData.exact.entries()].filter(([, n]) => n > 1).length;

    const similarity = computeSimilarity();

    return {
      totalStudents: state.students.length,
      totalFields,
      rangeOk,
      rangeOkWithValidated,
      invalidPunct,
      forbiddenChars,
      descWords,
      recWords,
      totalWords,
      repeatedWords,
      repeatedPhrases,
      exactRepeats,
      similarity,
      issuesActive,
      validatedRecords,
      duplicateData
    };
  }

  function computeSimilarity(limit = 10) {
    const rows = [];
    const vectors = state.students.map((st) => {
      const set = new Set(
        FIELD_DEFS
          .map((d) => st.fields[d.key])
          .join(' ')
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => w.length >= 4 && !stopwords.has(w))
      );
      return { id: st.id, name: st.name, set };
    });

    for (let i = 0; i < vectors.length; i += 1) {
      for (let j = i + 1; j < vectors.length; j += 1) {
        const a = vectors[i];
        const b = vectors[j];
        const inter = [...a.set].filter((w) => b.set.has(w)).length;
        const union = new Set([...a.set, ...b.set]).size || 1;
        const score = inter / union;
        if (score >= 0.26) {
          rows.push({ a: a.name, b: b.name, aId: a.id, bId: b.id, score });
        }
      }
    }

    rows.sort((x, y) => y.score - x.score);
    if (typeof limit === 'number' && Number.isFinite(limit) && limit >= 0) {
      return rows.slice(0, limit);
    }
    return rows;
  }

  function pickRepeatedForStudent(items, studentId) {
    if (!studentId) return [];
    return (items || [])
      .map((item) => {
        const ownOccurrences = item.occurrences.filter((occ) => String(occ.studentId) === String(studentId));
        return {
          term: item.term,
          occurrences: ownOccurrences,
          count: ownOccurrences.length
        };
      })
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  function renderRepeatedWordGroups(globalItems, selectedItems) {
    const selectedHtml = selectedItems.length
      ? `<div class="list-inline">${selectedItems.map((item) => {
        const tip = escapeHtml(tooltipFromOccurrences(item.occurrences)).replaceAll('\n', '&#10;');
        return `<span class="token" title="${tip}">${escapeHtml(item.term)} (${item.count})</span>`;
      }).join('')}</div>`
      : '<div class="issue-item">SIN COINCIDENCIAS PARA ALUMNO ACTIVO</div>';

    const globalHtml = globalItems.length
      ? `<div class="list-inline">${globalItems.slice(0, 28).map((item) => {
        const tip = escapeHtml(tooltipFromOccurrences(item.occurrences)).replaceAll('\n', '&#10;');
        return `<span class="token" title="${tip}">${escapeHtml(item.term)} (${item.count})</span>`;
      }).join('')}</div>`
      : '<div class="issue-item">SIN REPETICIONES GENERALES</div>';

    return `
      <div class="mini-section-title">ALUMNO ACTIVO</div>
      ${selectedHtml}
      <div class="mini-section-title">GENERAL</div>
      ${globalHtml}
    `;
  }

  function renderRepeatedPhraseGroups(globalItems, selectedItems) {
    const selectedHtml = selectedItems.length
      ? selectedItems.slice(0, 14).map((item) => {
        const tip = escapeHtml(tooltipFromOccurrences(item.occurrences)).replaceAll('\n', '&#10;');
        return `<div class="issue-item" title="${tip}">(${item.count}) ${escapeHtml(item.term)}</div>`;
      }).join('')
      : '<div class="issue-item">SIN COINCIDENCIAS PARA ALUMNO ACTIVO</div>';

    const globalHtml = globalItems.length
      ? globalItems.slice(0, 18).map((item) => {
        const tip = escapeHtml(tooltipFromOccurrences(item.occurrences)).replaceAll('\n', '&#10;');
        return `<div class="issue-item" title="${tip}">(${item.count}) ${escapeHtml(item.term)}</div>`;
      }).join('')
      : '<div class="issue-item">SIN REPETICIONES GENERALES</div>';

    return `
      <div class="mini-section-title">ALUMNO ACTIVO</div>
      ${selectedHtml}
      <div class="mini-section-title">GENERAL</div>
      ${globalHtml}
    `;
  }

  function renderMetrics() {
    const m = buildMetrics();
    const selected = state.selectedId ? findStudentById(state.selectedId) : null;
    const selectedId = selected ? String(selected.id) : null;
    const selectedName = selected ? selected.name : 'SIN SELECCION';
    const studentIssuesActive = selectedId
      ? m.issuesActive.filter((x) => String(x.studentId) === selectedId)
      : [];
    const studentValidated = selectedId
      ? m.validatedRecords.filter((x) => String(x.studentId) === selectedId)
      : [];

    const repeatedWordsStudent = pickRepeatedForStudent(m.repeatedWords, selectedId);
    const repeatedPhrasesStudent = pickRepeatedForStudent(m.repeatedPhrases, selectedId);

    const cards = [
      {
        label: 'ALUMNOS',
        value: m.totalStudents,
        hint: 'TOTAL DE REGISTROS CARGADOS'
      },
      {
        label: 'CAMPOS EN RANGO',
        value: `${m.rangeOk}/${m.totalFields}`,
        sub: `CON VALIDADOS ${m.rangeOkWithValidated}/${m.totalFields}`,
        hint: 'CARACTERES EN RANGO, Y SEGUNDA LINEA INCLUYE LONGITUDES VALIDADAS MANUALMENTE'
      },
      {
        label: 'PALABRAS CAMPOS',
        value: m.descWords,
        hint: 'SUMA DE PALABRAS EN LOS 4 CAMPOS FORMATIVOS DE TODOS LOS ALUMNOS'
      },
      {
        label: 'PALABRAS RECOM',
        value: m.recWords,
        hint: 'SUMA DE PALABRAS EN LAS 4 RECOMENDACIONES DE TODOS LOS ALUMNOS'
      },
      {
        label: 'PALABRAS TOTALES',
        value: m.totalWords,
        hint: 'SUMA TOTAL DE PALABRAS EN CAMPOS Y RECOMENDACIONES'
      },
      {
        label: 'TEXTO EXACTO REPETIDO',
        value: m.exactRepeats,
        hint: 'CANTIDAD DE TEXTOS COMPLETOS QUE APARECEN IGUALES EN MAS DE UN CAMPO'
      },
      {
        label: 'ERRORES ACTIVOS',
        value: studentIssuesActive.length,
        hint: `SOLO DEL ALUMNO ACTIVO: ${selectedName}`
      },
      {
        label: 'ERRORES VALIDADOS',
        value: studentValidated.length,
        hint: `SOLO DEL ALUMNO ACTIVO: ${selectedName}`
      }
    ];

    dom.globalMetrics.innerHTML = cards
      .map((card) => `<div class="metric-card" title="${escapeHtml(card.hint || '')}"><div class="label">${escapeHtml(card.label)}</div><div class="value">${escapeHtml(card.value)}</div>${card.sub ? `<div class="sub">${escapeHtml(card.sub)}</div>` : ''}</div>`)
      .join('');

    dom.repeatedWords.innerHTML = renderRepeatedWordGroups(m.repeatedWords, repeatedWordsStudent);

    dom.repeatedPhrases.innerHTML = renderRepeatedPhraseGroups(m.repeatedPhrases, repeatedPhrasesStudent);

    dom.similarityList.innerHTML = m.similarity.length
      ? m.similarity.map((s) => `<div class="issue-item">${Math.round(s.score * 100)}% | ${s.a} <> ${s.b}</div>`).join('')
      : '<div class="issue-item">SIMILITUD BAJA ENTRE ALUMNOS</div>';

    dom.issuesList.innerHTML = studentIssuesActive.length
      ? `<div class="issue-item">ALUMNO ACTIVO: ${selectedName}</div>${studentIssuesActive.slice(0, 60).map((x) => `<div class="issue-item">${x.fieldTitle} | ${x.message}</div>`).join('')}`
      : `<div class="issue-item">ALUMNO ACTIVO: ${selectedName}</div><div class="issue-item">SIN ERRORES ACTUALES</div>`;

    dom.validatedIssuesList.innerHTML = studentValidated.length
      ? `<div class="issue-item">ALUMNO ACTIVO: ${selectedName}</div>${studentValidated
        .map((x) => {
          const stateLabel = x.activeNow ? 'ACTIVO' : 'INACTIVO';
          return `<div class="issue-item validated">${x.fieldTitle} | ${x.message} | ${stateLabel}<button class="mini-btn" data-action="unvalidate" data-student-id="${x.studentId}" data-field-key="${x.fieldKey}" data-code="${x.code}">DESVALIDAR</button></div>`;
        })
        .join('')}`
      : `<div class="issue-item">ALUMNO ACTIVO: ${selectedName}</div><div class="issue-item">SIN ERRORES VALIDADOS</div>`;

    return m;
  }

  function summaryListHtml(items, emptyText, formatter) {
    if (!items.length) return `<div class="issue-item">${emptyText}</div>`;
    return items.slice(0, 80).map((item) => `<div class="issue-item">${formatter(item)}</div>`).join('');
  }

  function openDownloadSummary() {
    const m = buildMetrics();
    const activeHtml = summaryListHtml(
      m.issuesActive,
      'SIN ERRORES ACTIVOS',
      (x) => `${x.studentName} | ${x.fieldTitle} | ${x.message}`
    );
    const validatedHtml = summaryListHtml(
      m.validatedRecords,
      'SIN ERRORES VALIDADOS',
      (x) => `${x.studentName} | ${x.fieldTitle} | ${x.message} | ${x.activeNow ? 'ACTIVO' : 'INACTIVO'}`
    );

    dom.downloadSummaryBody.innerHTML = `
      <div class="summary-grid">
        <div class="summary-stat">ALUMNOS<b>${m.totalStudents}</b></div>
        <div class="summary-stat">CAMPOS EN RANGO<b>${m.rangeOk}/${m.totalFields}</b></div>
        <div class="summary-stat">RANGO CON VALIDADOS<b>${m.rangeOkWithValidated}/${m.totalFields}</b></div>
        <div class="summary-stat">PALABRAS TOTALES<b>${m.totalWords}</b></div>
        <div class="summary-stat">ERRORES ACTIVOS<b>${m.issuesActive.length}</b></div>
        <div class="summary-stat">ERRORES VALIDADOS<b>${m.validatedRecords.length}</b></div>
        <div class="summary-stat">SIMILITUDES ALTAS<b>${m.similarity.length}</b></div>
      </div>
      <div class="summary-section">
        <h4>ERRORES ACTIVOS</h4>
        ${activeHtml}
      </div>
      <div class="summary-section">
        <h4>ERRORES VALIDADOS</h4>
        ${validatedHtml}
      </div>
    `;

    dom.downloadSummaryDialog.showModal();
  }

  function closeDownloadSummary() {
    if (dom.downloadSummaryDialog.open) dom.downloadSummaryDialog.close();
  }

  function closeExportIssuesDialog() {
    if (dom.exportIssuesDialog.open) dom.exportIssuesDialog.close();
  }

  function exportValue(value) {
    return String(value || '')
      .replaceAll('\\', '\\\\')
      .replaceAll('|', '\\|')
      .replace(/\r?\n/g, ' ')
      .trim();
  }

  function issueScopeLabel(includeDetected, includeValidated) {
    if (includeDetected && includeValidated) return 'BOTH';
    if (includeDetected) return 'DETECTED_ONLY';
    return 'VALIDATED_ONLY';
  }

  function exportIssuesFilename(includeDetected, includeValidated) {
    if (includeDetected && includeValidated) return 'errores_detectados_y_validados.txt';
    if (includeDetected) return 'errores_detectados.txt';
    return 'errores_validados.txt';
  }

  function updateExportIssuesStats() {
    const m = buildMetrics();
    const includeDetected = Boolean(dom.includeDetectedErrors.checked);
    const includeValidated = Boolean(dom.includeValidatedErrors.checked);
    const selectedDetected = includeDetected ? m.issuesActive.length : 0;
    const selectedValidated = includeValidated ? m.validatedRecords.length : 0;

    dom.exportIssuesStats.innerHTML = `
      <div class="summary-stat">ALUMNOS<b>${m.totalStudents}</b></div>
      <div class="summary-stat">ERRORES DETECTADOS<b>${m.issuesActive.length}</b></div>
      <div class="summary-stat">ERRORES VALIDADOS<b>${m.validatedRecords.length}</b></div>
      <div class="summary-stat">SE EXPORTAN DETECTADOS<b>${selectedDetected}</b></div>
      <div class="summary-stat">SE EXPORTAN VALIDADOS<b>${selectedValidated}</b></div>
      <div class="summary-stat">TOTAL A EXPORTAR<b>${selectedDetected + selectedValidated}</b></div>
    `;
  }

  function openExportIssuesDialog() {
    dom.includeDetectedErrors.checked = true;
    dom.includeValidatedErrors.checked = true;
    updateExportIssuesStats();
    dom.exportIssuesDialog.showModal();
  }

  function buildErrorsExportText(includeDetected, includeValidated) {
    const m = buildMetrics();
    const duplicateData = m.duplicateData;
    const scope = issueScopeLabel(includeDetected, includeValidated);
    const allSimilarity = computeSimilarity(null);
    const similarityByStudent = new Map();

    (allSimilarity || []).forEach((row) => {
      if (!row || !row.aId || !row.bId) return;
      const aId = String(row.aId);
      const bId = String(row.bId);
      if (!similarityByStudent.has(aId)) similarityByStudent.set(aId, []);
      if (!similarityByStudent.has(bId)) similarityByStudent.set(bId, []);
      similarityByStudent.get(aId).push({
        otherId: bId,
        otherName: row.b,
        score: row.score
      });
      similarityByStudent.get(bId).push({
        otherId: aId,
        otherName: row.a,
        score: row.score
      });
    });

    const lines = [
      '# EVALUADOR_PREESCOLAR_ERROR_EXPORT_V1',
      `# FECHA: ${new Date().toISOString()}`,
      '# FORMATO: BLOQUES POR ALUMNO Y CAMPO PARA PROCESAMIENTO IA',
      `EXPORT_SCOPE: ${scope}`,
      `INCLUDE_DETECTED: ${includeDetected ? 1 : 0}`,
      `INCLUDE_VALIDATED: ${includeValidated ? 1 : 0}`,
      `TOTAL_STUDENTS: ${m.totalStudents}`,
      `TOTAL_DETECTED_INCLUDED: ${includeDetected ? m.issuesActive.length : 0}`,
      `TOTAL_VALIDATED_INCLUDED: ${includeValidated ? m.validatedRecords.length : 0}`,
      `SETTING_ALLOW_COMMAS: ${state.settings.allowCommas ? 1 : 0}`,
      `SETTING_ALLOW_PUNCTUATION: ${state.settings.allowPunctuation ? 1 : 0}`,
      `SETTING_FORCE_UPPERCASE: ${state.settings.forceUppercase ? 1 : 0}`,
      `SETTING_DARK_MODE: ${state.settings.darkMode ? 1 : 0}`,
      ''
    ];

    state.students.forEach((st, studentIndex) => {
      const studentId = String(st.id);
      const studentName = sanitizeName(st.name || 'ALUMNO');
      let rangeOk = 0;
      let rangeOkWithValidated = 0;
      let descWords = 0;
      let recWords = 0;
      let totalWords = 0;
      let forbiddenPunctuationFields = 0;
      let forbiddenCharsFields = 0;

      const fieldRows = [];
      const exactDuplicateRows = [];

      FIELD_DEFS.forEach((def) => {
        const text = st.fields[def.key] || '';
        const validation = validateField(text, def, state.settings);
        const allIssues = collectFieldIssues(st, def, duplicateData);
        const activeIssues = getActiveIssues(st, def.key, allIssues);
        const validatedCodes = getValidatedCodes(st, def.key);
        const issueByCode = new Map(allIssues.map((issue) => [issue.code, issue]));
        const validatedIssues = validatedCodes.map((code) => {
          const issue = issueByCode.get(code);
          return {
            code,
            message: issue ? issue.message : (ISSUE_LABELS[code] || code),
            activeNow: Boolean(issue)
          };
        });

        const isInRange = validation.chars >= def.min && validation.chars <= def.max;
        if (isInRange) rangeOk += 1;
        if (isInRange || validatedCodes.includes('LENGTH_OUT_RANGE')) rangeOkWithValidated += 1;
        if (def.type === 'desc') descWords += validation.words;
        else recWords += validation.words;
        totalWords += validation.words;
        if (hasForbiddenPunctuation(text, state.settings)) forbiddenPunctuationFields += 1;
        if (hasForbiddenCharacters(text, state.settings)) forbiddenCharsFields += 1;

        const normalized = normalizeForAnalysis(text);
        const exactCount = normalized ? (duplicateData.exact.get(normalized) || 0) : 0;
        if (normalized && exactCount > 1) {
          const related = compactOccurrenceList(duplicateData.exactDetails.get(normalized) || [])
            .filter((occ) => !(String(occ.studentId) === studentId && occ.fieldKey === def.key));
          exactDuplicateRows.push({
            fieldKey: def.key,
            fieldTitle: def.title,
            duplicateCount: exactCount,
            related
          });
        }

        fieldRows.push({
          def,
          text,
          validation,
          isInRange,
          activeIssues,
          validatedIssues
        });
      });

      const repeatedWords = [...duplicateData.wordMap.entries()]
        .filter(([, totalCount]) => totalCount > 1)
        .map(([term, totalCount]) => {
          const allOccurrences = compactOccurrenceList(duplicateData.wordDetails.get(term) || []);
          const ownOccurrences = allOccurrences.filter((occ) => String(occ.studentId) === studentId);
          if (!ownOccurrences.length) return null;
          return {
            term,
            totalCount,
            ownOccurrences,
            ownCount: ownOccurrences.length
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.totalCount - a.totalCount || b.ownCount - a.ownCount || a.term.localeCompare(b.term));

      const repeatedPhrases = [...duplicateData.phraseMap.entries()]
        .filter(([, totalCount]) => totalCount > 1)
        .map(([term, totalCount]) => {
          const allOccurrences = compactOccurrenceList(duplicateData.phraseDetails.get(term) || []);
          const ownOccurrences = allOccurrences.filter((occ) => String(occ.studentId) === studentId);
          if (!ownOccurrences.length) return null;
          return {
            term,
            totalCount,
            ownOccurrences,
            ownCount: ownOccurrences.length
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.totalCount - a.totalCount || b.ownCount - a.ownCount || a.term.localeCompare(b.term));

      const similarityRows = (similarityByStudent.get(studentId) || [])
        .slice()
        .sort((a, b) => b.score - a.score);

      const detectedCount = fieldRows.reduce((sum, row) => sum + row.activeIssues.length, 0);
      const validatedCount = fieldRows.reduce((sum, row) => sum + row.validatedIssues.length, 0);

      lines.push(`ALUMNO_INICIO: ${studentIndex + 1}`);
      lines.push(`ALUMNO_ID: ${exportValue(studentId)}`);
      lines.push(`ALUMNO_NOMBRE: ${exportValue(studentName)}`);
      lines.push(`CALIDAD_CAMPOS_TOTALES: ${FIELD_DEFS.length}`);
      lines.push(`CALIDAD_CAMPOS_EN_RANGO: ${rangeOk}/${FIELD_DEFS.length}`);
      lines.push(`CALIDAD_CAMPOS_EN_RANGO_CON_VALIDADOS: ${rangeOkWithValidated}/${FIELD_DEFS.length}`);
      lines.push(`CALIDAD_PALABRAS_CAMPOS: ${descWords}`);
      lines.push(`CALIDAD_PALABRAS_RECOMENDACIONES: ${recWords}`);
      lines.push(`CALIDAD_PALABRAS_TOTALES: ${totalWords}`);
      lines.push(`CALIDAD_CAMPOS_CON_SIGNOS_NO_PERMITIDOS: ${forbiddenPunctuationFields}`);
      lines.push(`CALIDAD_CAMPOS_CON_CARACTERES_NO_PERMITIDOS: ${forbiddenCharsFields}`);
      lines.push(`CALIDAD_ERRORES_DETECTADOS_INCLUIDOS: ${includeDetected ? detectedCount : 0}`);
      lines.push(`CALIDAD_ERRORES_VALIDADOS_INCLUIDOS: ${includeValidated ? validatedCount : 0}`);
      lines.push(`CALIDAD_DUPLICADOS_EXACTOS_EN_ALUMNO: ${exactDuplicateRows.length}`);
      lines.push(`CALIDAD_PALABRAS_REPETIDAS_ASOCIADAS: ${repeatedWords.length}`);
      lines.push(`CALIDAD_FRASES_REPETIDAS_ASOCIADAS: ${repeatedPhrases.length}`);
      lines.push(`CALIDAD_SIMILITUDES_ALTAS_ASOCIADAS: ${similarityRows.length}`);
      lines.push(`SECCION_ERRORES_DETECTADOS_INCLUIDA: ${includeDetected ? 1 : 0}`);
      lines.push(`SECCION_ERRORES_VALIDADOS_INCLUIDA: ${includeValidated ? 1 : 0}`);
      lines.push('');

      fieldRows.forEach((row, fieldIndex) => {
        lines.push(`CAMPO_INICIO: ${fieldIndex + 1}`);
        lines.push(`CAMPO_KEY: ${row.def.key}`);
        lines.push(`CAMPO_TITULO: ${exportValue(row.def.title)}`);
        lines.push(`CAMPO_TIPO: ${row.def.type}`);
        lines.push(`CAMPO_TEXTO_ACTUAL: ${exportValue(row.text)}`);
        lines.push(`CAMPO_CARACTERES: ${row.validation.chars}`);
        lines.push(`CAMPO_PALABRAS: ${row.validation.words}`);
        lines.push(`CAMPO_RANGO_MIN: ${row.def.min}`);
        lines.push(`CAMPO_RANGO_MAX: ${row.def.max}`);
        lines.push(`CAMPO_EN_RANGO: ${row.isInRange ? 1 : 0}`);
        lines.push(`CAMPO_ERRORES_DETECTADOS_TOTALES: ${row.activeIssues.length}`);
        lines.push(`CAMPO_ERRORES_VALIDADOS_TOTALES: ${row.validatedIssues.length}`);

        if (includeDetected) {
          if (!row.activeIssues.length) {
            lines.push('ERROR_DETECTADO: NONE');
          } else {
            row.activeIssues.forEach((issue) => {
              lines.push(`ERROR_DETECTADO: CODE=${issue.code}|MENSAJE=${exportValue(issue.message)}`);
            });
          }
        }

        if (includeValidated) {
          if (!row.validatedIssues.length) {
            lines.push('ERROR_VALIDADO: NONE');
          } else {
            row.validatedIssues.forEach((issue) => {
              lines.push(`ERROR_VALIDADO: CODE=${issue.code}|MENSAJE=${exportValue(issue.message)}|ACTIVO_AHORA=${issue.activeNow ? 1 : 0}`);
            });
          }
        }

        lines.push('CAMPO_FIN: 1');
        lines.push('');
      });

      lines.push('SECCION_DUPLICADOS_EXACTOS_INICIO: 1');
      if (!exactDuplicateRows.length) {
        lines.push('DUPLICADO_EXACTO: NONE');
      } else {
        exactDuplicateRows.forEach((item) => {
          const related = item.related.map((occ) => `${exportValue(occ.studentName)}::${occ.fieldKey}::${exportValue(occ.fieldTitle)}`);
          lines.push(`DUPLICADO_EXACTO: CAMPO=${item.fieldKey}|TITULO=${exportValue(item.fieldTitle)}|COINCIDENCIAS=${item.duplicateCount}|RELACIONADOS=${related.length ? related.join(';') : 'NONE'}`);
        });
      }
      lines.push('SECCION_DUPLICADOS_EXACTOS_FIN: 1');
      lines.push('');

      lines.push('SECCION_PALABRAS_REPETIDAS_INICIO: 1');
      if (!repeatedWords.length) {
        lines.push('PALABRA_REPETIDA: NONE');
      } else {
        repeatedWords.forEach((item) => {
          const fields = item.ownOccurrences.map((occ) => `${occ.fieldKey}:${exportValue(occ.fieldTitle)}`).join(';');
          lines.push(`PALABRA_REPETIDA: TERMINO=${exportValue(item.term)}|OCURRENCIAS_GLOBALES=${item.totalCount}|OCURRENCIAS_ALUMNO=${item.ownCount}|CAMPOS=${fields}`);
        });
      }
      lines.push('SECCION_PALABRAS_REPETIDAS_FIN: 1');
      lines.push('');

      lines.push('SECCION_FRASES_REPETIDAS_INICIO: 1');
      if (!repeatedPhrases.length) {
        lines.push('FRASE_REPETIDA: NONE');
      } else {
        repeatedPhrases.forEach((item) => {
          const fields = item.ownOccurrences.map((occ) => `${occ.fieldKey}:${exportValue(occ.fieldTitle)}`).join(';');
          lines.push(`FRASE_REPETIDA: TERMINO=${exportValue(item.term)}|OCURRENCIAS_GLOBALES=${item.totalCount}|OCURRENCIAS_ALUMNO=${item.ownCount}|CAMPOS=${fields}`);
        });
      }
      lines.push('SECCION_FRASES_REPETIDAS_FIN: 1');
      lines.push('');

      lines.push('SECCION_SIMILITUD_INICIO: 1');
      if (!similarityRows.length) {
        lines.push('SIMILITUD_ALTA: NONE');
      } else {
        similarityRows.forEach((item) => {
          lines.push(`SIMILITUD_ALTA: CON_ID=${exportValue(item.otherId)}|CON_NOMBRE=${exportValue(item.otherName)}|SCORE=${item.score.toFixed(4)}|PORCENTAJE=${Math.round(item.score * 100)}`);
        });
      }
      lines.push('SECCION_SIMILITUD_FIN: 1');
      lines.push(`ALUMNO_FIN: ${studentIndex + 1}`);
      lines.push('---');
      lines.push('');
    });

    return `${lines.join('\n').trimEnd()}\n`;
  }

  function renderAll() {
    renderSettings();
    renderStudentList();
    renderEditor();
    renderMetrics();
    setSavedStatus();
  }

  function backupText() {
    const lines = [
      BACKUP_SIGNATURE,
      `# FECHA: ${new Date().toISOString()}`,
      '# FORMATO: ALUMNO Y CAMPOS EN MAYUSCULAS',
      `SETTING_ALLOW_COMMAS: ${state.settings.allowCommas ? 1 : 0}`,
      `SETTING_ALLOW_PUNCTUATION: ${state.settings.allowPunctuation ? 1 : 0}`,
      `SETTING_FORCE_UPPERCASE: ${state.settings.forceUppercase ? 1 : 0}`,
      `SETTING_DARK_MODE: ${state.settings.darkMode ? 1 : 0}`,
      ''
    ];

    for (const st of state.students) {
      lines.push(`ALUMNO: ${sanitizeName(st.name)}`);
      lines.push(`LENGUAJES: ${sanitizeText(st.fields.lenguajes)}`);
      lines.push(`RECOMENDACIONES_LENGUAJES: ${sanitizeText(st.fields.rec_lenguajes)}`);
      lines.push(`SABERES_Y_PENSAMIENTO_CIENTIFICO: ${sanitizeText(st.fields.saberes)}`);
      lines.push(`RECOMENDACIONES_SABERES_Y_PENSAMIENTO_CIENTIFICO: ${sanitizeText(st.fields.rec_saberes)}`);
      lines.push(`ETICA_NATURALEZA_Y_SOCIEDADES: ${sanitizeText(st.fields.etica)}`);
      lines.push(`RECOMENDACIONES_ETICA_NATURALEZA_Y_SOCIEDADES: ${sanitizeText(st.fields.rec_etica)}`);
      lines.push(`DE_LO_HUMANO_Y_LO_COMUNITARIO: ${sanitizeText(st.fields.humano)}`);
      lines.push(`RECOMENDACIONES_DE_LO_HUMANO_Y_LO_COMUNITARIO: ${sanitizeText(st.fields.rec_humano)}`);
      FIELD_DEFS.forEach((def) => {
        lines.push(`VALIDACIONES_${def.key.toUpperCase()}: ${getValidatedCodes(st, def.key).join('|')}`);
      });
      lines.push('---');
    }

    return `${lines.join('\n')}\n`;
  }

  function finalReportText() {
    const lines = [];
    state.students.forEach((st) => {
      lines.push(sanitizeName(st.name));
      lines.push(`LENGUAJES: ${sanitizeText(st.fields.lenguajes)}`);
      lines.push(`RECOMENDACIONES: ${sanitizeText(st.fields.rec_lenguajes)}`);
      lines.push(`SABERES Y PENSAMIENTO CIENTIFICO: ${sanitizeText(st.fields.saberes)}`);
      lines.push(`RECOMENDACIONES: ${sanitizeText(st.fields.rec_saberes)}`);
      lines.push(`ETICA NATURALEZA Y SOCIEDADES: ${sanitizeText(st.fields.etica)}`);
      lines.push(`RECOMENDACIONES: ${sanitizeText(st.fields.rec_etica)}`);
      lines.push(`DE LO HUMANO Y LO COMUNITARIO: ${sanitizeText(st.fields.humano)}`);
      lines.push(`RECOMENDACIONES: ${sanitizeText(st.fields.rec_humano)}`);
      lines.push('');
    });
    return `${lines.join('\n').trimEnd()}\n`;
  }

  function downloadTxt(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseBackup(text) {
    const lines = text.split(/\r?\n/);
    const students = [];
    const importedSettings = defaultSettings();
    let current = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      if (line === '---') {
        if (current && current.name) students.push(current);
        current = null;
        continue;
      }
      if (line.startsWith('ALUMNO:')) {
        if (current && current.name) students.push(current);
        current = createStudent('');
        current.name = sanitizeText(line.slice('ALUMNO:'.length).trim(), importedSettings);
        continue;
      }
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const rawVal = line.slice(idx + 1).trim();

      if (key === 'SETTING_ALLOW_COMMAS') {
        importedSettings.allowCommas = rawVal === '1' || rawVal === 'TRUE';
        continue;
      }
      if (key === 'SETTING_ALLOW_PUNCTUATION') {
        importedSettings.allowPunctuation = rawVal === '1' || rawVal === 'TRUE';
        continue;
      }
      if (key === 'SETTING_FORCE_UPPERCASE') {
        importedSettings.forceUppercase = rawVal === '1' || rawVal === 'TRUE';
        continue;
      }
      if (key === 'SETTING_DARK_MODE') {
        importedSettings.darkMode = rawVal === '1' || rawVal === 'TRUE';
        continue;
      }
      if (!current) continue;

      const fieldKey = BACKUP_KEYS[key];
      if (fieldKey) {
        current.fields[fieldKey] = sanitizeText(rawVal, importedSettings);
        continue;
      }
      if (key.startsWith('VALIDACIONES_')) {
        const fieldRaw = key.slice('VALIDACIONES_'.length).toLowerCase();
        if (FIELD_BY_KEY.has(fieldRaw)) {
          const codes = rawVal
            .split(/[|,]/)
            .map((x) => x.trim().toUpperCase())
            .filter(Boolean);
          current.validated[fieldRaw] = cleanValidationCodes(codes);
        }
      }
    }

    if (current && current.name) students.push(current);
    return { students, settings: normalizeSettings(importedSettings) };
  }

  function parseReport(text) {
    const blocks = text
      .split(/\n\s*\n/)
      .map((b) => b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
      .filter((arr) => arr.length);

    const out = [];

    for (const block of blocks) {
      let student = null;
      let recIndex = 0;
      for (let i = 0; i < block.length; i += 1) {
        const line = block[i];
        if (i === 0 && !line.includes(':')) {
          student = createStudent(line);
          continue;
        }
        if (!student) student = createStudent('ALUMNO');

        const defByLabel = FIELD_DEFS.find((d) => line.startsWith(`${d.reportLabel}:`) && d.reportLabel !== 'RECOMENDACIONES');
        if (defByLabel) {
          student.fields[defByLabel.key] = sanitizeText(line.slice(defByLabel.reportLabel.length + 1).trim());
          continue;
        }

        if (line.startsWith('RECOMENDACIONES:')) {
          const recKeys = ['rec_lenguajes', 'rec_saberes', 'rec_etica', 'rec_humano'];
          const key = recKeys[Math.min(recIndex, recKeys.length - 1)];
          student.fields[key] = sanitizeText(line.slice('RECOMENDACIONES:'.length).trim());
          recIndex += 1;
          continue;
        }

        // Compatibilidad con reportes previos
        for (const [backupLabel, key] of Object.entries(BACKUP_KEYS)) {
          const normLabel = backupLabel.replaceAll('_', ' ');
          if (line.startsWith(`${normLabel}:`)) {
            student.fields[key] = sanitizeText(line.slice(normLabel.length + 1).trim());
          }
        }
      }
      if (student && student.name) out.push(student);
    }

    return { students: out, settings: null };
  }

  function importTxt(text) {
    const isBackup = text.includes(BACKUP_SIGNATURE) || /\bALUMNO:/i.test(text);
    const parsed = isBackup ? parseBackup(text) : parseReport(text);
    const importedStudents = Array.isArray(parsed) ? parsed : parsed.students;
    const importedSettings = Array.isArray(parsed) ? null : parsed.settings;

    if (!importedStudents.length) {
      alert('NO SE ENCONTRO INFORMACION UTIL EN EL TXT.');
      return;
    }

    if (importedSettings) {
      state.settings = normalizeSettings(importedSettings);
    }

    state.students = importedStudents.map((s) => ({
      id: uid(),
      name: sanitizeName(s.name || 'ALUMNO'),
      fields: Object.assign(emptyFields(), s.fields || {}),
      validated: normalizeValidations(s.validated)
    }));
    state.selectedId = state.students[0].id;
    markDirty();
    renderAll();
  }

  function bindEvents() {
    dom.addStudentBtn.addEventListener('click', addStudent);
    dom.duplicateStudentBtn.addEventListener('click', duplicateStudent);
    dom.deleteStudentBtn.addEventListener('click', deleteStudent);
    dom.saveBtn.addEventListener('click', () => saveState(true));
    dom.normalizeAllBtn.addEventListener('click', () => {
      normalizeAll();
      flash('TEXTO NORMALIZADO');
    });

    dom.exportProgressBtn.addEventListener('click', () => {
      downloadTxt('progreso_evaluaciones.txt', backupText());
    });

    dom.exportIssuesBtn.addEventListener('click', openExportIssuesDialog);

    dom.downloadReportBtn.addEventListener('click', () => {
      openDownloadSummary();
    });

    dom.includeDetectedErrors.addEventListener('change', updateExportIssuesStats);
    dom.includeValidatedErrors.addEventListener('change', updateExportIssuesStats);

    dom.cancelExportIssuesBtn.addEventListener('click', closeExportIssuesDialog);
    dom.confirmExportIssuesBtn.addEventListener('click', () => {
      const includeDetected = Boolean(dom.includeDetectedErrors.checked);
      const includeValidated = Boolean(dom.includeValidatedErrors.checked);
      if (!includeDetected && !includeValidated) {
        alert('SELECCIONA AL MENOS UN TIPO DE ERROR PARA EXPORTAR.');
        return;
      }
      closeExportIssuesDialog();
      const txt = buildErrorsExportText(includeDetected, includeValidated);
      downloadTxt(exportIssuesFilename(includeDetected, includeValidated), txt);
      flash('ERRORES EXPORTADOS');
    });

    dom.cancelDownloadBtn.addEventListener('click', closeDownloadSummary);
    dom.confirmDownloadBtn.addEventListener('click', () => {
      closeDownloadSummary();
      normalizeAll();
      downloadTxt('reporte_evaluaciones.txt', finalReportText());
    });

    dom.importFileInput.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const text = await file.text();
      importTxt(text);
      dom.importFileInput.value = '';
    });

    dom.searchStudent.addEventListener('input', renderStudentList);

    dom.allowCommasToggle.addEventListener('change', () => {
      state.settings.allowCommas = Boolean(dom.allowCommasToggle.checked);
      markDirty();
      renderAll();
    });

    dom.allowPunctuationToggle.addEventListener('change', () => {
      state.settings.allowPunctuation = Boolean(dom.allowPunctuationToggle.checked);
      markDirty();
      renderAll();
    });

    dom.forceUppercaseToggle.addEventListener('change', () => {
      state.settings.forceUppercase = Boolean(dom.forceUppercaseToggle.checked);
      normalizeAll();
      flash('REGLA DE MAYUSCULAS ACTUALIZADA');
    });

    dom.darkModeToggle.addEventListener('change', () => {
      state.settings.darkMode = Boolean(dom.darkModeToggle.checked);
      renderSettings();
      markDirty();
      renderMetrics();
      flash('MODO DE COLOR ACTUALIZADO');
    });

    dom.validatedIssuesList.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action !== 'unvalidate') return;
      const studentId = target.dataset.studentId || '';
      const fieldKey = target.dataset.fieldKey || '';
      const code = target.dataset.code || '';
      const student = findStudentById(studentId);
      if (!student || !FIELD_BY_KEY.has(fieldKey) || !VALIDATABLE_CODES.has(code)) return;
      removeFieldValidatedCode(student, fieldKey, code);
      markDirty();
      renderAll();
      flash('ERROR DESVALIDADO');
    });

    dom.studentName.addEventListener('input', () => {
      const st = getSelectedStudent();
      if (!st) return;
      st.name = sanitizeName(dom.studentName.value);
      dom.studentName.value = st.name;
      markDirty();
      renderStudentList();
      renderMetrics();
    });

    dom.studentName.addEventListener('paste', (ev) => {
      const txt = ev.clipboardData ? ev.clipboardData.getData('text') : '';
      ev.preventDefault();
      const cleaned = sanitizeName(txt);
      if (!cleaned) return;
      const start = dom.studentName.selectionStart || 0;
      const end = dom.studentName.selectionEnd || 0;
      dom.studentName.setRangeText(cleaned, start, end, 'end');
      dom.studentName.dispatchEvent(new Event('input', { bubbles: true }));
    });

    dom.downloadSummaryDialog.addEventListener('click', (ev) => {
      const rect = dom.downloadSummaryDialog.getBoundingClientRect();
      const inside = ev.clientX >= rect.left && ev.clientX <= rect.right
        && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      if (!inside) closeDownloadSummary();
    });

    dom.exportIssuesDialog.addEventListener('click', (ev) => {
      const rect = dom.exportIssuesDialog.getBoundingClientRect();
      const inside = ev.clientX >= rect.left && ev.clientX <= rect.right
        && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      if (!inside) closeExportIssuesDialog();
    });

    window.addEventListener('beforeunload', (ev) => {
      if (!state.dirty) return;
      ev.preventDefault();
      ev.returnValue = '';
    });
  }

  function init() {
    loadState();
    bindEvents();
    renderAll();
  }

  init();
})();
