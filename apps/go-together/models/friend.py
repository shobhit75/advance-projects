from database.db import Database

class Friend:
    def __init__(self, db: Database):
        self.db = db
    
    def add_friend(self, user_id, friend_email):
        """Add a friend by email"""
        try:
            # Get friend by email
            self.db.cursor.execute('''
                SELECT id FROM users WHERE email = %s
            ''', (friend_email,))
            
            friend_data = self.db.cursor.fetchone()
            if not friend_data:
                return False, "User not found with that email"
            
            friend_id = friend_data['id']
            
            if friend_id == user_id:
                return False, "Cannot add yourself as friend"
            
            # Check if already friends
            self.db.cursor.execute('''
                SELECT id FROM friendships 
                WHERE (user_id = %s AND friend_id = %s) 
                   OR (user_id = %s AND friend_id = %s)
            ''', (user_id, friend_id, friend_id, user_id))
            
            if self.db.cursor.fetchone():
                return False, "Already friends"
            
            # Create friendship (mutual)
            self.db.cursor.execute('''
                INSERT INTO friendships (user_id, friend_id)
                VALUES (%s, %s)
            ''', (user_id, friend_id))
            
            self.db.connection.commit()
            return True, "Friend added successfully"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def get_friends(self, user_id):
        """Get all friends for a user"""
        self.db.cursor.execute('''
            SELECT u.id, u.email, u.name, u.role, u.host_id
            FROM users u
            JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
            WHERE (f.user_id = %s OR f.friend_id = %s) AND u.id != %s
        ''', (user_id, user_id, user_id))
        
        return [dict(row) for row in self.db.cursor.fetchall()]
    
    def remove_friend(self, user_id, friend_id):
        """Remove a friend"""
        try:
            self.db.cursor.execute('''
                DELETE FROM friendships 
                WHERE (user_id = %s AND friend_id = %s) 
                   OR (user_id = %s AND friend_id = %s)
            ''', (user_id, friend_id, friend_id, user_id))
            
            self.db.connection.commit()
            return True, "Friend removed"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)


class XMark:
    def __init__(self, db: Database):
        self.db = db
    
    def toggle_xmark(self, plan_id, section_id, marked_by_id, marked_on_id=None):
        """Toggle X-mark on a section"""
        try:
            # If friend marking themselves
            if marked_on_id is None:
                marked_on_id = marked_by_id
            
            # Check if X-mark exists
            self.db.cursor.execute('''
                SELECT id FROM xmarks 
                WHERE section_id = %s AND marked_by_id = %s AND marked_on_id = %s
            ''', (section_id, marked_by_id, marked_on_id))
            
            existing = self.db.cursor.fetchone()
            
            if existing:
                # Remove X-mark
                self.db.cursor.execute('DELETE FROM xmarks WHERE id = %s', (existing['id'],))
                self.db.connection.commit()
                return True, "X-mark removed"
            else:
                # Add X-mark
                self.db.cursor.execute('''
                    INSERT INTO xmarks (plan_id, section_id, marked_by_id, marked_on_id)
                    VALUES (%s, %s, %s, %s)
                ''', (plan_id, section_id, marked_by_id, marked_on_id))
                self.db.connection.commit()
                return True, "X-mark added"
        except Exception as e:
            self.db.connection.rollback()
            return False, str(e)
    
    def get_xmarks_for_plan(self, plan_id, user_id=None):
        """Get all X-marks for a plan"""
        if user_id:
            # Friend only sees their own X-marks and HOST's marks on them
            self.db.cursor.execute('''
                SELECT xm.section_id, u1.name as marked_by, u2.name as marked_on
                FROM xmarks xm
                JOIN users u1 ON xm.marked_by_id = u1.id
                JOIN users u2 ON xm.marked_on_id = u2.id
                WHERE xm.plan_id = %s 
                AND (xm.marked_by_id = %s OR xm.marked_on_id = %s)
            ''', (plan_id, user_id, user_id))
        else:
            # HOST sees all X-marks
            self.db.cursor.execute('''
                SELECT xm.section_id, u1.name as marked_by, u2.name as marked_on
                FROM xmarks xm
                JOIN users u1 ON xm.marked_by_id = u1.id
                JOIN users u2 ON xm.marked_on_id = u2.id
                WHERE xm.plan_id = %s
            ''', (plan_id,))
        
        xmarks = {}
        for row in self.db.cursor.fetchall():
            section_id = row['section_id']
            if section_id not in xmarks:
                xmarks[section_id] = []
            xmarks[section_id].append({
                'marked_by': row['marked_by'],
                'marked_on': row['marked_on']
            })
        
        return xmarks
    
    def has_xmark(self, section_id, user_id):
        """Check if user has X-mark on a section"""
        self.db.cursor.execute('''
            SELECT id FROM xmarks 
            WHERE section_id = %s 
            AND (marked_by_id = %s OR marked_on_id = %s)
        ''', (section_id, user_id, user_id))
        
        return self.db.cursor.fetchone() is not None


class Notification:
    def __init__(self, db: Database):
        self.db = db
    
    def get_notifications(self, user_id, unread_only=False):
        """Get notifications for a user"""
        query = 'SELECT id, message, is_read, created_at FROM notifications WHERE user_id = %s'
        params = [user_id]
        
        if unread_only:
            query += ' AND is_read = 0'
        
        query += ' ORDER BY created_at DESC'
        
        self.db.cursor.execute(query, params)
        
        return [dict(row) for row in self.db.cursor.fetchall()]
    
    def mark_as_read(self, notification_id):
        """Mark notification as read"""
        self.db.cursor.execute('''
            UPDATE notifications SET is_read = 1 WHERE id = %s
        ''', (notification_id,))
        self.db.connection.commit()
    
    def mark_all_as_read(self, user_id):
        """Mark all notifications as read"""
        self.db.cursor.execute('''
            UPDATE notifications SET is_read = 1 WHERE user_id = %s
        ''', (user_id,))
        self.db.connection.commit()
