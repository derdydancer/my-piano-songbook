
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, FilmIcon, GiftIcon, CogIcon, DumbbellIcon, ClipboardListIcon, DotsHorizontalIcon, BeakerIcon } from './common/Icons'; // Added BeakerIcon
import { useAppData } from '../contexts/AppDataContext';
import { UtilityId, UtilitySetting } from '../types';
import { UTILITY_IDS } from '../constants';

interface NavItemDef {
  to: string;
  utilityId: UtilityId; 
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  label: string;
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
  const { utilitySettings, getUtilitySetting } = useAppData();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null);

  const allNavItems: NavItemDef[] = [
    { to: '/weight', utilityId: UTILITY_IDS.WEIGHT as UtilityId, icon: <HomeIcon className="w-6 h-6" />, label: 'Weight' },
    { to: '/disney', utilityId: UTILITY_IDS.DISNEY as UtilityId, icon: <FilmIcon className="w-6 h-6" />, label: 'Disney' },
    { to: '/gifts', utilityId: UTILITY_IDS.GIFTS as UtilityId, icon: <GiftIcon className="w-6 h-6" />, label: 'Gifts' },
    { to: '/train', utilityId: UTILITY_IDS.TRAIN as UtilityId, icon: <DumbbellIcon className="w-6 h-6" />, label: 'Train' },
    { to: '/workouts', utilityId: UTILITY_IDS.TRAIN as UtilityId, icon: <ClipboardListIcon className="w-6 h-6" />, label: 'Workouts' }, 
    { to: '/bar-loader-tester', utilityId: UTILITY_IDS.BAR_LOADER_TESTER as UtilityId, icon: <BeakerIcon className="w-6 h-6" />, label: 'Bar Test' }, // New Utility
    { to: '/settings', utilityId: UTILITY_IDS.SETTINGS as UtilityId, icon: <CogIcon className="w-6 h-6" />, label: 'Settings' },
  ];
  
  const getActualUtilitySetting = (id: UtilityId): UtilitySetting | undefined => {
    if (id === UTILITY_IDS.TRAIN && allNavItems.find(item => item.label === 'Workouts')?.utilityId === id) {
        const trainSetting = getUtilitySetting(UTILITY_IDS.TRAIN as UtilityId);
        return trainSetting;
    }
    return getUtilitySetting(id);
  };

  const mainBarItems = allNavItems.filter(item => {
    const utility = getActualUtilitySetting(item.utilityId);
    return utility?.enabled && !utility.showInMoreMenu;
  });

  const moreMenuItems = allNavItems.filter(item => {
    const utility = getActualUtilitySetting(item.utilityId);
    if (item.label === 'Workouts') {
        const trainUtilitySetting = getUtilitySetting(UTILITY_IDS.TRAIN as UtilityId);
        return trainUtilitySetting?.enabled && trainUtilitySetting.showInMoreMenu;
    }
    return utility?.enabled && utility.showInMoreMenu;
  });
  
  const uniqueMoreMenuItems = moreMenuItems.reduce((acc, current) => {
    if (current.label === 'Workouts') {
        const trainUtilityInMore = moreMenuItems.find(i => i.label === 'Train');
        if (trainUtilityInMore) {
            if (!acc.find(item => item.label === 'Train')) { 
                acc.push(trainUtilityInMore);
            }
            if (!acc.find(item => item.label === 'Workouts')) {
                acc.push(current);
            }
        }
    } else if (current.label === 'Train') {
        if (!acc.find(item => item.label === 'Train')) {
            acc.push(current);
        }
        const workoutsNavItem = allNavItems.find(i => i.label === 'Workouts');
        const trainUtilitySetting = getUtilitySetting(UTILITY_IDS.TRAIN as UtilityId);
        if (workoutsNavItem && trainUtilitySetting?.enabled && trainUtilitySetting.showInMoreMenu) {
            if (!acc.find(item => item.label === 'Workouts')) {
                 acc.push(workoutsNavItem);
            }
        }
    }
    else if (!acc.find(item => item.label === current.label)) {
        acc.push(current);
    }
    return acc;
  }, [] as NavItemDef[]);
  
  uniqueMoreMenuItems.sort((a, b) => {
    const aIndex = allNavItems.findIndex(item => item.label === a.label);
    const bIndex = allNavItems.findIndex(item => item.label === b.label);
    return aIndex - bIndex;
  });


  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-gray-200 dark:border-gray-700 shadow-top p-1 sm:relative sm:border-none sm:shadow-none sm:bg-transparent dark:sm:bg-transparent">
      <div className="max-w-md mx-auto flex justify-around relative">
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
            <button 
                ref={moreMenuButtonRef} 
                onClick={() => setIsMoreMenuOpen(prev => !prev)} 
                className="flex flex-col items-center justify-center p-2 focus:outline-none"
                aria-haspopup="true"
                aria-expanded={isMoreMenuOpen}
                aria-controls="more-menu-popover"
                id="more-menu-button"
            >
                <DotsHorizontalIcon className={`w-6 h-6 ${isMoreMenuOpen ? 'text-primary dark:text-primary' : 'text-textSecondary hover:text-textPrimary dark:text-textSecondary dark:hover:text-textPrimary'}`} />
                <span className={`text-xs mt-1 ${isMoreMenuOpen ? 'text-primary dark:text-primary' : 'text-textSecondary hover:text-textPrimary dark:text-textSecondary dark:hover:text-textPrimary'}`}>More</span>
            </button>
            {isMoreMenuOpen && <MoreMenuPopover items={uniqueMoreMenuItems} onClose={() => setIsMoreMenuOpen(false)} parentRef={moreMenuButtonRef} />}
          </div>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;