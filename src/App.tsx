import React, { useEffect, useState } from 'react';
import { Activity, Layers, Package, Globe, Cloud, UserCheck, Timer, GitPullRequest } from 'lucide-react';
import { OsiView } from './views/OsiView';
import { PacketView } from './views/PacketView';
import { TopologyView } from './views/TopologyView';
import { IdentityView } from './views/IdentityView';
import { TimelineView } from './views/TimelineView';
import { ISP_NODES } from './data/isp';
import { CLOUD_NODES } from './data/cloud';

const TABS = [
  { id: 'osi', label: 'OSI Stack', icon: Layers },
  { id: 'packet', label: 'Packet Anatomy', icon: Package },
  { id: 'isp', label: 'ISP & Last Mile', icon: Globe },
  { id: 'cloud', label: 'Cloud Topology', icon: Cloud },
  { id: 'identity', label: 'Identity & SSO', icon: UserCheck },
  { id: 'timeline', label: 'Request Timeline', icon: Timer },
] as const;

type TabId = (typeof TABS)[number]['id'];

function tabFromHash(): TabId {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.id === h)?.id ?? 'osi') as TabId;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(tabFromHash);

  // Keep the tab in the URL so links like .../#identity can be shared.
  useEffect(() => {
    const onHash = () => setActiveTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-300 font-sans selection:bg-sky-500/30 flex flex-col">
      <header className="px-5 sm:px-8 py-4 border-b border-slate-800/80 bg-[#0c121e] flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 via-sky-500 to-teal-400 p-2.5 rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.2)] border border-white/10 shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">Enterprise Network, OSI & Identity Explorer</h1>
            <p className="text-[10px] text-sky-400 font-bold tracking-[0.2em] mt-0.5">YOUR COMPUTER TO YOUR APPLICATION SERVER</p>
          </div>
        </div>
        <nav className="flex bg-[#070b12] p-1.5 rounded-lg border border-slate-800 shadow-inner flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`px-3 py-2 rounded-md text-[12px] font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#1e293b] text-white shadow-md border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <a
            href="https://github.com/Omer-Rahmany/network-topology"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-md text-[12px] font-bold transition-all flex items-center gap-2 text-sky-400 hover:text-sky-300 hover:bg-slate-800/50"
          >
            <GitPullRequest className="w-4 h-4" /> Contribute
          </a>
        </nav>
      </header>

      <main className="flex-1 flex min-w-0">
        {activeTab === 'osi' && <OsiView />}
        {activeTab === 'packet' && <PacketView />}
        {activeTab === 'isp' && (
          <TopologyView
            key="isp"
            nodes={ISP_NODES}
            intro="The physical and routing path from your desk to your app's front door: through your router, the ISP's fiber access network, its backbone, and a peering exchange to the app's anycast edge."
          />
        )}
        {activeTab === 'cloud' && (
          <TopologyView
            key="cloud"
            nodes={CLOUD_NODES}
            intro="What happens once the request reaches your platform: name resolution, edge security, load balancing, Kubernetes, the service mesh, your code, and the identity it uses to reach the database."
          />
        )}
        {activeTab === 'identity' && <IdentityView />}
        {activeTab === 'timeline' && <TimelineView />}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #070b12;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}} />
    </div>
  );
}
