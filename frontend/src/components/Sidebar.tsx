import React from 'react';
import { Home, Package, History, User, BarChart, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { logout } = useAuth();
  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'food', icon: Package, label: 'Food' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'analytics', icon: BarChart, label: 'Analytics' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = async () => {
    try {
      if (!window.confirm('Are you sure you want to logout?')) return;
      await logout();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[auth] logout failed', e);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-20 bg-sidebar-dark h-screen fixed left-0 top-0 z-40">
        <div className="flex flex-col items-center py-8 space-y-8">
          {/* Logo */}
          <motion.div 
            className="w-12 h-12 bg-gradient-blue-teal rounded-2xl flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-white font-black text-xl">Z</span>
          </motion.div>
          
          {/* Navigation Items */}
          <nav className="flex flex-col space-y-6">
            {menuItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`p-4 rounded-2xl transition-all duration-300 relative ${
                  activeSection === item.id
                    ? 'bg-gradient-blue-teal text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={item.label}
              >
                <item.icon size={22} strokeWidth={activeSection === item.id ? 2.5 : 2} />
                
                {/* Active indicator dot */}
                {activeSection === item.id && (
                  <motion.div
                    className="absolute -right-1 top-1/2 w-2 h-2 bg-white rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    layoutId="activeIndicator"
                  />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Logout (desktop) */}
          <motion.button
            onClick={handleLogout}
            className="mt-4 p-4 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={22} />
          </motion.button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-sidebar-dark border-t border-slate-700/50 z-50 safe-area-pb">
        <div className="flex justify-around py-3">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-all duration-300 ${
                activeSection === item.id
                  ? 'text-white bg-gradient-blue-teal'
                  : 'text-slate-400 hover:text-white'
              }`}
              whileTap={{ scale: 0.95 }}
              aria-label={item.label}
            >
              <item.icon size={20} strokeWidth={activeSection === item.id ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </motion.button>
          ))}
          {/* Logout (mobile) */}
          <motion.button
            onClick={handleLogout}
            className="flex flex-col items-center py-2 px-3 rounded-2xl text-slate-400 hover:text-white transition-all duration-300"
            whileTap={{ scale: 0.95 }}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={20} />
            <span className="text-xs mt-1 font-medium">Logout</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;