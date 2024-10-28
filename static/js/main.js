async function submitQuery(event) {
    event.preventDefault();
    const query = document.getElementById('queryInput').value;
    if (!query) return;

    // Clear input and add question
    document.getElementById('queryInput').value = '';
    addMessage('question', query);
    
    // Add loading message
    const loadingId = addLoadingMessage();

    try {
        const response = await fetch('/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query: query }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error('Invalid response from server. Please try again later.');
        }

        if (!response.ok) {
            throw new Error(data.analysis || data.error || 'Server error occurred');
        }

        addAnalysisReport(data);
    } catch (error) {
        let errorMessage;
        if (error.name === 'TimeoutError') {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.name === 'AbortError') {
            errorMessage = 'Request was aborted. Please try again.';
        } else {
            errorMessage = error.message || 'An unexpected error occurred';
        }

        addAnalysisReport({
            analysis: `Error: ${errorMessage}`,
            query_details: {
                query_focus: 'Error occurred',
                specific_data_points: ['Request failed']
            }
        });
    } finally {
        removeLoadingMessage(loadingId);
    }
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

    let content;
    if (data.analysis.includes('Error:')) {
        content = `
            <div class="analysis-report error">
                <div class="analysis-section">
                    <div class="analysis-content">${formatText(data.analysis)}</div>
                </div>
            </div>
        `;
    } else {
        content = `
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
                
                ${data.raw_data ? `
                    <div class="analysis-section">
                        <div class="analysis-title">Raw Data</div>
                        <pre class="code-block">${JSON.stringify(data.raw_data, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    reportDiv.innerHTML = content;
    chatContainer.appendChild(reportDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatText(text) {
    return text.replace(/\n/g, '<br>');
}
