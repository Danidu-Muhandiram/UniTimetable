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
            if (fileInput.files && fileInput.files.length > 0) {
                selectors.style.display = 'block';
                searchBtn.style.display = 'block';
            } else {
                selectors.style.display = 'none';
                searchBtn.style.display = 'none';
            }
        });
    }

    // Populate dropdowns with static options
    const yearSelect = document.getElementById('yearSelect');
    const semesterSelect = document.getElementById('semesterSelect');
    const specSelect = document.getElementById('specSelect');
    const modeSelect = document.getElementById('modeSelect');
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
        ['Weekday','Weekend'].forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modeSelect.appendChild(opt);
        });
    }
});
