from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import psycopg2
from typing import Dict, List, Tuple
from datetime import datetime
import numpy as np
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DB_CONN = os.getenv("DATABASE_URL")
TABLE_NAME = 'sitreps_2024'
EMBEDDING_MODEL = "text-embedding-ada-002"

DEFAULT_SYSTEM_INSTRUCTION = """You are an AI assistant specialized in cybersecurity incident analysis..."""  # Same as original

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

class QueryAnalyzer:
    def analyze_query(self, query: str, available_columns: List[str]) -> Dict:
        try:
            prompt = f"""
            Please analyze this query: "{query}"
            Available columns in the database: {', '.join(available_columns)}
            """
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": DEFAULT_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error in analyze_query: {str(e)}")
            return {
                "relevant_columns": [],
                "query_focus": "Error analyzing query",
                "specific_data_points": [],
                "time_frame": "",
                "filter_criteria": []
            }

def get_llm_response(query: str, analysis: Dict) -> str:
    try:
        formatted_data = f"""
        Query: {query}
        Analysis Focus: {analysis['query_focus']}
        Relevant Columns: {', '.join(analysis['relevant_columns'])}
        Time Frame: {analysis['time_frame']}
        Filter Criteria: {analysis['filter_criteria']}
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DEFAULT_SYSTEM_INSTRUCTION},
                {"role": "user", "content": formatted_data}
            ],
            temperature=0.1,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error getting AI response: {str(e)}"

def process_query(query: str, table_name: str) -> Dict:
    analyzer = QueryAnalyzer()
    
    try:
        # Get available columns (hardcode them to avoid DB connection)
        available_columns = ['timestamp', 'description', 'severity', 'source', 'category', 'status']  # Add your actual columns
        
        # Get analysis only
        analysis = analyzer.analyze_query(query, available_columns)
        return analysis
        
    except Exception as e:
        return {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/query', methods=['POST'])
def handle_query():
    try:
        query = request.json.get('query')
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        analysis = process_query(query, TABLE_NAME)
        
        if not analysis:
            return jsonify({
                'error': 'Could not analyze query',
                'analysis': 'Failed to analyze the query.',
                'query_details': {}
            }), 404

        response = get_llm_response(query, analysis)
        
        return jsonify({
            'analysis': response,
            'query_details': analysis
        })

    except Exception as e:
        return jsonify({
            'error': f'Error processing query: {str(e)}',
            'analysis': 'An error occurred while processing your query.',
            'query_details': {}
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
