import React, { useState } from 'react';
import { Bell, User } from 'lucide-react';

interface Notification {
  id: number;
  message: string;
  time: string;
}

interface TopBarProps {
  userType: 'donor' | 'ngo';
  userName: string;
}

const TopBar: React.FC<TopBarProps> = ({ userType, userName }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock AI-based smart notifications
  const notifications: Notification[] = [
    { id: 1, message: "New bread donation 2 km away, expires in 3 hrs.", time: "2 min ago" },
    { id: 2, message: "Fruit donation available near you", time: "1 hour ago" },
    { id: 3, message: "High-demand food listing posted nearby", time: "3 hours ago" },
  ];

  return (
    <header className="bg-white border-b border-slate-100/50 px-6 py-6 lg:ml-20 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-3xl font-black text-fintech-black mb-1">
              {userType === 'donor' ? 'Donor Hub' : 'NGO Portal'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Welcome back, {userName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 text-slate-600 hover:text-fintech-black hover:bg-slate-50 rounded-2xl transition-all duration-300 relative group"
              aria-label="Notifications"
            >
              <Bell size={22} strokeWidth={1.5} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-blue-teal text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-semibold shadow-lg">
                  {notifications.length}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-blue-teal rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-teal-50">
                  <h3 className="font-black text-fintech-black text-lg">AI Notifications</h3>
                  <p className="text-sm text-slate-600 mt-1">Smart alerts for optimal food sharing</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-25 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gradient-blue-teal rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium leading-relaxed">{notif.message}</p>
                          <p className="text-xs text-slate-500 mt-2 font-medium">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-slate-50 text-center">
                  <button className="btn-fintech-outline text-sm py-2 px-4">View All Notifications</button>
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Section */}
          <div className="flex items-center space-x-4 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-fintech-black">{userName}</p>
              <div className="flex items-center justify-end space-x-2 mt-1">
                <span className={`badge-${userType === 'donor' ? 'blue' : 'green'}`}>
                  {userType.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-blue-teal rounded-2xl flex items-center justify-center shadow-lg">
              <User size={20} className="text-white" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;