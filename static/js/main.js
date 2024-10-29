// Add event listener when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const queryInput = document.getElementById('queryInput');
    
    // Listen for Enter key press
    queryInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission
            submitQuery();
        }
    });
});

function formatAnalysisResponse(response) {
    // First, format text between asterisks
    let formattedText = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Then, format text after ###
    formattedText = formattedText.replace(/###\s*(.*?)(?=\n|$)/g, '<strong>$1</strong>');
    
    // Split into paragraphs and maintain line breaks
    const paragraphs = formattedText.split('\n').filter(line => line.trim() !== '');
    
    // Join paragraphs with proper spacing
    return paragraphs.map(p => `<p>${p}</p>`).join('');
}

async function submitQuery() {
    const queryInput = document.getElementById('queryInput');
    const query = queryInput.value.trim();
    
    if (!query) {
        alert('Please enter a query');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';
    // Hide previous results if any
    document.getElementById('analysisTab').style.display = 'none';

    try {
        const response = await fetch('/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();

        // Hide loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';

        // Format the response
        const formattedResponse = formatAnalysisResponse(data.analysis);

        // Show and update analysis content
        document.getElementById('analysisTab').style.display = 'block';
        document.getElementById('analysisContent').innerHTML = formattedResponse;

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loadingSpinner').style.display = 'none';
        alert('An error occurred while processing your query');
    }
}
