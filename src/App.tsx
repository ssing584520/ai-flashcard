import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Review from './components/Review';
import CardLibrary from './components/CardLibrary';
import CreateCard from './components/CreateCard';
import CardEditor from './components/CardEditor';
import Settings from './components/Settings';

type Page = 'dashboard' | 'review' | 'library' | 'create' | 'editor' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '') as Page;
      if (['dashboard', 'review', 'library', 'create', 'editor', 'settings'].includes(hash)) {
        setPage(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (p: Page) => {
    window.location.hash = p === 'dashboard' ? '' : `#/${p}`;
    setPage(p);
  };

  const navItems = [
    { id: 'dashboard' as Page, label: '首页', icon: '🏠' },
    { id: 'review' as Page, label: '复习', icon: '📖' },
    { id: 'create' as Page, label: '创建', icon: '➕' },
    { id: 'library' as Page, label: '卡片', icon: '🗂️' },
    { id: 'settings' as Page, label: '设置', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen pb-20">
      {page === 'dashboard' && <Dashboard />}
      {page === 'review' && <Review onHome={() => navigate('dashboard')} />}
      {page === 'library' && <CardLibrary />}
      {page === 'create' && <CreateCard />}
      {page === 'editor' && <CardEditor type="english" onSuccess={() => navigate('library')} />}
      {page === 'settings' && <Settings />}

      <nav className="fixed bottom-0 left-0 right-0 bg-candy-white/90 backdrop-blur-lg border-t border-candy-pink/10 px-2 py-2 safe-area-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0
                ${page === item.id ? 'text-candy-pink' : 'text-candy-text-light hover:text-candy-text'}`}
            >
              <span className={`text-xl ${page === item.id ? 'animate-float' : ''}`}>{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
              {page === item.id && (
                <div className="w-1 h-1 rounded-full bg-candy-pink mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
