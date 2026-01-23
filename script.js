
// Main JS for UniTimetable
// Handles file upload and basic parsing

document.getElementById('fileInput').addEventListener('change', handleFileUpload);

// When the user picks a file, read it and start parsing
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.html')) {
        alert('Please upload a valid .html file');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const htmlText = e.target.result;
        parseTimetableHTML(htmlText);
    };
    reader.readAsText(file);
}

// Parse the uploaded HTML and look for timetable tables
function parseTimetableHTML(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    // Grab all tables in the file
    const tables = Array.from(doc.querySelectorAll('table'));
    if (tables.length === 0) {
        alert('No timetable tables found in the uploaded file.');
        return;
    }
    
    // For now, show the dropdowns and download button
    document.getElementById('selectors').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'block';
   
}

