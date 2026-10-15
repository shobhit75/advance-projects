from database.db import Database

class Plan:
    def __init__(self, db: Database):
        self.db = db
    
    def create_plan(self, host_id, location, time_hours, money_amount, sections):
        """Create a new plan with sections"""
        try:
            # Create plan and return the ID
            self.db.cursor.execute('''
                INSERT INTO plans (host_id, location, time_hours, money_amount)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (host_id, location, time_hours, money_amount))
            
            plan_id = self.db.cursor.fetchone()['id']
            
            # Create sections
            for section_name in sections:
                self.db.cursor.execute('''
                    INSERT INTO sections (plan_id, name)
                    VALUES (%s, %s)
                ''', (plan_id, section_name.strip()))
            
            self.db.connection.commit()
            return True, plan_id, "Plan created successfully"
        except Exception as e:
            self.db.connection.rollback()
            return False, None, str(e)
    
    def get_plans_for_host(self, host_id):
        """Get all plans created by a host"""
        self.db.cursor.execute('''
            SELECT id, location, time_hours, money_amount, host_accepted, created_at
            FROM plans WHERE host_id = %s
            ORDER BY created_at DESC
        ''', (host_id,))
        
        plans = []
        for row in self.db.cursor.fetchall():
            plan = dict(row)
            plan['sections'] = self.get_sections(row['id'])
            plan['responses'] = self.get_plan_responses(row['id'])
            plans.append(plan)
        
        return plans
    
    def get_plans_for_friend(self, friend_id):
        """Get all plans from friend's HOST friends"""
        # Get HOST friends
        self.db.cursor.execute('''
            SELECT u.id, u.name
            FROM users u
            JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
            WHERE (f.user_id = %s OR f.friend_id = %s) 
            AND u.role = 'HOST' AND u.id != %s
        ''', (friend_id, friend_id, friend_id))
        
        host_ids = [row['id'] for row in self.db.cursor.fetchall()]
        
        if not host_ids:
            return []
        
        # Get plans from these hosts
        placeholders = ','.join(['%s'] * len(host_ids))
        self.db.cursor.execute(f'''
            SELECT p.id, p.location, p.time_hours, p.money_amount, p.host_accepted, 
                   p.created_at, u.name as host_name, u.phone_number as host_phone,
                   u.host_id as host_unique_id
            FROM plans p
            JOIN users u ON p.host_id = u.id
            WHERE p.host_id IN ({placeholders})
            ORDER BY p.created_at DESC
        ''', host_ids)
        
        plans = []
        for row in self.db.cursor.fetchall():
            plan = dict(row)
            plan['sections'] = self.get_sections(row['id'])
            plan['my_response'] = self.get_friend_response(row['id'], friend_id)
            plans.append(plan)
        
        return plans
    
    def get_sections(self, plan_id):
        """Get all sections for a plan"""
        self.db.cursor.execute('''
            SELECT id, name FROM sections WHERE plan_id = %s
        ''', (plan_id,))
        
        return [dict(row) for row in self.db.cursor.fetchall()]
    
    def add_section(self, plan_id, name):
        """Add a section to a plan"""
        try:
            self.db.cursor.execute('''
                INSERT INTO sections (plan_id, name) VALUES (%s, %s)
            ''', (plan_id, name))
            self.db.connection.commit()
            return True, "Section added"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def delete_section(self, section_id):
        """Delete a section"""
        try:
            self.db.cursor.execute('DELETE FROM sections WHERE id = %s', (section_id,))
            self.db.connection.commit()
            return True, "Section deleted"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def update_plan(self, plan_id, **kwargs):
        """Update plan details"""
        try:
            updates = []
            values = []
            
            if 'location' in kwargs:
                updates.append('location = %s')
                values.append(kwargs['location'])
            
            if 'time_hours' in kwargs:
                updates.append('time_hours = %s')
                values.append(kwargs['time_hours'])
            
            if 'money_amount' in kwargs:
                updates.append('money_amount = %s')
                values.append(kwargs['money_amount'])
            
            if 'host_accepted' in kwargs:
                updates.append('host_accepted = %s')
                values.append(kwargs['host_accepted'])
            
            if not updates:
                return False, "No fields to update"
            
            values.append(plan_id)
            query = f"UPDATE plans SET {', '.join(updates)} WHERE id = %s"
            
            self.db.cursor.execute(query, values)
            self.db.connection.commit()
            return True, "Plan updated"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def delete_plan(self, plan_id):
        """Delete a plan"""
        try:
            self.db.cursor.execute('DELETE FROM plans WHERE id = %s', (plan_id,))
            self.db.connection.commit()
            return True, "Plan deleted"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def get_plan_responses(self, plan_id):
        """Get all responses for a plan with host information"""
        # First get the host_id for this plan
        self.db.cursor.execute('''
            SELECT u.host_id
            FROM plans p
            JOIN users u ON p.host_id = u.id
            WHERE p.id = %s
        ''', (plan_id,))
        
        host_result = self.db.cursor.fetchone()
        host_unique_id = host_result['host_id'] if host_result else None
        
        # Get responses
        self.db.cursor.execute('''
            SELECT pr.id, pr.status, pr.proposed_money_amount, pr.message,
                   pr.host_approved, pr.phone_number_revealed,
                   u.id as friend_id, u.name as friend_name, 
                   u.email as friend_email, u.phone_number as friend_phone
            FROM plan_responses pr
            JOIN users u ON pr.friend_id = u.id
            WHERE pr.plan_id = %s
        ''', (plan_id,))
        
        responses = []
        for row in self.db.cursor.fetchall():
            responses.append({
                'id': row['id'],
                'status': row['status'],
                'proposed_money_amount': row['proposed_money_amount'],
                'message': row['message'],
                'host_approved': row['host_approved'],
                'phone_number_revealed': row['phone_number_revealed'],
                'host_unique_id': host_unique_id,  # Include host's unique ID
                'friend': {
                    'id': row['friend_id'],
                    'name': row['friend_name'],
                    'email': row['friend_email'],
                    'phone_number': row['friend_phone'] if row['phone_number_revealed'] else None
                }
            })
        
        return responses
    
    def get_friend_response(self, plan_id, friend_id):
        """Get a friend's response to a plan"""
        self.db.cursor.execute('''
            SELECT id, status, proposed_money_amount, message, 
                   host_approved, phone_number_revealed
            FROM plan_responses
            WHERE plan_id = %s AND friend_id = %s
        ''', (plan_id, friend_id))
        
        row = self.db.cursor.fetchone()
        if row:
            return dict(row)
        return None
