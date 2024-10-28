from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import psycopg2
from typing import Dict, List, Tuple
from datetime import datetime
import numpy as np
import os
from dotenv import load_dotenv

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
            
            return eval(response.choices[0].message.content)
        except Exception as e:
            return {
                "relevant_columns": [],
                "query_focus": "",
                "specific_data_points": [],
                "time_frame": "",
                "filter_criteria": []
            }

class DatabaseQuerier:
    def __init__(self):
        self.conn = None
        self.available_columns = []

    def connect_to_database(self):
        try:
            if not DB_CONN:
                raise ValueError("Database connection string not found")
            self.conn = psycopg2.connect(DB_CONN)
            return True
        except Exception as e:
            return False

    def close_connection(self):
        if self.conn:
            self.conn.close()

    def get_available_columns(self, table_name: str) -> List[str]:
        if not self.conn:
            return []
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                self.conn.commit()
                
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = %s
                """, (table_name,))
                self.available_columns = [row[0] for row in cur.fetchall()]
                return self.available_columns
        except Exception as e:
            return []

    def search_similar_records(self, query_embedding: List[float], relevant_columns: List[str], 
                             table_name: str, limit: int = 5) -> List[Dict]:
        if not self.conn:
            return []
        
        try:
            with self.conn.cursor() as cur:
                columns_str = ", ".join(relevant_columns) if relevant_columns else "*"
                
                cur.execute(f"""
                    SELECT {columns_str}
                    FROM {table_name}
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (query_embedding, limit))
                
                columns = [desc[0] for desc in cur.description]
                results = cur.fetchall()
                
                return [dict(zip(columns, row)) for row in results]
        except Exception as e:
            return []

def get_embedding(text: str) -> List[float]:
    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        return []

def get_llm_response(query: str, formatted_data: str) -> str:
    try:
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

def process_query(query: str, table_name: str) -> Tuple[List[Dict], Dict]:
    analyzer = QueryAnalyzer()
    querier = DatabaseQuerier()
    
    if not querier.connect_to_database():
        return [], {}
    
    try:
        available_columns = querier.get_available_columns(table_name)
        analysis = analyzer.analyze_query(query, available_columns)
        
        query_with_context = f"""
        Context: {DEFAULT_SYSTEM_INSTRUCTION}
        Query: {query}
        Analysis Focus: {analysis['query_focus']}
        """
        query_embedding = get_embedding(query_with_context)
        
        results = querier.search_similar_records(
            query_embedding,
            analysis['relevant_columns'],
            table_name
        )
        
        return results, analysis
        
    finally:
        querier.close_connection()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/query', methods=['POST'])
def handle_query():
    query = request.json.get('query')
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    results, analysis = process_query(query, TABLE_NAME)
    
    if results:
        formatted_data = f"""
        Query: {query}
        Analysis Focus: {analysis['query_focus']}
        Retrieved Data: {results}
        """
        response = get_llm_response(query, formatted_data)
        
        return jsonify({
            'analysis': response,
            'raw_data': results,
            'query_details': analysis
        })
    else:
        return jsonify({
            'error': 'No results found'
        }), 404

if __name__ == '__main__':
    app.run(debug=True)