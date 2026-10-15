import psycopg2
from psycopg2 import pool, extras
import hashlib
from datetime import datetime
import os
import sys

# Try to load .env file
try:
    from dotenv import load_dotenv
    # Load .env file from the project root
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(env_path)
except ImportError:
    # python-dotenv not installed, skip
    pass

# Try to import config
try:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from config import NEON_DATABASE_URL as CONFIG_URL
except ImportError:
    CONFIG_URL = None

class Database:
    def __init__(self, connection_string=None):
        """
        Initialize database connection to Neon PostgreSQL
        
        Priority order:
        1. connection_string parameter
        2. config.py NEON_DATABASE_URL
        3. .env file NEON_DATABASE_URL
        4. Environment variable NEON_DATABASE_URL
        """
        # Try multiple sources for connection string
        self.connection_string = (
            connection_string or 
            CONFIG_URL or 
            os.getenv('NEON_DATABASE_URL')
        )
        
        if not self.connection_string:
            raise ValueError(
                "\n" + "="*70 + "\n"
                "❌ NO DATABASE CONNECTION STRING PROVIDED\n"
                "="*70 + "\n\n"
                "Please configure your Neon database connection using ONE of:\n\n"
                "OPTION 1 (Easiest for VS Code): Edit .env file\n"
                "  1. Open .env file in this folder\n"
                "  2. Replace the example with your actual connection string\n"
                "  3. Save the file\n\n"
                "OPTION 2: Edit config.py\n"
                "  1. Open config.py in this folder\n"
                "  2. Set NEON_DATABASE_URL = \"your-connection-string\"\n\n"
                "OPTION 3: Set environment variable\n"
                "  Windows CMD:        set NEON_DATABASE_URL=postgresql://...\n"
                "  Windows PowerShell: $env:NEON_DATABASE_URL=\"postgresql://...\"\n"
                "  Mac/Linux:          export NEON_DATABASE_URL=\"postgresql://...\"\n\n"
                "Get your connection string from: https://console.neon.tech/\n"
                "Format: postgresql://user:password@host/database?sslmode=require\n"
                + "="*70
            )
        
        self.connection = None
        self.cursor = None
        self.connect()
        self.create_tables()
    
    def connect(self):
        """Connect to Neon PostgreSQL database"""
        try:
            self.connection = psycopg2.connect(
                self.connection_string,
                cursor_factory=extras.RealDictCursor,
                connect_timeout=10
            )
            self.cursor = self.connection.cursor()
            print("✓ Successfully connected to Neon PostgreSQL database")
        except psycopg2.Error as e:
            print(f"✗ Error connecting to database: {e}")
            raise
    
    def create_tables(self):
        """Create all necessary tables"""
        
        # Users table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('HOST', 'FRIEND')),
                host_id TEXT UNIQUE,
                phone_number TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Friendships table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS friendships (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, friend_id)
            )
        ''')
        
        # Plans table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                host_id INTEGER NOT NULL,
                location TEXT NOT NULL,
                time_hours INTEGER NOT NULL,
                money_amount REAL NOT NULL,
                host_accepted INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Sections table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS sections (
                id SERIAL PRIMARY KEY,
                plan_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
            )
        ''')
        
        # X-Marks table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS xmarks (
                id SERIAL PRIMARY KEY,
                plan_id INTEGER NOT NULL,
                section_id INTEGER NOT NULL,
                marked_by_id INTEGER NOT NULL,
                marked_on_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_by_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_on_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(section_id, marked_by_id, marked_on_id)
            )
        ''')
        
        # Plan Responses table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS plan_responses (
                id SERIAL PRIMARY KEY,
                plan_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
                proposed_money_amount REAL,
                message TEXT,
                host_approved INTEGER DEFAULT 0,
                phone_number_revealed INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(plan_id, friend_id)
            )
        ''')
        
        # Notifications table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                plan_id INTEGER,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
            )
        ''')
        
        self.connection.commit()
        print("✓ Database tables created/verified successfully")
    
    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            print("✓ Database connection closed")
    
    @staticmethod
    def hash_password(password):
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
