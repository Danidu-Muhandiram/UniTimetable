// Dark mode toggle logic
window.addEventListener('DOMContentLoaded', function() {
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        // Set initial state from localStorage
        if (localStorage.getItem('unitt-dark') === '1') {
            document.body.classList.add('dark');
            darkToggle.checked = true;
        } else {
            document.body.classList.remove('dark');
            darkToggle.checked = false;
        }
        // Listen for toggle changes
        darkToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark');
                localStorage.setItem('unitt-dark', '1');
            } else {
                document.body.classList.remove('dark');
                localStorage.setItem('unitt-dark', '0');
            }
        });
    }

    // Show filters and search button after file selection
    const fileInput = document.getElementById('fileInput');
    const selectors = document.getElementById('selectors');
    const searchBtn = document.getElementById('downloadBtn');
    if (fileInput && selectors && searchBtn) {
        fileInput.addEventListener('change', function() {
            const timetableDiv = document.getElementById('timetable');
            if (fileInput.files && fileInput.files.length > 0) {
                selectors.style.display = 'block';
                searchBtn.style.display = 'block';
                if (timetableDiv) timetableDiv.classList.remove('timetable-placeholder');
                if (timetableDiv) timetableDiv.innerHTML = '';
            } else {
                selectors.style.display = 'none';
                searchBtn.style.display = 'none';
                if (timetableDiv) timetableDiv.classList.add('timetable-placeholder');
                if (timetableDiv) timetableDiv.innerHTML = 'Add your timetable HTML first';
            }
        });
    }

    // Populate dropdowns with static options
    const yearSelect = document.getElementById('yearSelect');
    const semesterSelect = document.getElementById('semesterSelect');
    const specSelect = document.getElementById('specSelect');
    const modeSelect = document.getElementById('modeSelect');
    const groupSelect = document.getElementById('groupSelect');
    const subgroupSelect = document.getElementById('subgroupSelect');

    if (yearSelect) {
        yearSelect.innerHTML = '';
        ['Y1','Y2','Y3','Y4'].forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });
    }
    if (semesterSelect) {
        semesterSelect.innerHTML = '';
        ['S1','S2'].forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            semesterSelect.appendChild(opt);
        });
    }
    if (specSelect) {
        specSelect.innerHTML = '';
        ['DS','IM','CS','CSE','IT','CSNE','ISE','COM'].forEach(sp => {
            const opt = document.createElement('option');
            opt.value = sp;
            opt.textContent = sp;
            specSelect.appendChild(opt);
        });
    }
    if (modeSelect) {
        modeSelect.innerHTML = '';
        [
            { label: 'Weekday', value: 'WD' },
            { label: 'Weekend', value: 'WE' }
        ].forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.value;
            opt.textContent = m.label;
            modeSelect.appendChild(opt);
        });
    }
    if (groupSelect) {
        groupSelect.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const val = i.toString().padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            groupSelect.appendChild(opt);
        }
    }
    if (subgroupSelect) {
        subgroupSelect.innerHTML = '';
        ['01','02'].forEach(sg => {
            const opt = document.createElement('option');
            opt.value = sg;
            opt.textContent = sg;
            subgroupSelect.appendChild(opt);
        });
    }

    // Main timetable search and filter logic
    let timetableHTML = '';
    let timetableDoc = null;
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = fileInput.files[0];
            const feedback = document.getElementById('fileFeedback');
            if (!file) {
                if (feedback) feedback.innerHTML = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                timetableHTML = e.target.result;
                timetableDoc = new DOMParser().parseFromString(timetableHTML, 'text/html');
                if (feedback) {
                    const now = new Date();
                    feedback.innerHTML = `<div class="file-success"><span class="file-success-icon">✔</span> Timetable loaded successfully<br><span class="file-success-name">${file.name}</span> <span class="file-success-time">${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>`;
                }
            };
            reader.readAsText(file);
        });
    }

    function buildGroupKey() {
        return [
            yearSelect.value,
            semesterSelect.value,
            modeSelect.value,
            specSelect.value,
            groupSelect.value
        ].join('.');
    }

    function buildSubgroupKey() {
        return buildGroupKey() + subgroupSelect.value;
    }

    function cleanText(txt) {
        // Remove group keys, extra commas, duplicate spaces
        return txt.replace(/Y\d\.S\d\.[A-Z]{2}\.[A-Z]+\.\d{2}\d{2}/g, '')
                  .replace(/Y\d\.S\d\.[A-Z]{2}\.[A-Z]+\.\d{2}/g, '')
                  .replace(/\s+/g, ' ')
                  .replace(/,+/g, ',')
                  .replace(/^,|,$/g, '')
                  .trim();
    }

    // Search button click handler
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            if (!timetableDoc) return;
            const groupKey = buildGroupKey();
            const subgroup = subgroupSelect.value;
            // Find the correct table by group key (manual search, :contains not supported)
            let table = null;
            const ths = timetableDoc.querySelectorAll('th[colspan="7"]');
            for (let t of ths) {
                if (t.textContent.trim() === groupKey) {
                    table = t.closest('table');
                    break;
                }
            }
            if (!table) {
                const timetableDiv = document.getElementById('timetable');
                if (timetableDiv) timetableDiv.classList.remove('timetable-placeholder');
                timetableDiv.innerHTML = '<div class="error-msg">No timetable found for this group.</div>';
                return;
            }
            // Clone table
            const clone = table.cloneNode(true);
            
            (function preCleanTable() {
                const subgroupKeyFull = buildSubgroupKey(); // e.g. Y3.S1.WE.DS.0102
                const groupKeyFull = buildGroupKey(); // e.g. Y3.S1.WE.DS.01 (applies to all subgroups)
                const tds = clone.querySelectorAll('td');
                tds.forEach(td => {
                    
                    if (td.closest('table') !== clone) return;
                    // skip obvious structural/header cells
                    if (td.closest('thead') || td.getAttribute('colspan') === '7' || td.classList.contains('meta')) return;
                    const raw = (td.innerText || '');
                    const rawCompact = raw.replace(/\s+/g, '');
                    const esc = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const subRe = new RegExp(esc(subgroupKeyFull) + '(?!\\d)');
                    const groupRe = new RegExp(esc(groupKeyFull) + '(?!\\d)');
                    
                    
                    const hasAnyGroupToken = /Y\d\.S\d\.[A-Z0-9\.]+/i.test(rawCompact);
                    if (hasAnyGroupToken && !(subRe.test(rawCompact) || groupRe.test(rawCompact))) {
                        td.innerHTML = '';
                    }
                });
            })();
            // Process detailed subgroup tables
            const detailedTables = clone.querySelectorAll('table.detailed');
            detailedTables.forEach(dt => {
                // Find subgroup header row
                const headerRow = dt.querySelector('tr');
                if (!headerRow) return;
                const headers = Array.from(headerRow.querySelectorAll('td')).map(td => td.textContent.trim());
                const idx = headers.findIndex(h => h.endsWith(subgroup));
                if (idx === -1) return;
                // Get the content row (assume next row)
                const contentRow = headerRow.nextElementSibling;
                if (!contentRow) return;
                // Collect all subsequent rows for this column (course, teacher, room, room)
                const rows = Array.from(dt.querySelectorAll('tr'));
                const parts = [];
                for (let r = 1; r < rows.length; r++) {
                    const tds = rows[r].querySelectorAll('td');
                    const cell = tds[idx];
                    if (cell) parts.push(cell.innerHTML.trim());
                }
                if (parts.length === 0) return;
                // Replace parent <td> content with combined parts
                const parentTd = dt.parentElement;
                const temp = document.createElement('div');
                temp.innerHTML = parts.join('<br>');
                // Remove group-key tokens from text nodes while preserving HTML structure
                const groupKeyPattern = /Y\d\.S\d\.[A-Z0-9\.]+/gi;
                function stripGroupKeys(node) {
                    if (!node) return;
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.textContent = node.textContent.replace(groupKeyPattern, '');
                        node.textContent = node.textContent.replace(/,+/g, ',').replace(/(^,|,$)/g, '');
                        if (node.textContent.trim() === '') node.remove();
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName.toLowerCase() === 'table') return;
                        const children = Array.from(node.childNodes);
                        children.forEach(child => stripGroupKeys(child));
                    }
                }
                stripGroupKeys(temp);
                let cleanedHTML = temp.innerHTML
                    .replace(/>\s+</g, '><')
                    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
                    .trim();
                parentTd.innerHTML = cleanedHTML || temp.textContent.trim();
            });

            
            // Show the filtered timetable
            const timetableDiv = document.getElementById('timetable');
            if (timetableDiv) timetableDiv.classList.remove('timetable-placeholder');
            // Minimal coloring: assign a consistent color per unique cell text
            (function colorizeSlots(rootTable) {
                const palette = [
                    '#bfd8ff', // slightly richer soft blue
                    '#bff2d6', // slightly richer soft green
                    '#ffead0', // slightly richer soft orange
                    '#e6d9ff', // slightly richer soft purple
                    '#c8f4f7', // slightly richer soft cyan
                    '#fff1a8', // slightly richer soft yellow
                    '#ffd6e8', // slightly richer soft pink
                    '#dfe6ff'  // slightly richer soft indigo
                ];
                const map = new Map();
                let idx = 0;

                function getKey(txt) {
                    return txt.replace(/\s+/g, ' ').trim();
                }

                function contrastColor(hex) {
                    const c = hex.replace('#','');
                    const r = parseInt(c.substring(0,2),16);
                    const g = parseInt(c.substring(2,4),16);
                    const b = parseInt(c.substring(4,6),16);
                    const yiq = (r*299 + g*587 + b*114) / 1000;
                    return yiq >= 150 ? '#000000' : '#ffffff';
                }

                // Only color TDs that belong directly to this table (skip nested table cells)
                const tds = rootTable.querySelectorAll('td');
                tds.forEach(td => {
                    // ensure this td is part of the outer table, not a nested inner table
                    if (td.closest('table') !== rootTable) return;
                    const text = getKey(td.textContent || '');
                    if (!text) return;
                    // Avoid coloring obvious structural/header cells
                    if (td.closest('thead') || td.getAttribute('colspan') === '7' || td.classList.contains('meta')) return;

                    // Prefer using a course code (e.g. IT3031) as the color key so room/teacher lines don't split color
                    const courseMatch = text.match(/\b([A-Z]{1,5}\d{2,4})\b/i);
                    const key = courseMatch ? courseMatch[1].toUpperCase() : text.split('\n')[0].slice(0,80).trim();

                    // Special-case empty/placeholder slots like '---' — use a light faded gray
                    if (/^[-\s]{1,}$/.test(key) || key === '---') {
                        // soft low-intensity color for empty slots
                        const emptyColor = '#eef2ff';
                        const textColor = '#0f172a';
                        td.style.backgroundColor = emptyColor;
                        td.style.color = textColor;
                        td.style.borderColor = td.style.borderColor || 'transparent';
                        const descendants = td.querySelectorAll('*');
                        descendants.forEach(d => {
                            try {
                                d.style.background = 'transparent';
                                d.style.backgroundColor = 'transparent';
                                d.style.backgroundImage = 'none';
                                d.style.color = textColor;
                            } catch (e) {}
                        });
                        return; // skip regular coloring for placeholders
                    }

                    if (!map.has(key)) {
                        map.set(key, palette[idx % palette.length]);
                        idx++;
                    }
                    const color = map.get(key);
                    // Only set inline background and text color
                    td.style.backgroundColor = color;
                    td.style.color = contrastColor(color);
                    // Clear backgrounds on child elements so the entire visible slot shows one color
                    const descendants = td.querySelectorAll('*');
                    descendants.forEach(d => {
                        try {
                            d.style.background = 'transparent';
                            d.style.backgroundColor = 'transparent';
                            d.style.backgroundImage = 'none';
                            d.style.color = contrastColor(color);
                        } catch (e) {
                            
                        }
                    });
                });
            })(clone);

            timetableDiv.innerHTML = '';
            // Add export toolbar (PNG / PDF) at the top of the timetable
            (function addExportToolbar() {
                // remove existing toolbar if any
                const prev = document.getElementById('exportToolbar');
                if (prev) prev.remove();
                const toolbar = document.createElement('div');
                toolbar.id = 'exportToolbar';
                toolbar.style.display = 'flex';
                toolbar.style.gap = '8px';
                toolbar.style.marginBottom = '12px';

                const btnPng = document.createElement('button');
                btnPng.textContent = 'Download PNG';
                btnPng.className = 'primary-download';
                btnPng.style.padding = '8px 12px';
                btnPng.addEventListener('click', function() { exportTimetableAsPNG(clone); });

                const btnPdf = document.createElement('button');
                btnPdf.textContent = 'Download PDF';
                btnPdf.className = 'primary-download';
                btnPdf.style.padding = '8px 12px';
                btnPdf.addEventListener('click', function() { exportTimetableAsPDF(clone); });

                toolbar.appendChild(btnPng);
                toolbar.appendChild(btnPdf);
                timetableDiv.appendChild(toolbar);
            })();
            timetableDiv.appendChild(clone);

            function loadScript(src) {
                return new Promise((resolve, reject) => {
                    if (document.querySelector('script[src="' + src + '"]')) return resolve();
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error('Failed to load ' + src));
                    document.head.appendChild(s);
                });
            }

            async function ensureLibs() {
                if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
                if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }

            async function exportTimetableAsPNG(node) {
                try {
                    await ensureLibs();
                    const opt = { scale: 2, useCORS: true, backgroundColor: null };
                    const canvas = await window.html2canvas(node, opt);
                    const dataUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = 'timetable.png';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } catch (e) {
                    alert('Export failed: ' + e.message);
                }
            }

            async function exportTimetableAsPDF(node) {
                try {
                    await ensureLibs();
                    const opt = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };
                    const canvas = await window.html2canvas(node, opt);
                    const imgData = canvas.toDataURL('image/png');
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    // fit image to page while preserving aspect
                    const img = new Image();
                    img.src = imgData;
                    img.onload = function() {
                        const imgW = img.width;
                        const imgH = img.height;
                        const ratio = Math.min(pdfWidth / imgW, pdfHeight / imgH);
                        const w = imgW * ratio;
                        const h = imgH * ratio;
                        const x = (pdfWidth - w) / 2;
                        const y = (pdfHeight - h) / 2;
                        pdf.addImage(imgData, 'PNG', x, y, w, h);
                        pdf.save('timetable.pdf');
                    };
                } catch (e) {
                    alert('PDF export failed: ' + e.message);
                }
            }
        });
    }
});
