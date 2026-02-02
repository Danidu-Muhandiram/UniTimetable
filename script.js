const state = { doc: null };

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
        group: document.getElementById('groupSelect')
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

function populateSelectors(ui) {
    const fill = (select, items) => {
        if (!select) return;
        select.innerHTML = '';
        items.forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label || value;
            select.appendChild(opt);
        });
    };

    fill(ui.year, ['Y1','Y2','Y3','Y4'].map(v => ({ value: v })));
    fill(ui.semester, ['S1','S2'].map(v => ({ value: v })));
    fill(ui.mode, [
        { value: 'WD', label: 'Weekday' },
        { value: 'WE', label: 'Weekend' }
    ]);
    fill(ui.spec, ['DS','IM','CS','CSE','IT','CSNE','ISE','COM'].map(v => ({ value: v })));
    fill(ui.group, Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1).padStart(2, '0') })));
}

function hookFileUpload(ui) {
    if (!ui.fileInput) return;
    ui.fileInput.addEventListener('change', () => {
        const file = ui.fileInput.files?.[0];
        toggleSearchUI(Boolean(file), ui);
        if (!file) {
            state.doc = null;
            if (ui.feedback) ui.feedback.textContent = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = evt => {
            state.doc = new DOMParser().parseFromString(evt.target.result, 'text/html');
            if (ui.feedback) {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                ui.feedback.innerHTML = `<div class="file-success"><span class="file-success-icon">✔</span> Timetable loaded successfully<br><span class="file-success-name">${file.name}</span> <span class="file-success-time">${now}</span></div>`;
            }
        };
        reader.readAsText(file);
    });
}

function toggleSearchUI(show, ui) {
    if (ui.selectorsCard) ui.selectorsCard.style.display = show ? 'block' : 'none';
    if (ui.searchBtn) ui.searchBtn.style.display = show ? 'block' : 'none';
    if (ui.timetable) {
        ui.timetable.classList.toggle('timetable-placeholder', !show);
        ui.timetable.innerHTML = show ? '' : '<div class="empty-main">Upload your timetable to get started!</div>';
    }
    
    // Auto-scroll to show filters when file is uploaded
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
        ui.timetable.innerHTML = '<div class="error-msg">No timetable found for this group.</div>';
        return;
    }

    const clone = table.cloneNode(true);
    sanitizeTimetable(clone);
    colorizeCells(clone);
    drawTimetable(ui.timetable, clone);
}

// Look through the uploaded HTML to find the table matching selected group
function findTimetable(doc, groupKey) {
    const headers = doc.querySelectorAll('th[colspan="7"]');
    for (const th of headers) {
        if (th.textContent.trim() === groupKey) {
            return th.closest('table');
        }
    }
    return null;
}

// Clean up the table by removing the generator watermark at the bottom
function sanitizeTimetable(table) {
    table.querySelectorAll('caption, .foot, td, th').forEach(node => {
        if (/timetable\s+generated\s+with\s+fet/i.test(node.textContent || '')) {
            node.remove();
        }
    });
}

function isLightColor(hexOrHsl) {
    // Simple lightness check for hex colors in our palette
    // All palette colors have >75% lightness, so return true
    return true;
}

// Apply colors to make the timetable easier to read at a glance
function colorizeCells(table) {
    // Using a set of soft pastel colors that cycle through courses
    const palette = [
        '#bfd8ff', '#bff2d6', '#ffead0', '#e6d9ff',
        '#c8f4f7', '#fff1a8', '#ffd6e8', '#dfe6ff'
    ];
    const cache = new Map();
    let idx = 0;

    // Color day headers and group title
    const headerThs = table.querySelectorAll('thead th');
    headerThs.forEach(th => {
        th.style.backgroundColor = '#ffb36b';
        th.style.color = '#fffdf5';
        th.style.fontWeight = '700';
        th.style.textAlign = 'center';
    });

    // Color time column
    table.querySelectorAll('tbody > tr > th').forEach(th => {
        th.style.backgroundColor = '#cce8ff';
        th.style.color = '#06345a';
        th.style.fontWeight = '700';
        th.style.textAlign = 'right';
        th.style.padding = '8px 10px';
    });

    // Now color each actual timetable slot based on course code
    const cells = Array.from(table.querySelectorAll('tbody > tr > td')).filter(td => td.closest('table') === table);
    cells.forEach(td => {
        const text = td.textContent.trim();
        // Empty slots get a subtle gray background
        if (!text || text === '---') {
            td.style.backgroundColor = '#eef2ff';
            td.style.color = '#0f172a';
            return;
        }
        // Try to extract the course code (like IT3030) to use as the color key
        let key = text;
        const courseMatch = text.match(/\b[A-Z]{2,5}\d{2,4}\b/);
        if (courseMatch) key = courseMatch[0];

        if (!cache.has(key)) {
            cache.set(key, palette[idx % palette.length]);
            idx++;
        }
        const color = cache.get(key);
        td.style.backgroundColor = color;
        
        // Darken text for bright backgrounds
        if (isLightColor(color)) {
            td.style.color = '#1c1f2a';
        }
    });
}

function drawTimetable(container, table) {
    container.innerHTML = '';
    container.classList.remove('timetable-placeholder');
    container.appendChild(buildExportToolbar(() => exportTimetableAsPNG(table), () => exportTimetableAsPDF(table)));
    container.appendChild(table);
}

// Create the download buttons that appear above the timetable
function buildExportToolbar(onPng, onPdf) {
    const bar = document.createElement('div');
    bar.id = 'exportToolbar';
    bar.style.display = 'flex';
    bar.style.gap = '8px';
    bar.style.marginBottom = '12px';

    const pngBtn = document.createElement('button');
    pngBtn.textContent = 'Download PNG';
    pngBtn.className = 'primary-download';
    pngBtn.style.padding = '8px 12px';
    pngBtn.addEventListener('click', onPng);

    const pdfBtn = document.createElement('button');
    pdfBtn.textContent = 'Download PDF';
    pdfBtn.className = 'primary-download';
    pdfBtn.style.padding = '8px 12px';
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
        const canvas = await window.html2canvas(node, { scale: 2, useCORS: true, backgroundColor: null });
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
