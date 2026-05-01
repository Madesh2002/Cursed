/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Menu, AlertTriangle, Copy, X, Calendar, Clock, Activity, Globe, ArrowUp, ArrowDown, Key, Monitor, Image as ImageIcon, Link as LinkIcon, Shield, User, Plus, List, Tv, RefreshCw, CheckCircle2, LayoutGrid, CircleDot, Check, PlaySquare, Info, LayoutTemplate, Save, Trash2, Settings, Folder } from 'lucide-react';

export default function App() {
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem('vplink_token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverTokenValue, setRecoverTokenValue] = useState('');
  const [recoverUsernameValue, setRecoverUsernameValue] = useState('');
  
  const [verificationUsername, setVerificationUsername] = useState('');
  const [verifiedUsername, setVerifiedUsername] = useState(() => localStorage.getItem('vplink_username') || '');
  
  const [token, setToken] = useState<string>(() => localStorage.getItem('vplink_token') || '');
  const [expiryTime, setExpiryTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('vplink_expiry');
    return saved ? parseInt(saved, 10) : null;
  });
  const [now, setNow] = useState(Date.now());
  const [activeIps, setActiveIps] = useState<{ id: string, ip: string, timestamp: number }[]>(() => {
    const saved = localStorage.getItem('vplink_ips');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    if (token) localStorage.setItem('vplink_token', token);
    else localStorage.removeItem('vplink_token');
  }, [token]);

  useEffect(() => {
    if (expiryTime) localStorage.setItem('vplink_expiry', expiryTime.toString());
    else localStorage.removeItem('vplink_expiry');
  }, [expiryTime]);

  useEffect(() => {
    if (verifiedUsername) localStorage.setItem('vplink_username', verifiedUsername);
    else localStorage.removeItem('vplink_username');
  }, [verifiedUsername]);

  useEffect(() => {
    localStorage.setItem('vplink_ips', JSON.stringify(activeIps));
  }, [activeIps]);

  const activeDevices = activeIps.length;
  const [isBlocked, setIsBlocked] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'ip-manager' | 'add-items' | 'contact-us' | 'customise' | 'admin'>('dashboard');
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
  
  // Admin State
  const [config, setConfig] = useState<any>({
    playlist_url: ''
  });
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [adminStatus, setAdminStatus] = useState({ type: '', message: '' });

  const [genres, setGenres] = useState<any[]>([]);
  const [totalChannels, setTotalChannels] = useState(0);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  useEffect(() => {
    if (currentView === 'customise') {
      const fetchMetadata = async () => {
        setIsFetchingMetadata(true);
        try {
          const res = await fetch('/api/metadata');
          const contentType = res.headers.get("content-type");
          if (res.ok && contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setGenres(data.genres || []);
            setTotalChannels(data.totalChannels || 0);
          } else {
            console.error("Error fetching metadata:", res.statusText);
            setGenres([{ 
               id: 'error', 
               title: 'Error: Cannot fetch from server', 
               count: 0 
            }]);
          }
        } catch (error) {
          console.error("Error fetching metadata:", error);
          setGenres([{ 
             id: 'error', 
             title: 'Error: Cannot fetch from server', 
             count: 0 
          }]);
        }
        setIsFetchingMetadata(false);
      };
      fetchMetadata();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'admin') {
      const fetchConfig = async () => {
        try {
          const res = await fetch('/api/settings/config');
          if (res.ok) {
            const data = await res.json();
            setConfig(data);
          }
        } catch (error) {
          console.error("Error fetching config:", error);
        }
      };
      fetchConfig();
    }
  }, [currentView]);

  useEffect(() => {
    if (activeDevices > 4) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [activeDevices]);

  const generateMockIp = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  useEffect(() => {
    if (!token) return;
    
    const fetchTokenInfo = async () => {
      try {
         const res = await fetch(`/api/tokens/${token}`);
         const contentType = res.headers.get("content-type");
         if (res.ok && contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.devices) {
               // devices come as array: {id, ip, userAgent, lastSeen}
               setActiveIps(data.devices.map((d: any) => ({
                   id: d.id,
                   ip: d.ip,
                   timestamp: d.lastSeen,
                   userAgent: d.userAgent
               })));
            }
            if (data.blocked !== undefined) {
               setIsBlocked(data.blocked);
            }
         } else if (!res.ok && res.status !== 404) {
            console.error(`Error fetching token info: ${res.statusText}`);
         }
      } catch(e) {
         console.error("Error fetching token info", e);
      }
    };
    
    // Fetch immediately and then poll every 4 seconds
    fetchTokenInfo();
    const wsMockTimer = setInterval(fetchTokenInfo, 4000);
    return () => clearInterval(wsMockTimer);
  }, [token]);

  useEffect(() => {
    if (token && expiryTime) {
      const syncToken = async () => {
        try {
          await fetch('/api/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, expiryTime })
          });
        } catch (e) {
          console.error("Error syncing token", e);
        }
      };
      syncToken();
    }
  }, [token, expiryTime]);

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

  const handleSaveConfig = async () => {
    setIsAdminSaving(true);
    setAdminStatus({ type: '', message: '' });
    try {
      const dataToSave = {
        ...config,
        last_sync: new Date().toLocaleTimeString()
      };
      
      const res = await fetch('/api/settings/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave)
      });
      
      if (!res.ok) {
          throw new Error('Failed to update server configuration');
      }

      setAdminStatus({ type: 'success', message: 'Server updated instantly!' });
    } catch (error: any) {
      console.error(error);
      setAdminStatus({ type: 'error', message: `Error: ${error.message}` });
    }
    setIsAdminSaving(false);
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
  const genresQuery = selectedGenres.length > 0 ? `?genres=${selectedGenres.join(',')}` : '';
  const generatedUrl = token ? `${basePath}/${token}/playlist.m3u${genresQuery}` : '';

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
    setVerifiedUsername('');
    setVerificationUsername('');
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = generatedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Clipboard fallback failed", e);
      }
      document.body.removeChild(textArea);
    }
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
        <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe className="text-white animate-pulse" />
              IP Manager <span className="opacity-60 text-lg">/ {token || 'No Token'}</span>
            </h1>
            <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
               <Monitor size={14} />
               <span className="truncate max-w-[200px] md:max-w-md">{basePath}/{token ? `Token_${token}` : ''}</span>
            </div>
          </div>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all shadow-lg backdrop-blur-md"
          >
            <X size={28} />
          </button>
        </header>

        <main className="max-w-7xl mx-auto space-y-6 relative z-10 lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0">
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Token Summary */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield size={22} className="text-[#0ea5e9]" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Connection Status</h2>
              </div>
              
              <div className="space-y-4 mb-8">
                {!hasToken ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 mb-6 text-sm font-medium text-center max-w-[200px]">No active token found. Generate one to manage IPs.</p>
                    <button 
                      onClick={handleGenerate}
                      className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold py-3 px-10 rounded-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                      Generate Token
                    </button>
                  </div>
                ) : (
                 <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Token ID</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200">{token || '--'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Expires On</span>
                    <span className="font-mono text-slate-700 font-medium">{expiryFormatted.date}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Security Status</span>
                    {isExpired ? (
                      <span className="px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-amber-200">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div> EXPIRED
                      </span>
                    ) : (
                      <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-200">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> ACTIVE
                      </span>
                    )}
                  </div>
                 </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#10b981] rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                  <div className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Devices</div>
                  <div className="text-3xl font-black">{activeDevices}<span className="text-lg opacity-60 ml-1">/ {hasToken ? '4' : '0'}</span></div>
                </div>
                <div className="bg-[#7c3aed] rounded-2xl p-6 text-white shadow-lg shadow-violet-500/20">
                  <div className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Logged IPs</div>
                  <div className="text-3xl font-black">{activeIps.length}</div>
                </div>
              </div>
            </div>

            <button 
               className="w-full bg-white/20 hover:bg-white/30 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all border border-white/20 shadow-xl backdrop-blur-md active:scale-95 group uppercase tracking-widest"
            >
              <Activity size={22} className="group-hover:rotate-12 transition-transform" />
              REFRESH SYSTEM STATUS
            </button>
          </div>

          <div className="lg:col-span-7">
            {/* Card 2: Active Devices List */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-2xl h-full flex flex-col">
               <div className="flex items-center justify-between gap-2 mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Calendar size={22} className="text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Connected Devices (24h)</h2>
                </div>
                <div className="bg-slate-100 px-4 py-1.5 rounded-full text-slate-600 text-xs font-bold uppercase tracking-wider">
                  Live Feed
                </div>
              </div>
              
              <div className="space-y-4 flex-1">
                {activeIps.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="p-6 bg-slate-50 rounded-full mb-4">
                      <Monitor size={48} className="opacity-20" />
                    </div>
                    <p className="text-lg font-medium">No active connections logged</p>
                    <p className="text-sm">Your token activity will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeIps.map(device => {
                      const d = new Date(device.timestamp);
                      const deviceDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                      const deviceTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                      return (
                        <div key={device.id} className="group flex items-center justify-between bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-100 p-4 rounded-2xl transition-all hover:shadow-lg">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors shrink-0">
                               <Monitor size={24} className="text-slate-400 group-hover:text-blue-500" />
                            </div>
                            <div className="truncate min-w-0">
                              <div className="font-mono text-sm font-bold text-slate-700 mb-0.5 truncate">{device.ip}</div>
                              {device.userAgent && (
                                 <div className="text-xs text-slate-500 font-medium truncate mb-0.5" title={device.userAgent}>
                                   {device.userAgent}
                                 </div>
                              )}
                              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <Clock size={12} /> {deviceDate}, {deviceTime}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                               try {
                                  await fetch(`/api/tokens/${token}/devices/${device.id}`, { method: 'DELETE' });
                                  setActiveIps(prev => prev.filter(d => d.id !== device.id));
                               } catch (e) {
                                  console.error("Failed to disconnect", e);
                               }
                            }}
                            className="bg-[#ef4444] hover:bg-red-600 text-white p-2.5 rounded-xl transition-all shadow-md hover:shadow-red-200 active:scale-90 shrink-0 ml-2"
                            title="Disconnect Device"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
          <button className="p-4 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-full text-white shadow-2xl transition-all border border-white/20 active:scale-90 hover:translate-y-[-2px]">
            <ArrowUp size={24} />
          </button>
          <button className="p-4 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-full text-white shadow-2xl transition-all border border-white/20 active:scale-90 hover:translate-y-[2px]">
            <ArrowDown size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'customise') {
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-200 font-sans relative overflow-x-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 px-6 lg:px-10 bg-[#0a1128] border-b border-slate-800 relative z-10 sticky top-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
               <Tv size={24} className="text-white" />
             </div>
             <h1 className="text-2xl font-bold text-[#38bdf8] tracking-wide">Channel Customizer</h1>
          </div>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={28} />
          </button>
        </header>

        {/* Badges Bar */}
        <div className="bg-[#0a1128]/80 backdrop-blur-md border-b border-slate-800 sticky top-[81px] z-10">
          <div className="flex items-center gap-4 p-4 px-6 lg:px-10 overflow-x-auto whitespace-nowrap hide-scrollbar max-w-7xl mx-auto">
             <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-slate-700 bg-slate-800/50 text-slate-200 text-sm font-medium shadow-sm">
               <LayoutGrid size={18} className="text-[#38bdf8]" />
               <span>Genres <strong className="text-[#38bdf8] ml-2 text-lg">{genres.length}</strong></span>
             </div>
             <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-slate-700 bg-slate-800/50 text-slate-200 text-sm font-medium shadow-sm">
               <CircleDot size={18} className="text-[#38bdf8]" />
               <span>Channels <strong className="text-[#38bdf8] ml-2 text-lg">{totalChannels}</strong></span>
             </div>
             <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-[#34d399]/30 bg-[#34d399]/10 text-slate-100 text-sm font-medium shadow-sm">
               <Check size={18} className="text-[#34d399]" />
               <span>Selected <strong className="text-[#34d399] ml-2 text-lg">{selectedGenres.length}</strong></span>
             </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-10 pb-56 lg:pb-36 overflow-y-auto w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-10">
            <h2 className="text-lg lg:text-xl font-bold text-[#38bdf8] uppercase tracking-[0.2em] shrink-0">Genre Folders</h2>
            <div className="h-px bg-gradient-to-r from-[#1e293b] to-transparent flex-1"></div>
          </div>
          
          {isFetchingMetadata ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
               <RefreshCw className="animate-spin mb-4" size={40} />
               <p className="text-lg font-medium">Loading server metadata...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    className={`group relative flex flex-col items-center justify-center p-8 lg:p-10 rounded-[32px] border transition-all duration-300 cursor-pointer ${isSelected ? 'bg-[#1a2538] border-[#38bdf8] shadow-2xl shadow-blue-500/10' : 'bg-[#111827] border-slate-800 hover:border-slate-600 hover:bg-[#1a2538]/40 shadow-xl'}`}
                  >
                     {isSelected && (
                       <div className="absolute top-5 right-5 text-[#38bdf8] animate-in zoom-in duration-300">
                         <CheckCircle2 size={26} className="fill-[#38bdf8]/20" />
                       </div>
                     )}
                     <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 ${isSelected ? 'bg-[#38bdf8] text-white shadow-lg shadow-blue-500/40 translate-y-[-4px]' : 'bg-[#1e293b] text-[#38bdf8] shadow-inner group-hover:scale-110'}`}>
                       <Folder size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-slate-100 text-center mb-4 leading-tight">{genre.title}</h3>
                     <div className={`px-6 py-2 rounded-full font-bold text-sm border transition-colors ${isSelected ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30' : 'bg-[#1e293b] text-slate-400 border-slate-700'}`}>
                       {genre.count} Channels
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Bottom Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a1128]/95 backdrop-blur-xl border-t border-slate-800 p-4 lg:p-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-6">
             <div className="text-slate-300 text-center sm:text-left">
               <div className="text-base lg:text-xl"><strong className="text-[#38bdf8] text-xl lg:text-2xl px-1">{selectedGenres.length}</strong> genres selected</div>
               <div className="text-slate-500 text-sm lg:text-base font-medium">Out of total <strong className="text-slate-300">{genres.length}</strong> available genres</div>
             </div>
             <div className="flex gap-3 lg:gap-4 w-full sm:w-auto">
               <button 
                 onClick={() => setCurrentView('dashboard')}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#34d399] hover:bg-[#10b981] text-[#064e3b] font-bold py-3 lg:py-4 px-4 lg:px-10 rounded-xl transition-all shadow-xl shadow-emerald-500/20 text-base lg:text-lg"
               >
                 <Save size={20} />
                 Save & Submit
               </button>
               <button 
                 onClick={() => setSelectedGenres([])}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3 lg:py-4 px-4 lg:px-10 rounded-xl transition-all shadow-xl shadow-orange-500/20 text-base lg:text-lg"
               >
                 <Trash2 size={20} />
                 Reset
               </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'contact-us') {
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-200 font-sans relative overflow-x-hidden flex flex-col">
        <header className="flex items-center justify-between p-6 lg:p-10 max-w-7xl mx-auto w-full">
           <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">Get In Touch</h1>
           <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all border border-slate-700 shadow-xl"
          >
            <X size={32} />
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 pb-24">
          <div className="max-w-7xl mx-auto w-full lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            <div className="hidden lg:block space-y-8">
              <div className="space-y-4">
                <h2 className="text-6xl font-black text-white leading-none">Connect with<br/>The <span className="text-indigo-500">Society.</span></h2>
                <p className="text-xl text-slate-400 max-w-md leading-relaxed">
                  Join thousands of users in our community. Get real-time support and the latest updates directly.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center border border-slate-700 shadow-xl">
                  <Activity className="text-indigo-400" size={32} />
                </div>
                <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center border border-slate-700 shadow-xl">
                  <Globe className="text-blue-400" size={32} />
                </div>
                <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center border border-slate-700 shadow-xl">
                  <Shield className="text-emerald-400" size={32} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#111827] to-[#0a1128] rounded-[48px] p-10 lg:p-16 shadow-[0_30px_100px_rgba(0,0,0,0.6)] border border-slate-800/50 text-center relative overflow-hidden group">
               <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] group-hover:bg-indigo-600/20 transition-all duration-700"></div>
               
               <div className="relative z-10">
                 <div className="w-24 h-24 bg-[#0088cc]/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-[#0088cc]/20 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-12 h-12 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                 </div>
                 <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">Our Telegram Channel</h2>
                 <p className="text-slate-400 text-lg mb-10 max-w-sm mx-auto leading-relaxed">
                    Join our vibrant community for instant assistance, feedback sessions, and exclusive announcements.
                 </p>
                 <a 
                   href="https://t.me/xocietylive" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full inline-flex font-black justify-center items-center gap-4 bg-[#0088cc] hover:bg-[#0077b3] text-white py-5 rounded-2xl transition-all shadow-[0_20px_50px_rgba(0,136,204,0.3)] hover:shadow-[0_10px_30px_rgba(0,136,204,0.4)] text-xl active:scale-95 group uppercase tracking-widest"
                 >
                   Open Community
                   <Globe size={24} className="group-hover:rotate-12 transition-transform" />
                 </a>
               </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div className="bg-slate-950 text-slate-200 min-h-screen flex flex-col p-6">
        <header className="flex justify-between items-center py-6 px-4 relative max-w-7xl mx-auto w-full">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowDown className="rotate-90" size={20} /> Back to Dashboard
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                  <h1 className="text-xl font-bold text-white">Server Configuration</h1>
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              
              <div className="space-y-5">
                  <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Playlist URL (M3U)</label>
                      <input 
                        type="text" 
                        value={config?.playlist_url || ''}
                        onChange={(e) => setConfig({...config, playlist_url: e.target.value})}
                        placeholder="https://example.com/playlist.m3u"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500 transition" required 
                      />
                  </div>

                  <button 
                    onClick={handleSaveConfig}
                    disabled={isAdminSaving}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                      {isAdminSaving ? <RefreshCw className="animate-spin" size={20} /> : null}
                      Push Updates to Server
                  </button>
              </div>

              {adminStatus.message && (
                <div className={`mt-6 text-center text-sm font-medium ${adminStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'} block`}>
                  {adminStatus.type === 'success' ? '✨ ' : '❌ '}{adminStatus.message}
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'add-items') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-x-hidden flex flex-col">
        <header className="flex items-center justify-between p-6 lg:p-10 max-w-7xl mx-auto w-full shrink-0">
           <div className="space-y-1">
             <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">Channel Addon</h1>
             <div className="flex items-center gap-2 text-indigo-400 font-black tracking-widest text-sm uppercase">
               <Key size={16} /> Token: {token || 'None'}
             </div>
           </div>
           <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-3xl text-slate-400 hover:text-white transition-all border border-slate-700 shadow-2xl group active:scale-95"
          >
            <X size={32} className="group-hover:rotate-90 transition-transform" />
          </button>
        </header>

        <main className="flex-1 p-6 lg:p-10 pb-24 max-w-7xl mx-auto w-full lg:grid lg:grid-cols-12 lg:gap-10 overflow-y-auto">
          {/* Add New Channel Card */}
          <div className="lg:col-span-5 mb-8 lg:mb-0">
            <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-[40px] p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/80 sticky top-0">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-[#2dd4bf] rounded-[24px] flex items-center justify-center text-slate-900 shadow-xl shadow-teal-500/20">
                  <Plus size={32} strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">New Channel</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="px-1 text-slate-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Monitor size={14} className="text-blue-500" /> Name
                  </label>
                  <input 
                    type="text" 
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Premium Sports HD"
                    className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-bold placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-slate-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <ImageIcon size={14} className="text-blue-500" /> Logo (URL)
                  </label>
                  <input 
                    type="text" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://imgur.com/logo.png"
                    className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl px-6 py-4 text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-slate-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <LinkIcon size={14} className="text-blue-500" /> Stream URL
                  </label>
                  <input 
                    type="text" 
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                    placeholder="https://cdn.example.com/live.m3u8"
                    className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl px-6 py-4 text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                  />
                </div>

                <div className="relative space-y-2">
                  <label className="px-1 text-slate-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Shield size={14} className="text-blue-500" /> DRM Security
                  </label>
                  <div 
                    className="w-full bg-slate-900/50 border-2 border-blue-500/30 rounded-2xl px-6 py-4 text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-800 shadow-lg shadow-blue-500/5"
                    onClick={() => setIsDrmDropdownOpen(!isDrmDropdownOpen)}
                  >
                     <span className="font-bold">{drmType}</span>
                     <div className={`transition-transform duration-300 ${isDrmDropdownOpen ? 'rotate-180' : ''}`}>
                       <ArrowDown size={18} />
                     </div>
                  </div>
                  
                  {isDrmDropdownOpen && (
                    <div className="absolute top-[90px] left-0 right-0 bg-[#fff5f2] rounded-3xl p-3 z-30 shadow-[0_20px_60px_rgba(0,0,0,0.4)] animate-in slide-in-from-top-2 duration-200">
                       {['No DRM', 'ClearKey', 'Widevine'].map((type) => (
                         <div 
                           key={type}
                           onClick={() => { setDrmType(type); setIsDrmDropdownOpen(false); }}
                           className={`px-6 py-4 text-lg font-bold rounded-2xl cursor-pointer flex justify-between items-center transition-all ${drmType === type ? 'bg-orange-500 text-white' : 'text-slate-800 hover:bg-orange-50'}`}
                         >
                           {type}
                           {drmType === type && <Check size={20} />}
                         </div>
                       ))}
                    </div>
                  )}
                </div>

                {drmType !== 'No DRM' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                    <label className="px-1 text-slate-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Key size={14} className="text-blue-500" /> DRM License Key
                    </label>
                    <input 
                      type="text" 
                      value={drmKey}
                      onChange={(e) => setDrmKey(e.target.value)}
                      placeholder="License server URL or ClearKey JSON"
                      className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl px-6 py-4 text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                    />
                  </div>
                )}

                <div className="pt-6">
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
                         alert('Channel URL is mandatory');
                       }
                     }}
                     className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-full shadow-[0_15px_40px_rgba(79,70,229,0.4)] hover:shadow-[0_10px_25px_rgba(79,70,229,0.5)] active:scale-95 transition-all text-xl uppercase tracking-widest"
                  >
                    🚀 Register Channel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Your Channels Card */}
            <div className="bg-[#111827] rounded-[48px] p-8 lg:p-12 shadow-2xl border border-slate-800/60 min-h-full">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-inner">
                    <List size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-white leading-none">Library</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest mt-2">{channels.length} Total Registers</p>
                  </div>
                </div>
              </div>

              {channels.length === 0 ? (
                <div className="text-center py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[40px] bg-slate-900/20">
                  <div className="w-32 h-32 bg-slate-800/40 rounded-full flex items-center justify-center mb-8">
                     <Tv size={64} className="text-slate-600 animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-3">Manifest Empty</h3>
                  <p className="text-slate-500 text-lg max-w-sm mx-auto font-medium">
                    No custom streams have been registered in your current session.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {channels.map(channel => (
                    <div key={channel.id} className="group relative bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 flex items-center justify-between transition-all hover:shadow-2xl hover:translate-y-[-4px]">
                      <div className="flex items-center gap-5 truncate">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                          {channel.logo ? <img src={channel.logo} alt="" className="w-full h-full object-cover" /> : <Tv size={28} className="text-slate-600" />}
                        </div>
                        <div className="truncate pr-4">
                          <div className="font-black text-white text-lg truncate group-hover:text-blue-400 transition-colors">{channel.name}</div>
                          <div className="text-xs text-slate-500 font-mono truncate mt-1 bg-slate-950/50 px-2 py-1 rounded inline-block">{channel.url}</div>
                          <div className="mt-2">
                             <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded ${channel.drmType !== 'No DRM' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-slate-700/30 text-slate-500'}`}>
                               {channel.drmType}
                             </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setChannels(prev => prev.filter(c => c.id !== channel.id))}
                        className="opacity-0 group-hover:opacity-100 absolute -top-3 -right-3 bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 transition-all shadow-xl active:scale-90"
                      >
                        <X size={18} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-200 font-sans relative overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center py-6 px-4 relative max-w-7xl mx-auto w-full">
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-bold text-indigo-400 tracking-tight">SECRET SOCIETY</h1>
          <p className="text-slate-400 text-sm mt-1">Your Personal Game File</p>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 border border-slate-700 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors"
        >
          <Menu size={24} className="text-slate-300" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="px-4 pb-12 max-w-7xl mx-auto relative z-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          <div className="lg:col-span-7 xl:col-span-8">
            {!hasToken ? (
              /* Generate Token State */
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 lg:p-10 mt-4 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-3">Create Your Game File</h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  Generate your Personal Game File URL & Start Playing in Virtual World.
                </p>
                <button 
                  onClick={handleGenerate}
                  className="w-full lg:w-max px-10 bg-blue-600 hover:bg-blue-500 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-3 transition-colors duration-200 text-lg"
                >
                  <AlertTriangle size={20} />
                  Generate Game Token
                </button>
              </div>
            ) : (
              /* Dashboard State */
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 lg:p-8 mt-4 shadow-xl space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6 text-center md:text-left">Your Game File Dashboard</h2>
                  
                  <div className="space-y-4">
                    <div className="font-mono text-sm text-slate-400 break-all bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 select-all text-center">
                      {generatedUrl}
                    </div>

                    <button 
                      onClick={handleCopy}
                      className="w-full px-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200 text-lg shadow-lg shadow-blue-500/20"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                      {copied ? 'Copied to Clipboard!' : 'Copy Playlist URL'}
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-600/30 rounded-xl p-5">
                  <p className="text-yellow-500 text-sm md:text-base leading-relaxed flex gap-3">
                    <AlertTriangle size={24} className="shrink-0" />
                    <span><span className="font-bold">Warning:</span> Only 4 devices are allowed. Sharing your file URL publicly will result in your IP being blocked.</span>
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`bg-[#151f32] border ${isBlocked ? 'border-red-500/50' : 'border-slate-800'} rounded-xl p-5 flex flex-col items-center justify-center text-center`}>
                    <span className="text-slate-400 text-xs uppercase tracking-wider mb-2">Status</span>
                    {isBlocked ? (
                      <span className="text-red-500 font-bold text-xl drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">IP BLOCKED</span>
                    ) : isExpired ? (
                      <span className="text-red-500 font-bold text-xl drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">EXPIRED</span>
                    ) : (
                      <span className="text-emerald-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">ACTIVE</span>
                    )}
                  </div>
                  <div className={`bg-[#151f32] border ${activeDevices > 4 ? 'border-red-500/50' : 'border-slate-800'} rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden`}>
                    {hasToken && !isBlocked && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-60">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full relative"></div>
                      </div>
                    )}
                    <span className="text-slate-400 text-xs uppercase tracking-wider mb-2">Active Devices</span>
                    <span className={`${activeDevices > 4 ? 'text-red-500' : 'text-emerald-400'} font-bold text-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] transition-all duration-300`}>{activeDevices} / 4</span>
                  </div>
                  <div className="bg-[#151f32] border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-slate-400 text-xs uppercase tracking-wider mb-2">Remaining</span>
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-white font-semibold text-lg">{remainingDays}d</span>
                      <span className="text-white font-mono text-base">{remainingTimeStr}</span>
                    </div>
                  </div>
                  <div className="bg-[#151f32] border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-slate-400 text-xs uppercase tracking-wider mb-2">Expiry Date</span>
                    <div className="flex flex-col items-center leading-tight gap-1">
                      <span className="text-white font-semibold text-base">{expiryFormatted.date}</span>
                      <span className="text-white font-semibold text-base">{expiryFormatted.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    onClick={startVplinkVerification}
                    disabled={isVerifying}
                    className={`flex-1 ${isVerifying ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200 text-lg`}
                  >
                    {isVerifying ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                    Extend Validity
                  </button>
                  <button 
                    onClick={() => setIsManageModalOpen(true)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-colors duration-200 text-lg"
                  >
                    Manage Token
                  </button>
                </div>

                {/* Dev Simulation Control */}
                {!isBlocked && (
                  <button 
                    onClick={() => setActiveIps(prev => [...prev, { id: Math.random().toString(36).substring(7), ip: generateMockIp(), timestamp: Date.now() }])}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-2.5 rounded-xl transition-colors duration-200 border border-slate-700"
                  >
                    [Dev] Simulate Token Use (Device++)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {hasToken && (
              <>
                {/* Recommended Players */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 lg:p-8 mt-6 lg:mt-4 shadow-xl">
                   <h2 className="text-2xl font-bold text-white mb-6">Recommended Players</h2>
                   <div className="grid grid-cols-1 gap-3">
                      <button className="w-full bg-[#1e293b]/60 hover:bg-[#1e293b] text-white font-bold py-4 rounded-xl transition-colors border border-slate-800 shadow-sm text-lg">NS Player</button>
                      <button className="w-full bg-[#1e293b]/60 hover:bg-[#1e293b] text-white font-bold py-4 rounded-xl transition-colors border border-slate-800 shadow-sm text-lg">OTT Navigator</button>
                      <button className="w-full bg-[#1e293b]/60 hover:bg-[#1e293b] text-white font-bold py-4 rounded-xl transition-colors border border-slate-800 shadow-sm text-lg">TiviMate</button>
                   </div>
                   <div className="mt-6 bg-[#1e293b]/40 rounded-xl p-5 border-l-4 border-l-slate-600">
                     <p className="text-slate-400 text-sm leading-relaxed">
                       <span className="font-bold text-slate-300">Note:</span> We cannot share direct application links due to copyright policies. These apps are freely available on the Play Store.
                     </p>
                   </div>
                </div>

                {/* Token Verification */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 lg:p-8 mt-6 shadow-xl mb-4">
                   <h2 className="text-2xl font-bold text-white mb-6">Token Verification</h2>
                   <div className="bg-[#161f30] rounded-2xl p-6 border border-slate-800/80 shadow-inner">
                      <div className="flex items-center gap-3 text-white font-bold mb-6 text-lg">
                         <Shield size={22} className="text-blue-400" />
                         Verify Your Token
                      </div>
                      {verifiedUsername ? (
                         <div className="bg-[#1e293b]/40 rounded-xl p-5 border border-green-500/50 flex flex-col items-center justify-center gap-4 text-center">
                            <CheckCircle2 size={40} className="text-green-500" />
                            <div>
                               <p className="text-white font-bold text-lg mb-1">Successfully Verified</p>
                               <p className="text-slate-400 font-mono">{verifiedUsername}</p>
                            </div>
                            <button 
                               onClick={() => setVerifiedUsername('')} 
                               className="mt-2 text-sm text-slate-400 hover:text-white underline transition-colors"
                            >
                               Change Username
                            </button>
                         </div>
                      ) : (
                         <div className="space-y-6">
                            <div>
                              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2.5 block">USERNAME</label>
                              <input 
                                type="text" 
                                value={verificationUsername}
                                onChange={e => setVerificationUsername(e.target.value)}
                                placeholder="Telegram or Discord username" 
                                className="w-full bg-[#111827] border border-slate-700/80 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 font-medium" 
                              />
                            </div>
                            <button 
                              onClick={async () => {
                                 if (verificationUsername.trim() && token && expiryTime) {
                                    try {
                                       await fetch('/api/tokens', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify({ token, expiryTime, username: verificationUsername.trim() })
                                       });
                                       setVerifiedUsername(verificationUsername.trim());
                                    } catch (e) {
                                       console.error("Error verifying username", e);
                                    }
                                 }
                              }}
                              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20 text-lg"
                            >
                               <CheckCircle2 size={22} />
                               Verify Username
                            </button>
                            <div className="bg-[#1e293b]/40 rounded-xl p-5 border-l-4 border-l-slate-600 mt-2">
                              <p className="text-slate-400 text-sm leading-relaxed">
                                <span className="font-bold text-slate-300">Tip:</span> Verification helps you recover your details if you lose access.
                              </p>
                            </div>
                         </div>
                      )}
                   </div>
                </div>
              </>
            )}
          </div>
        </div>
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
                onClick={async () => {
                  if (recoverTokenValue && recoverUsernameValue) {
                     try {
                        const res = await fetch('/api/recover', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ token: recoverTokenValue, username: recoverUsernameValue })
                        });
                        const data = await res.json();
                        if (data.success) {
                           setToken(recoverTokenValue);
                           setHasToken(true);
                           setActiveIps([]);
                           // Recover with new 24 hour expiry or existing one. We will just use 24 hours
                           const newExpiry = Date.now() + 24 * 60 * 60 * 1000;
                           setExpiryTime(newExpiry);
                           
                           await fetch('/api/tokens', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ token: recoverTokenValue, expiryTime: newExpiry, username: recoverUsernameValue })
                           });
                           
                           setIsRecoverModalOpen(false);
                           setRecoverTokenValue('');
                           setRecoverUsernameValue('');
                           setVerifiedUsername(recoverUsernameValue);
                        } else {
                           alert('Invalid token or username');
                        }
                     } catch(e) {
                        alert('Recovery failed. Invalid details or server error.');
                     }
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
