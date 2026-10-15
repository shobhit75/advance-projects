import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from database.db import Database
from models.user import User
from models.plan import Plan
from models.response import Response
from models.friend import Friend, XMark, Notification

class GoTogetherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Go Together App")
        self.root.geometry("900x700")
        
        # Initialize database and models
        self.db = Database()
        self.user_model = User(self.db)
        self.plan_model = Plan(self.db)
        self.response_model = Response(self.db)
        self.friend_model = Friend(self.db)
        self.xmark_model = XMark(self.db)
        self.notification_model = Notification(self.db)
        
        # Show login screen
        self.show_login_screen()
    
    def clear_screen(self):
        """Clear all widgets from screen"""
        for widget in self.root.winfo_children():
            widget.destroy()
    
    def show_login_screen(self):
        """Display login/register screen"""
        self.clear_screen()
        
        frame = ttk.Frame(self.root, padding="20")
        frame.pack(expand=True)
        
        ttk.Label(frame, text="Go Together App", font=("Arial", 24, "bold")).grid(row=0, column=0, columnspan=2, pady=20)
        
        # Email
        ttk.Label(frame, text="Email:").grid(row=1, column=0, sticky="e", padx=5, pady=5)
        self.email_entry = ttk.Entry(frame, width=30)
        self.email_entry.grid(row=1, column=1, padx=5, pady=5)
        
        # Password
        ttk.Label(frame, text="Password:").grid(row=2, column=0, sticky="e", padx=5, pady=5)
        self.password_entry = ttk.Entry(frame, width=30, show="*")
        self.password_entry.grid(row=2, column=1, padx=5, pady=5)
        
        # Buttons
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=3, column=0, columnspan=2, pady=20)
        
        ttk.Button(btn_frame, text="Login", command=self.login).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Register", command=self.show_register_screen).pack(side="left", padx=5)
    
    def show_register_screen(self):
        """Display registration screen"""
        self.clear_screen()
        
        frame = ttk.Frame(self.root, padding="20")
        frame.pack(expand=True)
        
        ttk.Label(frame, text="Register", font=("Arial", 20, "bold")).grid(row=0, column=0, columnspan=2, pady=20)
        
        # Name
        ttk.Label(frame, text="Name:").grid(row=1, column=0, sticky="e", padx=5, pady=5)
        self.reg_name_entry = ttk.Entry(frame, width=30)
        self.reg_name_entry.grid(row=1, column=1, padx=5, pady=5)
        
        # Email
        ttk.Label(frame, text="Email:").grid(row=2, column=0, sticky="e", padx=5, pady=5)
        self.reg_email_entry = ttk.Entry(frame, width=30)
        self.reg_email_entry.grid(row=2, column=1, padx=5, pady=5)
        
        # Password
        ttk.Label(frame, text="Password:").grid(row=3, column=0, sticky="e", padx=5, pady=5)
        self.reg_password_entry = ttk.Entry(frame, width=30, show="*")
        self.reg_password_entry.grid(row=3, column=1, padx=5, pady=5)
        
        # Role
        ttk.Label(frame, text="Role:").grid(row=4, column=0, sticky="e", padx=5, pady=5)
        self.role_var = tk.StringVar(value="FRIEND")
        role_frame = ttk.Frame(frame)
        role_frame.grid(row=4, column=1, sticky="w", padx=5, pady=5)
        ttk.Radiobutton(role_frame, text="FRIEND", variable=self.role_var, value="FRIEND", command=self.toggle_host_id).pack(side="left")
        ttk.Radiobutton(role_frame, text="HOST", variable=self.role_var, value="HOST", command=self.toggle_host_id).pack(side="left")
        
        # Host ID (only for HOST)
        ttk.Label(frame, text="Host ID:").grid(row=5, column=0, sticky="e", padx=5, pady=5)
        self.reg_hostid_entry = ttk.Entry(frame, width=30, state="disabled")
        self.reg_hostid_entry.grid(row=5, column=1, padx=5, pady=5)
        
        # Buttons
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=6, column=0, columnspan=2, pady=20)
        
        ttk.Button(btn_frame, text="Register", command=self.register).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Back to Login", command=self.show_login_screen).pack(side="left", padx=5)
    
    def toggle_host_id(self):
        """Enable/disable Host ID field based on role"""
        if self.role_var.get() == "HOST":
            self.reg_hostid_entry.config(state="normal")
        else:
            self.reg_hostid_entry.config(state="disabled")
    
    def login(self):
        """Handle login"""
        email = self.email_entry.get()
        password = self.password_entry.get()
        
        if not email or not password:
            messagebox.showerror("Error", "Please fill all fields")
            return
        
        success, message = self.user_model.login(email, password)
        
        if success:
            messagebox.showinfo("Success", message)
            self.show_dashboard()
        else:
            messagebox.showerror("Error", message)
    
    def register(self):
        """Handle registration"""
        name = self.reg_name_entry.get()
        email = self.reg_email_entry.get()
        password = self.reg_password_entry.get()
        role = self.role_var.get()
        host_id = self.reg_hostid_entry.get() if role == "HOST" else None
        
        if not name or not email or not password:
            messagebox.showerror("Error", "Please fill all required fields")
            return
        
        if role == "HOST" and not host_id:
            messagebox.showerror("Error", "HOST users must provide a Host ID")
            return
        
        success, message = self.user_model.register(email, password, name, role, host_id)
        
        if success:
            messagebox.showinfo("Success", message)
            self.show_dashboard()
        else:
            messagebox.showerror("Error", message)
    
    def show_dashboard(self):
        """Display main dashboard"""
        self.clear_screen()
        
        # Top bar
        top_frame = ttk.Frame(self.root)
        top_frame.pack(fill="x", padx=10, pady=5)
        
        user = self.user_model.current_user
        ttk.Label(top_frame, text=f"Welcome, {user['name']} ({user['role']})", font=("Arial", 14)).pack(side="left")
        
        # Notification count
        unread = len(self.notification_model.get_notifications(user['id'], unread_only=True))
        if unread > 0:
            ttk.Label(top_frame, text=f"🔔 {unread} new", foreground="red", font=("Arial", 12)).pack(side="left", padx=20)
        
        ttk.Button(top_frame, text="Logout", command=self.logout).pack(side="right")
        ttk.Button(top_frame, text="Notifications", command=self.show_notifications).pack(side="right", padx=5)
        ttk.Button(top_frame, text="Friends", command=self.show_friends).pack(side="right", padx=5)
        
        # Main content
        content_frame = ttk.Frame(self.root)
        content_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Left panel - Plans list
        left_frame = ttk.Frame(content_frame)
        left_frame.pack(side="left", fill="both", expand=True, padx=(0, 5))
        
        ttk.Label(left_frame, text="Plans" if user['role'] == "HOST" else "Available Plans", 
                 font=("Arial", 16, "bold")).pack(pady=5)
        
        if user['role'] == "HOST":
            ttk.Button(left_frame, text="+ Create New Plan", command=self.show_create_plan).pack(pady=5)
        
        # Plans list with scrollbar
        plans_frame = ttk.Frame(left_frame)
        plans_frame.pack(fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(plans_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.plans_canvas = tk.Canvas(plans_frame, yscrollcommand=scrollbar.set)
        self.plans_canvas.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.plans_canvas.yview)
        
        self.plans_inner_frame = ttk.Frame(self.plans_canvas)
        self.plans_canvas.create_window((0, 0), window=self.plans_inner_frame, anchor="nw")
        
        # Load plans
        self.refresh_plans()
        
        # Configure canvas scrolling
        self.plans_inner_frame.bind("<Configure>", lambda e: self.plans_canvas.configure(scrollregion=self.plans_canvas.bbox("all")))
    
    def refresh_plans(self):
        """Refresh plans list"""
        # Clear existing plans
        for widget in self.plans_inner_frame.winfo_children():
            widget.destroy()
        
        user = self.user_model.current_user
        
        if user['role'] == "HOST":
            plans = self.plan_model.get_plans_for_host(user['id'])
        else:
            plans = self.plan_model.get_plans_for_friend(user['id'])
        
        if not plans:
            ttk.Label(self.plans_inner_frame, text="No plans yet", 
                     foreground="gray").pack(pady=20)
            return
        
        for plan in plans:
            self.create_plan_widget(plan)
    
    def create_plan_widget(self, plan):
        """Create a plan widget"""
        frame = ttk.LabelFrame(self.plans_inner_frame, text=plan['location'], padding=10)
        frame.pack(fill="x", padx=5, pady=5)
        
        # Plan details
        details = f"Duration: {plan['time_hours']} hours | Budget: ₹{plan['money_amount']}"
        ttk.Label(frame, text=details).pack(anchor="w")
        
        # Show host unique ID if viewing as FRIEND
        if self.user_model.current_user['role'] == "FRIEND" and plan.get('host_unique_id'):
            ttk.Label(frame, text=f"Host ID: {plan['host_unique_id']}", 
                     font=("Arial", 9, "italic"), foreground="blue").pack(anchor="w")
        
        # Sections
        ttk.Label(frame, text="Sections:", font=("Arial", 10, "bold")).pack(anchor="w", pady=(5, 0))
        for section in plan['sections']:
            section_frame = ttk.Frame(frame)
            section_frame.pack(fill="x", pady=2)
            
            ttk.Label(section_frame, text=f"• {section['name']}").pack(side="left")
            
            # X-mark button
            has_mark = self.xmark_model.has_xmark(section['id'], self.user_model.current_user['id'])
            btn_text = "✗ Marked" if has_mark else "Mark X"
            btn = ttk.Button(section_frame, text=btn_text, width=10,
                            command=lambda s=section: self.toggle_xmark(plan['id'], s['id']))
            btn.pack(side="right")
        
        # Response section for FRIEND
        if self.user_model.current_user['role'] == "FRIEND":
            response = plan.get('my_response')
            if response:
                resp_frame = ttk.Frame(frame)
                resp_frame.pack(fill="x", pady=5)
                status_color = "green" if response['status'] == "ACCEPTED" else "red"
                ttk.Label(resp_frame, text=f"Your Response: {response['status']}", 
                         foreground=status_color).pack(side="left")
                
                if response['host_approved']:
                    ttk.Label(resp_frame, text="✓ Approved!", foreground="green").pack(side="left", padx=10)
            else:
                ttk.Button(frame, text="Respond to Plan", 
                          command=lambda p=plan: self.show_respond_dialog(p)).pack(pady=5)
        
        # Responses for HOST - UPDATED WITH HOST_ID DISPLAY
        if self.user_model.current_user['role'] == "HOST" and plan.get('responses'):
            ttk.Label(frame, text=f"Responses ({len(plan['responses'])}):", 
                     font=("Arial", 10, "bold")).pack(anchor="w", pady=(5, 0))
            for resp in plan['responses']:
                # Create response card frame
                resp_card_frame = ttk.Frame(frame, relief="solid", borderwidth=1)
                resp_card_frame.pack(fill="x", pady=3, padx=5)
                
                # Response details with host_id
                resp_text = f"👤 {resp['friend']['name']}: {resp['status']}"
                if resp['proposed_money_amount']:
                    resp_text += f" (₹{resp['proposed_money_amount']})"
                
                ttk.Label(resp_card_frame, text=resp_text, font=("Arial", 10)).pack(anchor="w", padx=5, pady=2)
                
                # Display host unique ID on response card
                if resp.get('host_unique_id'):
                    ttk.Label(resp_card_frame, text=f"🏠 Host ID: {resp['host_unique_id']}", 
                             font=("Arial", 9, "italic"), foreground="darkblue").pack(anchor="w", padx=5)
                
                # Message if exists
                if resp.get('message'):
                    ttk.Label(resp_card_frame, text=f"💬 {resp['message']}", 
                             font=("Arial", 8), foreground="gray").pack(anchor="w", padx=5, pady=2)
    
    def toggle_xmark(self, plan_id, section_id):
        """Toggle X-mark on a section"""
        user_id = self.user_model.current_user['id']
        success, message = self.xmark_model.toggle_xmark(plan_id, section_id, user_id)
        
        if success:
            self.refresh_plans()
        else:
            messagebox.showerror("Error", message)
    
    def show_create_plan(self):
        """Show create plan dialog"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Create New Plan")
        dialog.geometry("400x400")
        
        frame = ttk.Frame(dialog, padding=20)
        frame.pack(fill="both", expand=True)
        
        ttk.Label(frame, text="Create New Plan", font=("Arial", 14, "bold")).pack(pady=10)
        
        # Location
        ttk.Label(frame, text="Location:").pack(anchor="w")
        location_entry = ttk.Entry(frame, width=40)
        location_entry.pack(fill="x", pady=5)
        
        # Time
        ttk.Label(frame, text="Duration (hours):").pack(anchor="w")
        time_entry = ttk.Entry(frame, width=40)
        time_entry.pack(fill="x", pady=5)
        
        # Money
        ttk.Label(frame, text="Budget Amount (₹):").pack(anchor="w")
        money_entry = ttk.Entry(frame, width=40)
        money_entry.pack(fill="x", pady=5)
        
        # Sections
        ttk.Label(frame, text="Sections (comma-separated):").pack(anchor="w")
        sections_text = scrolledtext.ScrolledText(frame, height=5, width=40)
        sections_text.pack(fill="x", pady=5)
        
        def create():
            location = location_entry.get()
            try:
                time_hours = int(time_entry.get())
                money_amount = float(money_entry.get())
            except ValueError:
                messagebox.showerror("Error", "Invalid time or money amount")
                return
            
            sections = [s.strip() for s in sections_text.get("1.0", "end").split(",") if s.strip()]
            
            if not location or not sections:
                messagebox.showerror("Error", "Please fill all fields")
                return
            
            success, plan_id, message = self.plan_model.create_plan(
                self.user_model.current_user['id'],
                location, time_hours, money_amount, sections
            )
            
            if success:
                messagebox.showinfo("Success", "Plan created!")
                dialog.destroy()
                self.refresh_plans()
            else:
                messagebox.showerror("Error", message)
        
        ttk.Button(frame, text="Create Plan", command=create).pack(pady=10)
    
    def show_respond_dialog(self, plan):
        """Show response dialog for FRIEND"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Respond to Plan")
        dialog.geometry("400x350")
        
        frame = ttk.Frame(dialog, padding=20)
        frame.pack(fill="both", expand=True)
        
        ttk.Label(frame, text=f"Respond to: {plan['location']}", 
                 font=("Arial", 14, "bold")).pack(pady=10)
        
        ttk.Label(frame, text=f"Host: {plan.get('host_name', 'Unknown')}").pack()
        
        # Display host unique ID
        if plan.get('host_unique_id'):
            ttk.Label(frame, text=f"Host ID: {plan['host_unique_id']}", 
                     font=("Arial", 10, "italic"), foreground="blue").pack()
        
        ttk.Label(frame, text=f"Suggested: ₹{plan['money_amount']}").pack()
        
        # Status
        ttk.Label(frame, text="Your Response:", font=("Arial", 10, "bold")).pack(anchor="w", pady=(10, 0))
        status_var = tk.StringVar(value="ACCEPTED")
        ttk.Radiobutton(frame, text="✓ Accept", variable=status_var, value="ACCEPTED").pack(anchor="w")
        ttk.Radiobutton(frame, text="✗ Reject", variable=status_var, value="REJECTED").pack(anchor="w")
        
        # Money amount
        ttk.Label(frame, text="Your Proposed Amount (₹):").pack(anchor="w", pady=(10, 0))
        money_entry = ttk.Entry(frame, width=40)
        money_entry.insert(0, str(plan['money_amount']))
        money_entry.pack(fill="x", pady=5)
        
        # Message
        ttk.Label(frame, text="Message (optional):").pack(anchor="w")
        message_text = scrolledtext.ScrolledText(frame, height=3, width=40)
        message_text.pack(fill="x", pady=5)
        
        def submit():
            status = status_var.get()
            try:
                proposed_money = float(money_entry.get()) if status == "ACCEPTED" else None
            except ValueError:
                messagebox.showerror("Error", "Invalid amount")
                return
            
            message = message_text.get("1.0", "end").strip() or None
            
            success, msg = self.response_model.respond_to_plan(
                plan['id'], self.user_model.current_user['id'],
                status, proposed_money, message
            )
            
            if success:
                messagebox.showinfo("Success", "Response submitted!")
                dialog.destroy()
                self.refresh_plans()
            else:
                messagebox.showerror("Error", msg)
        
        ttk.Button(frame, text="Submit Response", command=submit).pack(pady=10)
    
    def show_friends(self):
        """Show friends dialog"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Friends")
        dialog.geometry("500x500")
        
        frame = ttk.Frame(dialog, padding=20)
        frame.pack(fill="both", expand=True)
        
        ttk.Label(frame, text="Friends", font=("Arial", 14, "bold")).pack(pady=10)
        
        # Add friend section
        add_frame = ttk.LabelFrame(frame, text="Add Friend", padding=10)
        add_frame.pack(fill="x", pady=10)
        
        ttk.Label(add_frame, text="Friend's Email:").pack(side="left")
        email_entry = ttk.Entry(add_frame, width=25)
        email_entry.pack(side="left", padx=5)
        
        def add_friend():
            email = email_entry.get()
            if not email:
                return
            
            success, message = self.friend_model.add_friend(
                self.user_model.current_user['id'], email
            )
            
            if success:
                email_entry.delete(0, "end")
                refresh_friends()
            messagebox.showinfo("Info", message)
        
        ttk.Button(add_frame, text="Add", command=add_friend).pack(side="left")
        
        # Friends list
        list_frame = ttk.Frame(frame)
        list_frame.pack(fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        friends_listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, height=15)
        friends_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=friends_listbox.yview)
        
        def refresh_friends():
            friends_listbox.delete(0, "end")
            friends = self.friend_model.get_friends(self.user_model.current_user['id'])
            for friend in friends:
                friends_listbox.insert("end", f"{friend['name']} ({friend['email']}) - {friend['role']}")
        
        refresh_friends()
    
    def show_notifications(self):
        """Show notifications dialog"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Notifications")
        dialog.geometry("500x400")
        
        frame = ttk.Frame(dialog, padding=20)
        frame.pack(fill="both", expand=True)
        
        ttk.Label(frame, text="Notifications", font=("Arial", 14, "bold")).pack(pady=10)
        
        # Notifications list
        text = scrolledtext.ScrolledText(frame, height=15, width=60)
        text.pack(fill="both", expand=True)
        
        notifications = self.notification_model.get_notifications(self.user_model.current_user['id'])
        
        for notif in notifications:
            status = "" if notif['is_read'] else "🔔 NEW "
            text.insert("end", f"{status}{notif['message']}\n{notif['created_at']}\n\n")
        
        # Mark all as read
        def mark_read():
            self.notification_model.mark_all_as_read(self.user_model.current_user['id'])
            messagebox.showinfo("Info", "All marked as read")
            dialog.destroy()
        
        ttk.Button(frame, text="Mark All as Read", command=mark_read).pack(pady=10)
    
    def logout(self):
        """Logout user"""
        self.user_model.logout()
        self.show_login_screen()
    
    def run(self):
        """Start the application"""
        self.root.mainloop()
    
    def __del__(self):
        """Cleanup"""
        if hasattr(self, 'db'):
            self.db.close()


if __name__ == "__main__":
    root = tk.Tk()
    app = GoTogetherApp(root)
    app.run()
