const state = { doc: null, parsedGroups: null };

window.addEventListener('DOMContentLoaded', () => {
    const ui = {
        fileInput: document.getElementById('fileInput'),
        selectorsCard: document.getElementById('selectors'),
        searchBtn: document.getElementById('downloadBtn'),
        timetable: document.getElementById('timetable'),
        feedback: document.getElementById('fileFeedback'),
        darkToggle: document.getElementById('darkModeToggle'),
        year: document.getElementById('yearSelect'),
        semester: document.getElementById('semesterSelect'),
        mode: document.getElementById('modeSelect'),
        spec: document.getElementById('specSelect'),
        group: document.getElementById('groupSelect'),
        exportContainer: document.getElementById('exportToolbarContainer')
    };

    applyStoredTheme(ui.darkToggle);
    populateSelectors(ui);
    hookFileUpload(ui);
    hookSearch(ui);
});

function applyStoredTheme(toggle) {
    if (!toggle) return;
    const stored = localStorage.getItem('unitt-dark') === '1';
    document.body.classList.toggle('dark', stored);
    toggle.checked = stored;
    toggle.addEventListener('change', () => {
        document.body.classList.toggle('dark', toggle.checked);
        localStorage.setItem('unitt-dark', toggle.checked ? '1' : '0');
    });
}

const DEFAULT_SPECS = ['AI', 'COM', 'CS', 'CSE', 'CSNE', 'CY', 'DS', 'IM', 'ISE', 'IT', 'SE'];

function populateSelectors(ui, parsedInfo = null) {
    const fill = (select, items, selectedValue) => {
        if (!select) return;
        const current = selectedValue || select.value;
        select.innerHTML = '';
        items.forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label || value;
            if (value === current) opt.selected = true;
            select.appendChild(opt);
        });
    };

    const years = parsedInfo ? Array.from(parsedInfo.years).sort() : ['Y1', 'Y2', 'Y3', 'Y4'];
    const semesters = parsedInfo ? Array.from(parsedInfo.semesters).sort() : ['S1', 'S2'];
    const modes = parsedInfo ? Array.from(parsedInfo.modes).sort() : ['WD', 'WE'];
    const specs = parsedInfo ? Array.from(parsedInfo.specs).sort() : DEFAULT_SPECS;
    const groups = parsedInfo ? Array.from(parsedInfo.groups).sort() : Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, '0'));

    fill(ui.year, years.map(v => ({ value: v })));
    fill(ui.semester, semesters.map(v => ({ value: v })));
    fill(ui.mode, modes.map(v => ({ value: v, label: v === 'WD' ? 'Weekday' : v === 'WE' ? 'Weekend' : v })));
    fill(ui.spec, specs.map(v => ({ value: v })));
    fill(ui.group, groups.map(v => ({ value: v })));
}

function parseAvailableGroups(doc) {
    if (!doc) return null;
    const text = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
    const matches = text.match(/Y[1-4]\.S[1-2]\.(?:WD|WE)\.[A-Z0-9]+\.\d{2}/gi) || [];
    const groupKeys = Array.from(new Set(matches.map(m => m.toUpperCase())));

    if (groupKeys.length === 0) return null;

    const parsed = {
        years: new Set(),
        semesters: new Set(),
        modes: new Set(),
        specs: new Set(),
        groups: new Set(),
        allKeys: new Set(groupKeys)
    };

    groupKeys.forEach(key => {
        const parts = key.split('.');
        if (parts.length === 5) {
            parsed.years.add(parts[0]);
            parsed.semesters.add(parts[1]);
            parsed.modes.add(parts[2]);
            parsed.specs.add(parts[3]);
            parsed.groups.add(parts[4]);
        }
    });

    return parsed;
}

function hookFileUpload(ui) {
    if (!ui.fileInput) return;
    ui.fileInput.addEventListener('change', () => {
        const file = ui.fileInput.files?.[0];
        toggleSearchUI(Boolean(file), ui);
        if (!file) {
            state.doc = null;
            state.parsedGroups = null;
            populateSelectors(ui);
            if (ui.feedback) ui.feedback.textContent = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = evt => {
            state.doc = new DOMParser().parseFromString(evt.target.result, 'text/html');
            state.parsedGroups = parseAvailableGroups(state.doc);
            populateSelectors(ui, state.parsedGroups);

            if (ui.feedback) {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const count = state.parsedGroups ? state.parsedGroups.allKeys.size : 0;
                const countMsg = count ? `<br><span style="font-size:0.85rem; opacity:0.9;">Found ${count} student groups</span>` : '';
                ui.feedback.innerHTML = `<div class="file-success"><span class="file-success-icon">✔</span> Timetable loaded successfully${countMsg}<br><span class="file-success-name">${file.name}</span> <span class="file-success-time">${now}</span></div>`;
            }
        };
        reader.readAsText(file);
    });
}

function toggleSearchUI(show, ui) {
    if (ui.selectorsCard) ui.selectorsCard.style.display = show ? 'block' : 'none';
    if (ui.searchBtn) ui.searchBtn.style.display = show ? 'block' : 'none';
    if (ui.exportContainer && !show) ui.exportContainer.innerHTML = '';
    if (ui.timetable) {
        ui.timetable.classList.toggle('timetable-placeholder', !show);
        ui.timetable.innerHTML = show ? '' : '<div class="empty-main">Upload your timetable to get started!</div>';
    }

    if (show && ui.selectorsCard) {
        setTimeout(() => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.scrollTo({ top: ui.selectorsCard.offsetTop - 20, behavior: 'smooth' });
            }
        }, 100);
    }
}

function hookSearch(ui) {
    if (!ui.searchBtn) return;
    ui.searchBtn.addEventListener('click', () => renderTimetable(ui));
}

function renderTimetable(ui) {
    if (!state.doc || !ui.timetable) return;
    const groupKey = [ui.year.value, ui.semester.value, ui.mode.value, ui.spec.value, ui.group.value].join('.');
    const table = findTimetable(state.doc, groupKey);
    if (!table) {
        if (ui.exportContainer) ui.exportContainer.innerHTML = '';
        ui.timetable.innerHTML = `<div class="error-msg" style="padding:24px; text-align:center; color:var(--accent);">No timetable found for group <strong>${groupKey}</strong>. Please check your filter selection.</div>`;
        return;
    }

    const clone = table.cloneNode(true);
    sanitizeTimetable(clone);
    normalizeGroupHeader(clone, groupKey);
    colorizeCells(clone);
    drawTimetable(ui, clone);
}

// Look through the uploaded HTML to find the table matching selected group
function findTimetable(doc, groupKey) {
    if (!doc || !groupKey) return null;
    const target = groupKey.trim().toUpperCase();
    const tables = doc.querySelectorAll('table');

    const extractGroup = (str) => {
        if (!str) return null;
        const match = str.match(/Y[1-4]\.S[1-2]\.(?:WD|WE)\.[A-Z0-9]+\.\d{2}/i);
        return match ? match[0].toUpperCase() : null;
    };

    // 1. Check caption .name or caption text
    for (const table of tables) {
        if (table.classList.contains('detailed')) continue;

        const nameSpan = table.querySelector('caption .name');
        if (nameSpan && nameSpan.textContent.trim().toUpperCase() === target) {
            return table;
        }

        const caption = table.querySelector('caption');
        if (caption) {
            const extracted = extractGroup(caption.textContent);
            if (extracted === target) return table;
        }
    }

    // 2. Check th cells in table header (old format th[colspan="7"])
    for (const table of tables) {
        if (table.classList.contains('detailed')) continue;
        const ths = table.querySelectorAll('thead th, th[colspan]');
        for (const th of ths) {
            const text = th.textContent.trim().toUpperCase();
            if (text === target || extractGroup(text) === target) {
                return table;
            }
        }
    }

    // 3. Fallback search inside caption or whole head of table
    for (const table of tables) {
        if (table.classList.contains('detailed')) continue;
        const headText = (table.querySelector('caption')?.textContent || '') + ' ' + (table.querySelector('thead')?.textContent || '');
        if (headText.toUpperCase().includes(target)) {
            return table;
        }
    }

    return null;
}

// Create a standardized, clean group banner header for the table
function normalizeGroupHeader(table, groupKey) {
    // Remove old header title row if present in thead (old format)
    const oldTitleTh = table.querySelector('thead th[colspan]');
    if (oldTitleTh) {
        const tr = oldTitleTh.closest('tr');
        if (tr) tr.remove();
    }

    // Create or update caption
    let caption = table.querySelector('caption');
    if (!caption) {
        caption = document.createElement('caption');
        table.insertBefore(caption, table.firstChild);
    }
    caption.className = 'timetable-caption-banner';
    caption.innerHTML = `
        <div class="tt-banner-wrapper">
            <span class="tt-institution">SLIIT Timetable</span>
            <h2 class="tt-group-title">${groupKey}</h2>
        </div>
    `;
}

// Clean up the table by removing generator watermark and default HTML border attributes
function sanitizeTimetable(table) {
    table.removeAttribute('border');
    table.querySelectorAll('table').forEach(t => t.removeAttribute('border'));

    table.querySelectorAll('.foot, td, th').forEach(node => {
        if (/timetable\s+generated\s+with\s+fet/i.test(node.textContent || '')) {
            node.remove();
        }
    });
}

function isLightColor(hexOrHsl) {
    return true;
}

function isEmptySlot(text) {
    if (!text) return true;
    const clean = text.trim();
    if (!clean || clean === '---' || clean === '-x-' || clean === '-' || clean === 'x') return true;
    if (/^[\s\-\*x]+$/i.test(clean)) return true;
    return false;
}

// Apply colors to make the timetable easier to read at a glance
// Apply colors to make the timetable easier to read at a glance
function colorizeCells(table) {
    const palette = [
        '#bfd8ff', '#bff2d6', '#ffead0', '#e6d9ff',
        '#c8f4f7', '#fff1a8', '#ffd6e8', '#dfe6ff'
    ];
    const cache = new Map();
    let idx = 0;

    // Color day headers
    const headerThs = table.querySelectorAll('thead th');
    headerThs.forEach(th => {
        th.style.backgroundColor = '#ffb36b';
        th.style.color = '#fffdf5';
        th.style.fontWeight = '700';
        th.style.textAlign = 'center';
        th.style.padding = '10px 8px';
    });

    // Color time column
    table.querySelectorAll('tbody > tr > th').forEach(th => {
        th.style.backgroundColor = '#cce8ff';
        th.style.color = '#06345a';
        th.style.fontWeight = '700';
        th.style.textAlign = 'right';
        th.style.padding = '8px 10px';
    });

    // Color timetable slots
    const cells = [];
    Array.from(table.tBodies).forEach(tbody => {
        Array.from(tbody.rows).forEach(tr => {
            Array.from(tr.cells).forEach(cell => {
                if (cell.tagName.toLowerCase() === 'td') {
                    cells.push(cell);
                }
            });
        });
    });
    
    cells.forEach(td => {
        // If cell contains a detailed sub-table (subgroups)
        const subTable = td.querySelector('table.detailed');
        if (subTable) {
            td.style.backgroundColor = 'transparent';
            td.style.padding = '4px';

            const rows = Array.from(subTable.querySelectorAll('tr'));
            if (rows.length > 0) {
                const numCols = Math.max(...rows.map(r => r.cells.length));
                for (let c = 0; c < numCols; c++) {
                    let courseKey = null;
                    const colCells = [];

                    // Scan all cells in column c to find the course/module code
                    for (let r = 0; r < rows.length; r++) {
                        const cell = rows[r].cells[c];
                        if (cell) {
                            colCells.push({ cell, rowIndex: r });
                            const text = cell.textContent.trim();
                            if (!courseKey && !isEmptySlot(text)) {
                                const courseMatch = text.match(/\b[A-Z]{2,5}\d{2,4}\b/);
                                if (courseMatch) {
                                    courseKey = courseMatch[0];
                                }
                            }
                        }
                    }

                    // Determine cohesive color for this column based on the course key
                    let color = null;
                    if (courseKey) {
                        if (!cache.has(courseKey)) {
                            cache.set(courseKey, palette[idx % palette.length]);
                            idx++;
                        }
                        color = cache.get(courseKey);
                    }

                    // Apply the cohesive color to all cells in this column (subgroup)
                    colCells.forEach(({ cell, rowIndex }) => {
                        const text = cell.textContent.trim();
                        const isHeader = rowIndex === 0 || /Y[1-4]\.S[1-2]\.(?:WD|WE)\.[A-Z0-9]+/i.test(text);

                        if (isHeader) {
                            cell.style.backgroundColor = color || '#e2e8f0';
                            cell.style.color = color ? '#1c1f2a' : '#334155';
                            cell.style.fontWeight = '700';
                            cell.style.fontSize = '0.8rem';
                            cell.style.padding = '4px 6px';
                            cell.style.textAlign = 'center';
                        } else {
                            if (isEmptySlot(text)) {
                                cell.style.backgroundColor = color || '#f1f5f9';
                                cell.style.color = color ? '#1c1f2a' : '#94a3b8';
                                cell.textContent = '-';
                                cell.style.padding = '6px 8px';
                                cell.style.borderRadius = '0';
                            } else {
                                cell.style.backgroundColor = color || '#f1f5f9';
                                cell.style.color = '#1c1f2a';
                                cell.style.padding = '6px 8px';
                                cell.style.borderRadius = '0';
                            }
                        }
                    });
                }
            }
            return;
        }

        const text = td.textContent.trim();
        // Empty slots get a subtle gray/light background
        if (isEmptySlot(text)) {
            td.style.backgroundColor = '#f1f5f9';
            td.style.color = '#94a3b8';
            td.textContent = '-';
            return;
        }

        let key = text;
        const courseMatch = text.match(/\b[A-Z]{2,5}\d{2,4}\b/);
        if (courseMatch) key = courseMatch[0];

        if (!cache.has(key)) {
            cache.set(key, palette[idx % palette.length]);
            idx++;
        }
        const color = cache.get(key);
        td.style.backgroundColor = color;
        td.style.color = '#1c1f2a';
    });
}

function drawTimetable(ui, table) {
    ui.timetable.innerHTML = '';
    ui.timetable.classList.remove('timetable-placeholder');
    if (ui.exportContainer) {
        ui.exportContainer.innerHTML = '';
        ui.exportContainer.appendChild(buildExportToolbar(() => exportTimetableAsPNG(table), () => exportTimetableAsPDF(table)));
    }
    ui.timetable.appendChild(table);
}

function buildExportToolbar(onPng, onPdf) {
    const bar = document.createElement('div');
    bar.id = 'exportToolbar';
    bar.style.display = 'flex';
    bar.style.gap = '8px';
    bar.style.marginBottom = '16px';
    bar.style.marginTop = '0';

    const pngBtn = document.createElement('button');
    pngBtn.textContent = '📷 Download PNG';
    pngBtn.className = 'primary-download';
    pngBtn.style.padding = '8px 16px';
    pngBtn.style.width = 'auto';
    pngBtn.addEventListener('click', onPng);

    const pdfBtn = document.createElement('button');
    pdfBtn.textContent = '📄 Download PDF';
    pdfBtn.className = 'primary-download';
    pdfBtn.style.padding = '8px 16px';
    pdfBtn.style.width = 'auto';
    pdfBtn.addEventListener('click', onPdf);

    bar.appendChild(pngBtn);
    bar.appendChild(pdfBtn);
    return bar;
}

async function ensureLibs() {
    await Promise.all([
        loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas'),
        loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf')
    ]);
}

function loadScriptOnce(src, globalKey) {
    return new Promise((resolve, reject) => {
        if (globalKey && window[globalKey]) return resolve();
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(script);
    });
}

async function exportTimetableAsPNG(node) {
    try {
        await ensureLibs();
        const canvas = await window.html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'timetable.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        alert('Export failed: ' + err.message);
    }
}

async function exportTimetableAsPDF(node) {
    try {
        await ensureLibs();
        const canvas = await window.html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const data = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const img = new Image();
        img.src = data;
        img.onload = () => {
            const ratio = Math.min(pdfW / img.width, pdfH / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (pdfW - w) / 2;
            const y = (pdfH - h) / 2;
            pdf.addImage(data, 'PNG', x, y, w, h);
            pdf.save('timetable.pdf');
        };
    } catch (err) {
        alert('PDF export failed: ' + err.message);
    }
}


