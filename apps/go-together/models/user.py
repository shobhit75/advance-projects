from database.db import Database

class User:
    def __init__(self, db: Database):
        self.db = db
        self.current_user = None
    
    def register(self, email, password, name, role, host_id=None):
        """Register a new user"""
        try:
            # Check if HOST requires host_id
            if role == 'HOST' and not host_id:
                return False, "HOST users must provide a unique HOST ID"
            
            # Check if email already exists
            self.db.cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if self.db.cursor.fetchone():
                return False, "Email already registered"
            
            # Check if host_id already exists (for HOST users)
            if role == 'HOST':
                self.db.cursor.execute("SELECT id FROM users WHERE host_id = %s", (host_id,))
                if self.db.cursor.fetchone():
                    return False, "HOST ID already taken"
            
            # Hash password
            hashed_password = Database.hash_password(password)
            
            # Insert user and return the ID
            self.db.cursor.execute('''
                INSERT INTO users (email, password, name, role, host_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            ''', (email, hashed_password, name, role, host_id))
            
            user_id = self.db.cursor.fetchone()['id']
            self.db.connection.commit()
            
            # Get the created user
            self.db.cursor.execute('''
                SELECT id, email, name, role, host_id, phone_number 
                FROM users WHERE id = %s
            ''', (user_id,))
            
            user_data = self.db.cursor.fetchone()
            self.current_user = dict(user_data)
            
            return True, "Registration successful"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def login(self, email, password):
        """Login user"""
        try:
            hashed_password = Database.hash_password(password)
            
            self.db.cursor.execute('''
                SELECT id, email, name, role, host_id, phone_number 
                FROM users 
                WHERE email = %s AND password = %s
            ''', (email, hashed_password))
            
            user_data = self.db.cursor.fetchone()
            
            if user_data:
                self.current_user = dict(user_data)
                return True, "Login successful"
            else:
                return False, "Invalid email or password"
        except Exception as e:
            return False, str(e)
    
    def logout(self):
        """Logout current user"""
        self.current_user = None
    
    def update_phone_number(self, phone_number):
        """Update user's phone number"""
        try:
            self.db.cursor.execute('''
                UPDATE users SET phone_number = %s WHERE id = %s
            ''', (phone_number, self.current_user['id']))
            self.db.connection.commit()
            self.current_user['phone_number'] = phone_number
            return True, "Phone number updated"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def get_user_by_email(self, email):
        """Get user by email"""
        self.db.cursor.execute('''
            SELECT id, email, name, role, host_id, phone_number 
            FROM users WHERE email = %s
        ''', (email,))
        user_data = self.db.cursor.fetchone()
        
        if user_data:
            return dict(user_data)
        return None
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        self.db.cursor.execute('''
            SELECT id, email, name, role, host_id, phone_number 
            FROM users WHERE id = %s
        ''', (user_id,))
        user_data = self.db.cursor.fetchone()
        
        if user_data:
            return dict(user_data)
        return None
