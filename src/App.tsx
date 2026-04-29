/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Menu, AlertTriangle, Copy, X, Calendar, Clock, Activity, Globe, ArrowUp, ArrowDown, Key, Monitor, Image as ImageIcon, Link as LinkIcon, Shield, User, Plus, List, Tv, RefreshCw, CheckCircle2, LayoutGrid, CircleDot, Check, PlaySquare, Info, LayoutTemplate, Save, Trash2 } from 'lucide-react';

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverTokenValue, setRecoverTokenValue] = useState('');
  const [recoverUsernameValue, setRecoverUsernameValue] = useState('');
  
  const [token, setToken] = useState<string>('');
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [activeIps, setActiveIps] = useState<{ id: string, ip: string, timestamp: number }[]>([]);
  const activeDevices = activeIps.length;
  const [isBlocked, setIsBlocked] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'ip-manager' | 'add-items' | 'contact-us' | 'customise'>('dashboard');
  const [extendDate, setExtendDate] = useState('');
  const [extendTime, setExtendTime] = useState('');

  // Channels State
  const [channels, setChannels] = useState<{ id: string, name: string, logo: string, url: string, drmType: string, drmKey: string, userAgent: string }[]>([]);
  const [channelName, setChannelName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [drmType, setDrmType] = useState('No DRM');
  const [drmKey, setDrmKey] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [isDrmDropdownOpen, setIsDrmDropdownOpen] = useState(false);

  // Customise State
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const genres = [
    { id: 'business-news', title: 'Business News', count: 15, icon: <Activity size={32} /> },
    { id: 'entertainment', title: 'Entertainment', count: 197, icon: <PlaySquare size={32} /> },
    { id: 'infotainment', title: 'Infotainment', count: 55, icon: <Info size={32} /> },
    { id: 'movies', title: 'Movies', count: 114, icon: <LayoutTemplate size={32} /> },
    { id: 'sports', title: 'Sports', count: 89, icon: <Activity size={32} /> },
    { id: 'kids', title: 'Kids', count: 42, icon: <PlaySquare size={32} /> },
  ];

  useEffect(() => {
    if (activeDevices > 4) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [activeDevices]);

  const generateMockIp = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  // Simulate real-time devices connecting/disconnecting
  useEffect(() => {
    if (!hasToken || isBlocked) return;
    const wsMockTimer = setInterval(() => {
      // 15% chance to fluctuate device count (-1 or +1)
      if (Math.random() > 0.85) {
         setActiveIps(prev => {
            const isAdding = Math.random() > 0.5;
            if (isAdding) {
              if (prev.length >= 5) return prev; // Don't exceed 5 for simulation
              return [...prev, { id: Math.random().toString(36).substring(7), ip: generateMockIp(), timestamp: Date.now() }];
            } else {
              if (prev.length <= 0) return prev;
              const next = [...prev];
              next.pop();
              return next;
            }
         });
      }
    }, 4000);
    return () => clearInterval(wsMockTimer);
  }, [hasToken, isBlocked]);

  const applyVplinkToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < 8; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    setToken(res);
    setActiveIps([{ id: Math.random().toString(36).substring(7), ip: generateMockIp(), timestamp: Date.now() }]);
    setIsBlocked(false);
    setHasToken(true);
    // 7 days from now
    setExpiryTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('verify') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      applyVplinkToken();
    }
  }, []);

  const [isVerifying, setIsVerifying] = useState(false);

  const startVplinkVerification = async () => {
    setIsVerifying(true);
    try {
      const longUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?verify=success');
      const apiToken = 'aa0beef3fa8d618cb3a7c037d6229a8435e74a3e';
      const apiUrl = `https://vplink.in/api?api=${apiToken}&url=${longUrl}`;
      
      let result;
      try {
        // Direct fetch
        const res = await fetch(apiUrl);
        result = await res.json();
      } catch (directErr) {
        console.warn("Direct fetch failed, trying proxy 1", directErr);
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(apiUrl)}`);
          result = await res.json();
        } catch (proxyErr) {
          console.warn("Proxy 1 failed, trying allorigins", proxyErr);
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`);
          result = await res.json();
        }
      }

      if (result && (result.status === 'success' || result.shortenedUrl)) {
        window.open(result.shortenedUrl, '_blank');
      } else {
        alert("Error generating verification link: " + (result?.message || 'Unknown error'));
        setIsVerifying(false);
      }
    } catch (e) {
       console.error("VpLink error", e);
       alert("Failed to reach verification server. Please try again later. Is your adblocker active?");
       setIsVerifying(false);
    }
  };

  const basePath = typeof window !== 'undefined' ? window.location.origin + window.location.pathname.replace(/\/$/, '') : '';
  const generatedUrl = token ? `${basePath}/${token}/playlist.m3u` : '';

  const handleGenerate = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < 8; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    setToken(res);
    setActiveIps([{ id: Math.random().toString(36).substring(7), ip: generateMockIp(), timestamp: Date.now() }]);
    setIsBlocked(false);
    setHasToken(true);
    // 2 minutes from now
    setExpiryTime(Date.now() + 2 * 60 * 1000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    // In a real app, maybe show a toast
  };

  const openExtendModal = () => {
    if (expiryTime) {
      const d = new Date(expiryTime);
      setExtendDate(d.toISOString().split('T')[0]);
      // make sure time is HH:MM in local time
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setExtendTime(`${h}:${m}`);
    }
    setIsExtendModalOpen(true);
  };

  const handleExtendValidity = () => {
    if (extendDate && extendTime) {
      const newDateStr = `${extendDate}T${extendTime}`;
      const newDate = new Date(newDateStr);
      setExpiryTime(newDate.getTime());
    }
    setIsExtendModalOpen(false);
  };

  let remainingDays = '00';
  let remainingTimeStr = '00:00:00';
  let isExpired = false;

  if (expiryTime) {
    const diff = expiryTime - now;
    if (diff > 0) {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      remainingDays = String(d).padStart(2, '0');
      remainingTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
      isExpired = true;
    }
  }

  const formatExpiryDate = (ts: number | null) => {
    if (!ts) return { date: '--', time: '--' };
    const dateObj = new Date(ts);
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date: dateStr, time: timeStr };
  }
  const expiryFormatted = formatExpiryDate(expiryTime);

  if (currentView === 'ip-manager') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#7780e8] to-[#925dd7] text-slate-800 font-sans relative overflow-x-hidden p-4 sm:p-6 pb-24">
        {/* Top Bar */}
        <header className="flex justify-between items-center mb-6 max-w-lg mx-auto">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">IP Manager - {token || 'No Token'}</h1>
            <a href="#" className="text-white/80 text-xs mt-1 truncate max-w-[200px]">{basePath}/{token ? `Token_${token}` : ''}</a>
          </div>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        <main className="max-w-lg mx-auto space-y-4 relative z-10">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-[#0ea5e9]" />
              <h2 className="text-lg font-bold text-slate-800">IP Manager</h2>
            </div>
            
            <div className="space-y-3 mb-6">
              {!hasToken ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <p className="text-slate-500 mb-4 text-sm font-medium text-center">No active token found. Generate one to view IP manager details.</p>
                  <button 
                    onClick={handleGenerate}
                    className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold py-2.5 px-8 rounded-xl transition-colors shadow-lg"
                  >
                    Generate Token
                  </button>
                </div>
              ) : (
               <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium text-sm">Token ID:</span>
                  <span className="font-mono text-slate-700">{token || '--'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium text-sm">Expires At:</span>
                  <span className="font-mono text-slate-700">{expiryFormatted.date} {expiryFormatted.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium text-sm">Status:</span>
                  {isExpired ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> EXPIRED
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> ACTIVE
                    </span>
                  )}
                </div>
               </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#10b981] rounded-xl p-4 text-white">
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-90">Active Devices</div>
                <div className="text-2xl font-bold">{activeDevices}/{hasToken ? '4' : '0'}</div>
              </div>
              <div className="bg-[#7c3aed] rounded-xl p-4 text-white">
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-90">Total IPs</div>
                <div className="text-2xl font-bold">{activeIps.length}</div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-5 shadow-xl">
             <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Calendar size={18} className="text-red-500" />
              <h2 className="text-md font-bold text-slate-800">Last Login Devices ( 24h )</h2>
            </div>
            
            <div className="space-y-3">
              {activeIps.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No active devices using your token.
                </div>
              ) : (
                activeIps.map(device => {
                  const d = new Date(device.timestamp);
                  const deviceDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const deviceTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

                  return (
                    <div key={device.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm gap-3">
                      <div>
                        <div className="font-mono text-sm text-slate-700 mb-0.5">{device.ip}</div>
                        <div className="text-xs text-slate-500">{deviceDate} {deviceTime}</div>
                      </div>
                      <button 
                        onClick={() => setActiveIps(prev => prev.filter(d => d.id !== device.id))}
                        className="bg-[#ef4444] hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
                      >
                        REMOVE
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button 
             className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10 shadow-lg backdrop-blur-sm"
          >
            <Activity size={18} />
            REFRESH STATUS
          </button>
        </main>

        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          <button className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white shadow-lg transition-colors">
            <ArrowUp size={20} />
          </button>
          <button className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white shadow-lg transition-colors">
            <ArrowDown size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'customise') {
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-200 font-sans relative overflow-x-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-[#0a1128] border-b border-slate-800 relative z-10 sticky top-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8] to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
               <Tv size={20} className="text-white" />
             </div>
             <h1 className="text-xl font-bold text-[#38bdf8] tracking-wide">Channel Customizer</h1>
          </div>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        {/* Badges Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-[#0a1128] overflow-x-auto overflow-y-hidden whitespace-nowrap hide-scrollbar flex-none">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-sm">
             <LayoutGrid size={16} className="text-[#38bdf8]" />
             <span>Genres <strong className="text-[#38bdf8] ml-1">{genres.length}</strong></span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-sm">
             <CircleDot size={16} className="text-[#38bdf8]" />
             <span>Channels <strong className="text-[#38bdf8] ml-1">1275</strong></span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-sm">
             <Check size={16} className="text-[#34d399]" />
             <span>Selected <strong className="text-[#34d399] ml-1">{selectedGenres.length}</strong></span>
           </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 pb-28 overflow-y-auto w-full max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-sm font-bold text-[#38bdf8] uppercase tracking-widest shrink-0">Genre Folders</h2>
            <div className="h-px bg-[#1e293b] flex-1"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {genres.map(genre => {
              const isSelected = selectedGenres.includes(genre.id);
              return (
                <div 
                  key={genre.id}
                  onClick={() => {
                    setSelectedGenres(prev => 
                      prev.includes(genre.id) 
                        ? prev.filter(id => id !== genre.id)
                        : [...prev, genre.id]
                    );
                  }}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-[24px] border transition-all cursor-pointer ${isSelected ? 'bg-[#1e293b] border-[#38bdf8]' : 'bg-[#111827] border-slate-800 hover:border-slate-700'}`}
                >
                   {isSelected && (
                     <div className="absolute top-3 right-3 text-[#38bdf8]">
                       <CheckCircle2 size={22} className="fill-[#38bdf8]/20" />
                     </div>
                   )}
                   <div className="w-16 h-16 bg-[#1e293b] rounded-2xl flex items-center justify-center text-[#38bdf8] mb-4 shadow-inner">
                     {genre.icon}
                   </div>
                   <h3 className="font-bold text-slate-200 text-center mb-3 leading-tight">{genre.title}</h3>
                   <div className="px-4 py-1.5 rounded-full bg-[#1e293b] text-slate-400 text-xs font-bold border border-slate-700">
                     {genre.count} ch
                   </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Bottom Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a1128] border-t border-slate-800 p-4 z-20">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
             <div className="text-slate-400 text-sm leading-tight flex-1">
               <div><strong className="text-[#38bdf8] text-base">{selectedGenres.length}</strong> selected across</div>
               <div><strong className="text-[#38bdf8] text-base">{genres.length}</strong> genres</div>
             </div>
             <div className="flex gap-3">
               <button className="flex items-center justify-center gap-2 bg-[#34d399] hover:bg-[#10b981] text-[#064e3b] font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg text-sm">
                 <Save size={18} />
                 Save & Submit
               </button>
               <button 
                 onClick={() => setSelectedGenres([])}
                 className="flex items-center justify-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg text-sm"
               >
                 <Trash2 size={18} />
                 Reset All
               </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'contact-us') {
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-200 font-sans relative overflow-x-hidden p-6 pb-24">
        <header className="flex items-center justify-center mb-8 pt-4 relative max-w-lg mx-auto">
           <h1 className="text-3xl font-bold text-slate-100">Contact Us</h1>
           <button 
            onClick={() => setCurrentView('dashboard')}
            className="absolute right-0 top-1 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        <main className="max-w-md mx-auto relative">
          <div className="bg-[#111827] rounded-[24px] p-6 shadow-xl border border-slate-800 text-center">
             <div className="w-16 h-16 bg-[#0088cc]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
             </div>
             <h2 className="text-xl font-bold text-white mb-2">Reach out on Telegram</h2>
             <p className="text-slate-400 text-sm mb-6">
                Join our community to get help, share feedback, or just say hi!
             </p>
             <a 
               href="https://t.me/xocietylive" 
               target="_blank" 
               rel="noopener noreferrer"
               className="w-full inline-flex font-bold justify-center items-center gap-2 bg-[#0088cc] hover:bg-[#0077b3] text-white py-3 rounded-xl transition-colors text-lg"
             >
               Open Telegram
             </a>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'add-items') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 font-sans relative overflow-x-hidden p-6 pb-24">
        <header className="flex items-center justify-center mb-8 pt-4 relative max-w-lg mx-auto">
           <h1 className="text-3xl font-bold text-slate-100">Channel Addon</h1>
           <button 
            onClick={() => setCurrentView('dashboard')}
            className="absolute right-0 top-1 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        <main className="max-w-md mx-auto space-y-6 relative">
          <div className="flex justify-center mb-6">
            <div className="bg-[#1e293b]/80 border border-[#334155] text-indigo-300 px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold">
               <Key size={18} /> {token || 'No Token'}
            </div>
          </div>

          <div className="bg-[#111827] rounded-[24px] p-6 shadow-xl border border-slate-800">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#2dd4bf] rounded-2xl flex items-center justify-center text-slate-900 shrink-0">
                <Plus size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-[22px] font-bold text-white">Add New Channel</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-slate-300 text-sm font-bold flex items-center gap-2 mb-2 uppercase tracking-wide opacity-90">
                  <Monitor size={16} className="text-blue-400" /> Channel Name
                </label>
                <input 
                  type="text" 
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., Google HD"
                  className="w-full bg-[#1e293b]/40 border border-slate-700/60 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-bold flex items-center gap-2 mb-2 uppercase tracking-wide opacity-90">
                  <ImageIcon size={16} className="text-blue-400" /> Logo URL
                </label>
                <input 
                  type="text" 
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://google.com/image.png"
                  className="w-full bg-[#1e293b]/40 border border-slate-700/60 rounded-xl px-5 py-4 text-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-bold flex items-center gap-2 mb-2 uppercase tracking-wide opacity-90">
                  <LinkIcon size={16} className="text-blue-400" /> Channel URL
                </label>
                <input 
                  type="text" 
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://dai.google.com/stream.m3u8"
                  className="w-full bg-[#1e293b]/40 border border-slate-700/60 rounded-xl px-5 py-4 text-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-relaxed overflow-hidden text-ellipsis"
                />
              </div>

              <div className="relative">
                <label className="text-slate-300 text-sm font-bold flex items-center gap-2 mb-2 uppercase tracking-wide opacity-90">
                  <Shield size={16} className="text-blue-400" /> DRM Protection
                </label>
                <div 
                  className="w-full bg-[#1e293b]/40 border border-blue-500/50 rounded-xl px-5 py-4 text-white cursor-pointer flex justify-between items-center transition-colors shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                  onClick={() => setIsDrmDropdownOpen(!isDrmDropdownOpen)}
                >
                   {drmType}
                   <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-400"></div>
                </div>
                
                {isDrmDropdownOpen && (
                  <div className="absolute top-[88px] left-0 right-0 bg-[#fff1ed] rounded-3xl p-3 z-20 shadow-2xl overflow-hidden mt-2">
                     {['No DRM', 'ClearKey', 'Widevine'].map((type) => (
                       <div 
                         key={type}
                         onClick={() => { setDrmType(type); setIsDrmDropdownOpen(false); }}
                         className="px-5 py-4 text-slate-900 text-lg hover:bg-orange-100/50 rounded-2xl cursor-pointer flex justify-between items-center transition-colors"
                       >
                         {type}
                         <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${drmType === type ? 'border-[#c2410c]' : 'border-slate-400'}`}>
                           {drmType === type && <div className="w-2.5 h-2.5 bg-[#c2410c] rounded-full"></div>}
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </div>

              {drmType !== 'No DRM' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="text-slate-300 text-sm font-bold flex items-center gap-2 mb-2 uppercase tracking-wide opacity-90">
                    <Key size={16} className="text-blue-400" /> DRM Key/License URL
                  </label>
                  <input 
                    type="text" 
                    value={drmKey}
                    onChange={(e) => setDrmKey(e.target.value)}
                    placeholder="Enter DRM data"
                    className="w-full bg-[#1e293b]/40 border border-slate-700/60 rounded-xl px-5 py-4 text-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-relaxed"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-300 text-sm font-bold flex items-center gap-2 mb-2 uppercase tracking-wide opacity-90">
                  <User size={16} className="text-blue-400" /> Custom User-Agent
                </label>
                <textarea 
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  placeholder="Leave blank for default"
                  rows={3}
                  className="w-full bg-[#1e293b]/40 border border-slate-700/60 rounded-xl px-5 py-4 text-slate-500 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="pt-8">
                <button 
                   onClick={() => {
                     if (channelUrl) {
                       setChannels(prev => [...prev, {
                         id: Math.random().toString(36).substring(7),
                         name: channelName || 'Custom Channel',
                         logo: logoUrl,
                         url: channelUrl,
                         drmType,
                         drmKey,
                         userAgent
                       }]);
                       setChannelName(''); setLogoUrl(''); setChannelUrl(''); setDrmType('No DRM'); setDrmKey(''); setUserAgent('');
                     } else {
                       alert('Please enter a Channel URL');
                     }
                   }}
                   className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold py-4 rounded-full shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-colors text-lg"
                >
                  + Add Channel
                </button>
              </div>
            </div>
          </div>

          {/* Your Channels Card */}
          <div className="bg-[#111827] rounded-[24px] p-6 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between mb-8 text-white min-h-[50px] mt-2">
              <div className="flex items-center gap-4">
                <List size={28} className="text-[#60a5fa]" />
                <h2 className="text-2xl font-bold leading-tight">Your<br/>Channels</h2>
              </div>
              <div className="bg-[#6366f1] text-white px-5 py-2.5 rounded-xl text-center shadow-lg">
                <div className="font-bold text-sm leading-tight">{channels.length}</div>
                <div className="text-[11px] font-bold tracking-wide">channels</div>
              </div>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center">
                <div className="w-[90px] h-[90px] bg-slate-800/80 rounded-full flex items-center justify-center mb-6 shadow-inner">
                   <Tv size={42} className="text-[#60a5fa]" />
                </div>
                <h3 className="text-[22px] font-bold text-white mb-2 leading-tight">No Channels Yet</h3>
                <p className="text-slate-400 text-[15px] max-w-[200px] mx-auto">
                  Start by adding your first custom channel
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {channels.map(channel => (
                  <div key={channel.id} className="bg-[#1e293b]/40 border border-slate-700/60 rounded-2xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 truncate">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {channel.logo ? <img src={channel.logo} alt="" className="w-full h-full object-cover" /> : <Tv size={20} className="text-slate-500" />}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-white truncate">{channel.name}</div>
                        <div className="text-xs text-slate-500 font-mono truncate mt-0.5">{channel.url}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setChannels(prev => prev.filter(c => c.id !== channel.id))}
                      className="text-red-500 bg-red-500/10 p-2 rounded-lg hover:bg-red-500/20 transition-colors shrink-0 ml-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-200 font-sans relative overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-center items-center py-6 px-4 relative max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-400 tracking-tight">SECRET SOCIETY</h1>
          <p className="text-slate-400 text-sm mt-1">Your Personal Game File</p>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="absolute right-4 p-2 border border-slate-700 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors"
        >
          <Menu size={24} className="text-slate-300" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="px-4 pb-12 max-w-md mx-auto relative z-0">
        {!hasToken ? (
          /* Generate Token State */
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mt-4 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-2">Create Your Game File</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Generate your Personal Game File URL & Start Playing in Virtual World.
            </p>
            <button 
              onClick={handleGenerate}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200"
            >
              <AlertTriangle size={18} />
              Generate Game Token
            </button>
          </div>
        ) : (
          /* Dashboard State */
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mt-4 shadow-xl space-y-6">
            <h2 className="text-xl font-semibold text-white">Your Game File Dashboard</h2>
            
            <div className="font-mono text-xs text-slate-400 break-all bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
              {generatedUrl}
            </div>

            <button 
              onClick={handleCopy}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200"
            >
              <Copy size={18} />
              Copy
            </button>

            <div className="bg-yellow-500/10 border border-yellow-600/30 rounded-xl p-4">
              <p className="text-yellow-500 text-sm leading-relaxed">
                <span className="font-semibold">Warning:</span> Only 4 devices are allowed. Sharing your file URL publicly will result in your IP being blocked.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-[#151f32] border ${isBlocked ? 'border-red-500/50' : 'border-slate-800'} rounded-xl p-4 flex flex-col items-center justify-center text-center`}>
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider mb-2">Status</span>
                {isBlocked ? (
                  <span className="text-red-500 font-bold text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">IP BLOCKED</span>
                ) : isExpired ? (
                  <span className="text-red-500 font-bold text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">EXPIRED</span>
                ) : (
                  <span className="text-emerald-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">ACTIVE</span>
                )}
              </div>
              <div className={`bg-[#151f32] border ${activeDevices > 4 ? 'border-red-500/50' : 'border-slate-800'} rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden`}>
                {hasToken && !isBlocked && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-60">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full relative"></div>
                  </div>
                )}
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                  Active Devices
                </span>
                <span className={`${activeDevices > 4 ? 'text-red-500' : 'text-emerald-400'} font-bold text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] transition-all duration-300`}>{activeDevices} / 4</span>
              </div>
              <div className="bg-[#151f32] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider mb-2">Remaining</span>
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-white font-semibold text-base sm:text-lg">{remainingDays}d</span>
                  <span className="text-white font-mono text-sm sm:text-base">{remainingTimeStr}</span>
                </div>
              </div>
              <div className="bg-[#151f32] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider mb-2 pb-1">Expiry Date</span>
                <div className="flex flex-col items-center leading-tight gap-1">
                  <span className="text-white font-semibold text-sm sm:text-base">{expiryFormatted.date}</span>
                  <span className="text-white font-semibold text-sm sm:text-base">{expiryFormatted.time}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button 
                onClick={startVplinkVerification}
                disabled={isVerifying}
                className={`w-full ${isVerifying ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200`}
              >
                {isVerifying && <RefreshCw size={18} className="animate-spin" />}
                Extend Validity
              </button>
              <button 
                onClick={() => setIsManageModalOpen(true)}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Manage Token
              </button>

              {/* Dev Simulation Control */}
              {!isBlocked && (
                <button 
                  onClick={() => setActiveIps(prev => [...prev, { id: Math.random().toString(36).substring(7), ip: generateMockIp(), timestamp: Date.now() }])}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-2 rounded-xl transition-colors duration-200 mt-4 border border-slate-700"
                >
                  [Dev] Simulate Token Use (Device++)
                </button>
              )}
            </div>
          </div>
        )}

        {hasToken && (
          <>
            {/* Recommended Players */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mt-6 shadow-xl">
               <h2 className="text-[22px] font-bold text-white mb-6">Recommended Players</h2>
               <div className="space-y-4">
                  <button className="w-full bg-[#1e293b]/60 hover:bg-[#1e293b] text-white font-bold py-4 rounded-xl transition-colors border border-slate-800 shadow-sm text-lg">NS Player</button>
                  <button className="w-full bg-[#1e293b]/60 hover:bg-[#1e293b] text-white font-bold py-4 rounded-xl transition-colors border border-slate-800 shadow-sm text-lg">OTT Navigator</button>
                  <button className="w-full bg-[#1e293b]/60 hover:bg-[#1e293b] text-white font-bold py-4 rounded-xl transition-colors border border-slate-800 shadow-sm text-lg">TiviMate</button>
               </div>
               <div className="mt-6 bg-[#1e293b]/40 rounded-xl p-4 border-l-4 border-l-slate-600">
                 <p className="text-slate-400 text-sm leading-relaxed">
                   <span className="font-bold text-slate-300">Note:</span> We cannot share direct application links due to copyright policies. These apps are freely available on the Play Store so just search it by the name.
                 </p>
               </div>
            </div>

            {/* Token Verification */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mt-6 shadow-xl mb-4">
               <h2 className="text-[22px] font-bold text-white mb-6">Token Verification</h2>
               <div className="bg-[#161f30] rounded-2xl p-5 border border-slate-800/80 shadow-inner">
                  <div className="flex items-center gap-3 text-white font-bold mb-6 text-lg">
                     <Shield size={20} className="text-slate-300" />
                     Verify Your Token
                  </div>
                  <div className="space-y-5">
                     <div>
                       <label className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 block">USERNAME</label>
                       <input type="text" placeholder="Enter your username (Telegram, Discord)" className="w-full bg-[#111827] border border-slate-700/80 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 font-medium" />
                     </div>
                     <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20 text-lg">
                        <CheckCircle2 size={20} />
                        Verify Username
                     </button>
                     <div className="bg-[#1e293b]/40 rounded-xl p-4 border-l-4 border-l-slate-600 mt-2">
                       <p className="text-slate-400 text-sm leading-relaxed">
                         <span className="font-bold text-slate-300">Note:</span> If you verify your token, it will help you recover your token details if you lose access or forget your token.
                       </p>
                     </div>
                  </div>
               </div>
            </div>
          </>
        )}
      </main>

      {/* Sidebar Overlay & Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          <div className="relative w-72 bg-[#0B1120] h-full flex flex-col shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-200 z-50">
            <div className="flex justify-between items-center p-6 border-b border-slate-800/50">
              <h2 className="text-2xl font-bold text-white">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                <Menu size={24} className="text-slate-300" />
              </button>
            </div>
            <nav className="flex-1 py-4 flex flex-col justify-between">
              <ul className="space-y-1">
                {[
                  'Add Your Items',
                  'Customise Your File',
                  'IP Manager',
                  'Recover Token',
                  'About Us',
                  'Contact Us'
                ].map((item) => (
                  <li key={item}>
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (item === 'IP Manager') {
                          setCurrentView('ip-manager');
                        } else if (item === 'Add Your Items') {
                          setCurrentView('add-items');
                        } else if (item === 'Contact Us') {
                          setCurrentView('contact-us');
                        } else if (item === 'Customise Your File') {
                          setCurrentView('customise');
                        } else if (item === 'Recover Token') {
                          setIsRecoverModalOpen(true);
                        }
                      }}
                      className="w-full text-left px-6 py-4 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-lg"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="p-6 text-sm text-slate-500 text-center">
                © 2022-26 SECRET SOCIETY
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Manage Token Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsManageModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="text-xl font-semibold text-red-500">Token Management</h3>
            </div>
            <p className="text-slate-300 text-base mb-6">
              Choose an action for your token:
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => setIsManageModalOpen(false)}
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsManageModalOpen(false);
                  setIsRecoverModalOpen(true);
                }}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Recover Token
              </button>
              <button 
                onClick={() => {
                  setHasToken(false);
                  setIsManageModalOpen(false);
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Delete Token
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Extend Validity Modal */}
      {isExtendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExtendModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Extend Validity</h3>
              <button onClick={() => setIsExtendModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2 font-medium flex items-center gap-2">
                  <Calendar size={16} /> New Expiry Date
                </label>
                <input 
                  type="date" 
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2 font-medium flex items-center gap-2">
                  <Clock size={16} /> New Expiry Time
                </label>
                <input 
                  type="time" 
                  value={extendTime}
                  onChange={(e) => setExtendTime(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsExtendModalOpen(false)}
                className="flex-1 bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleExtendValidity}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recover Token Modal */}
      {isRecoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsRecoverModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-orange-500">
              <RefreshCw size={24} className="shrink-0" />
              <h3 className="text-2xl font-bold">Recover Your Token</h3>
            </div>
            
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Enter your token and verified username to recover access. Your current token will be deleted.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 block">Token</label>
                <input 
                  type="text"
                  value={recoverTokenValue}
                  onChange={e => setRecoverTokenValue(e.target.value)}
                  placeholder="Enter your token"
                  className="w-full bg-[#1e293b]/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 block">Username</label>
                <input 
                  type="text"
                  value={recoverUsernameValue}
                  onChange={e => setRecoverUsernameValue(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-[#1e293b]/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setIsRecoverModalOpen(false)}
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-white font-medium py-3 rounded-xl transition-colors duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (recoverTokenValue && recoverUsernameValue) {
                     setToken(recoverTokenValue);
                     setHasToken(true);
                     setActiveIps([]);
                     setExpiryTime(Date.now() + 24 * 60 * 60 * 1000);
                     setIsRecoverModalOpen(false);
                     setRecoverTokenValue('');
                     setRecoverUsernameValue('');
                  }
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors duration-200 shadow-lg shadow-orange-500/20"
              >
                Recover Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
