import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, FilmIcon, GiftIcon, CogIcon, DumbbellIcon, ClipboardListIcon, DotsHorizontalIcon } from './common/Icons'; // Added DotsHorizontalIcon
import { useAppData } from '../contexts/AppDataContext';
import { UtilityId } from '../types';

interface NavItemDef {
  to: string;
  utilityId?: UtilityId; // Optional, for utilities
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; // Changed from React.ReactNode
  label: string;
  alwaysShow?: boolean; // For items like Settings
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive, onClick }) => {
  const activeClasses = 'text-primary dark:text-primary';
  const inactiveClasses = 'text-textSecondary hover:text-textPrimary dark:text-textSecondary dark:hover:text-textPrimary';

  if (onClick) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 ${isActive ? activeClasses : inactiveClasses}`}>
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </button>
    );
  }

  return (
    <Link to={to} className={`flex flex-col items-center justify-center p-2 ${isActive ? activeClasses : inactiveClasses}`}>
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
};

const MoreMenuPopover: React.FC<{
  items: NavItemDef[];
  onClose: () => void;
  parentRef: React.RefObject<HTMLButtonElement>;
}> = ({ items, onClose, parentRef }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          parentRef.current && !parentRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, parentRef]);

  if (items.length === 0) return null;

  return (
    <div 
        ref={popoverRef} 
        className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-0 bg-card border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-20 p-2 min-w-[150px]"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="more-menu-button"
    >
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item.label}>
            <Link
              to={item.to}
              onClick={onClose} // Close popover on navigation
              className={`flex items-center space-x-2 p-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-600
                ${location.pathname.startsWith(item.to) ? 'text-primary dark:text-primary font-semibold' : 'text-textPrimary'}`}
              role="menuitem"
            >
              {React.cloneElement(item.icon, { className: "w-5 h-5" })}
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};


const BottomNav: React.FC = () => {
  const location = useLocation();
  const { utilitySettings } = useAppData();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null);

  const allNavItems: NavItemDef[] = [
    { to: '/weight', utilityId: 'weight', icon: <HomeIcon className="w-6 h-6" />, label: 'Weight' },
    { to: '/disney', utilityId: 'disney', icon: <FilmIcon className="w-6 h-6" />, label: 'Disney' },
    { to: '/gifts', utilityId: 'gifts', icon: <GiftIcon className="w-6 h-6" />, label: 'Gifts' },
    { to: '/train', utilityId: 'train', icon: <DumbbellIcon className="w-6 h-6" />, label: 'Train' },
    { to: '/workouts', utilityId: 'train', icon: <ClipboardListIcon className="w-6 h-6" />, label: 'Workouts' }, // Linked to 'train' utility
    { to: '/settings', icon: <CogIcon className="w-6 h-6" />, label: 'Settings', alwaysShow: true },
  ];
  
  const getUtility = (id?: UtilityId) => id ? utilitySettings.find(u => u.id === id) : undefined;

  const mainBarItems = allNavItems.filter(item => {
    if (item.alwaysShow) return true;
    const utility = getUtility(item.utilityId);
    return utility?.enabled && !utility.showInMoreMenu;
  });

  const moreMenuItems = allNavItems.filter(item => {
    if (item.alwaysShow) return false; // Settings shouldn't be in "More"
    const utility = getUtility(item.utilityId);
    // Special handling for "Workouts": only show if "Train" is in "More"
    if (item.to === '/workouts') {
        const trainUtility = getUtility('train');
        return trainUtility?.enabled && trainUtility.showInMoreMenu;
    }
    return utility?.enabled && utility.showInMoreMenu;
  });
  
  // Consolidate 'Train' and 'Workouts' if 'Train' is in 'More'
  const uniqueMoreMenuItems = moreMenuItems.reduce((acc, current) => {
    if (current.utilityId === 'train') {
        // Find the original "Train" and "Workouts" items from allNavItems to ensure correct icon and other properties
        const trainNavItem = allNavItems.find(i => i.label === 'Train' && i.utilityId === 'train');
        const workoutsNavItem = allNavItems.find(i => i.label === 'Workouts' && i.utilityId === 'train');

        if (trainNavItem && !acc.find(item => item.label === 'Train')) { 
             acc.push(trainNavItem);
        }
        if (workoutsNavItem && !acc.find(item => item.label === 'Workouts')) { 
            acc.push(workoutsNavItem);
        }
    } else if (!acc.find(item => item.label === current.label)) {
        acc.push(current);
    }
    return acc;
  }, [] as NavItemDef[]);


  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-gray-200 dark:border-gray-700 shadow-top p-1 sm:relative sm:border-none sm:shadow-none sm:bg-transparent dark:sm:bg-transparent">
      <div className="max-w-md mx-auto flex justify-around relative"> {/* Added relative for popover positioning */}
        {mainBarItems.map(item => (
          <NavItem
            key={item.label}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname.startsWith(item.to)}
          />
        ))}
        {uniqueMoreMenuItems.length > 0 && (
          <div className="relative">
            <NavItem
              to="#" // Placeholder, action handled by onClick
              icon={<DotsHorizontalIcon className="w-6 h-6" />}
              label="More"
              isActive={isMoreMenuOpen}
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
            />
             <button ref={moreMenuButtonRef} onClick={() => setIsMoreMenuOpen(prev => !prev)} className="hidden" aria-hidden="true" id="more-menu-button">Focus Trap</button>
            {isMoreMenuOpen && <MoreMenuPopover items={uniqueMoreMenuItems} onClose={() => setIsMoreMenuOpen(false)} parentRef={moreMenuButtonRef} />}
          </div>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
