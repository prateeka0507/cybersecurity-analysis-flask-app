function submitQuery(event) {
    event.preventDefault();
    const query = document.getElementById('queryInput').value;
    if (!query) return;

    // Clear input
    document.getElementById('queryInput').value = '';

    // Add question to chat
    addMessage('question', query);
    
    // Add loading message
    const loadingId = addLoadingMessage();

    fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        removeLoadingMessage(loadingId);
        
        if (data.error) {
            addMessage('answer', `Error: ${data.error}`);
            return;
        }
        
        addAnalysisReport(data);
    })
    .catch(error => {
        removeLoadingMessage(loadingId);
        addMessage('answer', `Error processing query: ${error.message}`);
    });
}

function switchView(view) {
    // Remove active class from all buttons
    document.querySelectorAll('.view-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.currentTarget.classList.add('active');
    
    // Update content based on view
    // You'll need to implement the specific content display logic
    // based on your application's needs
}

function updateContent(data) {
    const mainContent = document.getElementById('mainContent');
    // Implement your content update logic here
    // This will depend on your data structure and display requirements
}

function addMessage(type, content) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoadingMessage() {
    const chatContainer = document.getElementById('chatContainer');
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message loading';
    loadingDiv.innerHTML = `
        Processing query
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loadingId;
}

function removeLoadingMessage(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function addAnalysisReport(data) {
    const chatContainer = document.getElementById('chatContainer');
    const reportDiv = document.createElement('div');
    reportDiv.className = 'message answer';

    reportDiv.innerHTML = `
        <div class="analysis-report">
            <div class="analysis-section">
                <div class="analysis-title">Analysis</div>
                <div class="analysis-content">${formatText(data.analysis)}</div>
            </div>
            
            ${data.query_details ? `
                <div class="analysis-section">
                    <div class="analysis-title">Focus Areas</div>
                    <div class="analysis-content">
                        <strong>Query Focus:</strong> ${data.query_details.query_focus}<br>
                        <strong>Relevant Data Points:</strong> ${data.query_details.specific_data_points.join(', ')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    chatContainer.appendChild(reportDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatText(text) {
    return text.replace(/\n/g, '<br>');
}
