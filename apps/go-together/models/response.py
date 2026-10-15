from database.db import Database

class Response:
    def __init__(self, db: Database):
        self.db = db
    
    def respond_to_plan(self, plan_id, friend_id, status, proposed_money_amount=None, message=None):
        """Friend responds to a plan"""
        try:
            # Check if response already exists
            self.db.cursor.execute('''
                SELECT id FROM plan_responses 
                WHERE plan_id = %s AND friend_id = %s
            ''', (plan_id, friend_id))
            
            existing = self.db.cursor.fetchone()
            
            if existing:
                # Update existing response
                self.db.cursor.execute('''
                    UPDATE plan_responses 
                    SET status = %s, proposed_money_amount = %s, message = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                ''', (status, proposed_money_amount, message, existing['id']))
            else:
                # Create new response
                self.db.cursor.execute('''
                    INSERT INTO plan_responses 
                    (plan_id, friend_id, status, proposed_money_amount, message)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (plan_id, friend_id, status, proposed_money_amount, message))
            
            self.db.connection.commit()
            
            # Create notification for host
            self.db.cursor.execute('''
                SELECT host_id, location FROM plans WHERE id = %s
            ''', (plan_id,))
            plan_data = self.db.cursor.fetchone()
            
            if plan_data:
                host_id, location = plan_data['host_id'], plan_data['location']
                self.db.cursor.execute('SELECT name FROM users WHERE id = %s', (friend_id,))
                friend_name = self.db.cursor.fetchone()['name']
                
                money_text = f" with ₹{proposed_money_amount}" if proposed_money_amount else ""
                msg = f"{friend_name} {status.lower()} your plan for {location}{money_text}"
                
                self.db.cursor.execute('''
                    INSERT INTO notifications (user_id, plan_id, message)
                    VALUES (%s, %s, %s)
                ''', (host_id, plan_id, msg))
                self.db.connection.commit()
            
            return True, "Response submitted successfully"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def approve_response(self, response_id, host_id, host_phone):
        """HOST approves a friend's response"""
        try:
            # Get response details
            self.db.cursor.execute('''
                SELECT pr.plan_id, pr.friend_id, u.name
                FROM plan_responses pr
                JOIN users u ON pr.friend_id = u.id
                WHERE pr.id = %s
            ''', (response_id,))
            
            response_data = self.db.cursor.fetchone()
            if not response_data:
                return False, "Response not found"
            
            plan_id = response_data['plan_id']
            friend_id = response_data['friend_id']
            friend_name = response_data['name']
            
            # Update host's phone number
            self.db.cursor.execute('''
                UPDATE users SET phone_number = %s WHERE id = %s
            ''', (host_phone, host_id))
            
            # Mark response as approved
            self.db.cursor.execute('''
                UPDATE plan_responses 
                SET host_approved = 1, phone_number_revealed = 1
                WHERE id = %s
            ''', (response_id,))
            
            # Mark plan as accepted by host
            self.db.cursor.execute('''
                UPDATE plans SET host_accepted = 1 WHERE id = %s
            ''', (plan_id,))
            
            self.db.connection.commit()
            
            # Create notification for friend
            self.db.cursor.execute('''
                INSERT INTO notifications (user_id, plan_id, message)
                VALUES (%s, %s, %s)
            ''', (friend_id, plan_id, 
                 f"Your response was approved! Host phone: {host_phone}"))
            
            self.db.connection.commit()
            
            # Get friend's phone number
            self.db.cursor.execute('''
                SELECT phone_number FROM users WHERE id = %s
            ''', (friend_id,))
            
            friend_phone = self.db.cursor.fetchone()['phone_number']
            
            return True, {
                'friend_name': friend_name,
                'friend_phone': friend_phone
            }
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def add_friend_phone(self, response_id, friend_id, friend_phone):
        """Friend adds phone number after host approval"""
        try:
            # Check if response is approved
            self.db.cursor.execute('''
                SELECT host_approved, plan_id FROM plan_responses 
                WHERE id = %s AND friend_id = %s
            ''', (response_id, friend_id))
            
            response_data = self.db.cursor.fetchone()
            if not response_data:
                return False, "Response not found"
            
            if not response_data['host_approved']:
                return False, "Wait for host approval first"
            
            # Update friend's phone number
            self.db.cursor.execute('''
                UPDATE users SET phone_number = %s WHERE id = %s
            ''', (friend_phone, friend_id))
            
            self.db.connection.commit()
            
            # Get host phone number
            self.db.cursor.execute('''
                SELECT u.phone_number, u.name
                FROM users u
                JOIN plans p ON p.host_id = u.id
                WHERE p.id = %s
            ''', (response_data['plan_id'],))
            
            host_data = self.db.cursor.fetchone()
            
            return True, {
                'host_phone': host_data['phone_number'],
                'host_name': host_data['name']
            }
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
