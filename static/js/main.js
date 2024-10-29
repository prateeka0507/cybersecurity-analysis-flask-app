function submitQuery() {
    const query = document.getElementById('queryInput').value;
    if (!query) return;

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // Clear previous results
    document.getElementById('analysisContent').innerHTML = '';
    document.getElementById('rawDataContent').innerHTML = '';
    document.getElementById('queryDetailsContent').innerHTML = '';

    fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';

        if (data.error) {
            alert(data.error);
            return;
        }

        // Update content
        document.getElementById('analysisContent').innerHTML = data.analysis;
        document.getElementById('rawDataContent').innerHTML = 
            JSON.stringify(data.raw_data, null, 2);
        document.getElementById('queryDetailsContent').innerHTML = 
            JSON.stringify(data.query_details, null, 2);

        // Show analysis tab by default
        showTab('analysis');
    })
    .catch(error => {
        document.getElementById('loadingSpinner').style.display = 'none';
        alert('Error processing query: ' + error.message);
    });
}

function showTab(tabName) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Add active class to selected tab button
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`)
        .classList.add('active');
}
