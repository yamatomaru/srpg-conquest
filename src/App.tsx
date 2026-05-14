import { useState } from 'react';
import { useGameStore } from './game/store';
import { useIsMobile } from './hooks/useIsMobile';
import NationSelect from './components/NationSelect';
import CampaignSelect from './components/CampaignSelect';
import CampaignBriefing from './components/CampaignBriefing';
import CampaignDebrief from './components/CampaignDebrief';
import MapEditor from './components/MapEditor';
import StrategicMap from './components/StrategicMap';
import TerritoryDetail from './components/TerritoryDetail';
import MarchPlanPanel from './components/MarchPlanPanel';
import TurnControl from './components/TurnControl';
import GameOverModal from './components/GameOverModal';
import TacticalControl from './components/TacticalControl';
import TacticalMap from './components/TacticalMap';
import BattleLog from './components/BattleLog';
import InvasionPanel from './components/InvasionPanel';
import InitiativeBar from './components/InitiativeBar';
import TransferPanel from './components/TransferPanel';
import EventModal from './components/EventModal';
import TroopsList from './components/TroopsList';
import DiplomacyPanel from './components/DiplomacyPanel';
import MercenaryPanel from './components/MercenaryPanel';
import ObjectivesPanel from './components/ObjectivesPanel';
import SimulationPanel from './components/SimulationPanel';
import RecruitPanel from './components/RecruitPanel';
import ShopPanel from './components/ShopPanel';
import AchievementsPanel from './components/AchievementsPanel';
import AchievementToast from './components/AchievementToast';
import TerrainLegend from './components/TerrainLegend';
import Tutorial, { shouldShowTutorial } from './components/Tutorial';

export default function App() {
  const { phase, ui } = useGameStore();
  const isMobile = useIsMobile();
  const [showTutorial, setShowTutorial] = useState(() => shouldShowTutorial());

  if (phase === 'setup') return (
    <>
      <NationSelect />
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
    </>
  );
  if (phase === 'campaign_select') return <CampaignSelect />;
  if (phase === 'campaign_briefing') return <CampaignBriefing />;
  if (phase === 'campaign_debrief') return <CampaignDebrief />;
  if (phase === 'map_editor') return <MapEditor />;

  if (phase === 'tactical') {
    return (
      <div
        style={{
          fontFamily: 'system-ui, sans-serif',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#111827',
          color: '#f9fafb',
        }}
      >
        <TacticalControl />
        <InitiativeBar />
        <TacticalMap />
        <TerrainLegend />
        <BattleLog />
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#111827',
        color: '#f9fafb',
      }}
    >
      <TurnControl />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* メインマップエリア */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px 4px' : 16 }}>
            <StrategicMap />
          </div>
          <ObjectivesPanel />
          {/* モバイル: 領地詳細をマップ下に表示 */}
          {isMobile && (
            <div style={{ borderTop: '1px solid #374151' }}>
              <TerritoryDetail />
              <MarchPlanPanel />
            </div>
          )}
        </div>

        {/* 右サイドバー: 領地詳細（デスクトップのみ） */}
        {!isMobile && (
          <div style={{ width: 270, borderLeft: '1px solid #374151', overflowY: 'auto', flexShrink: 0 }}>
            <TerritoryDetail />
            <MarchPlanPanel />
          </div>
        )}
      </div>

      {/* モーダル・パネル */}
      <GameOverModal />
      <InvasionPanel />
      <TransferPanel />
      <EventModal />
      <RecruitPanel />
      {ui.activePanel === 'troops' && <TroopsList />}
      {ui.activePanel === 'diplomacy' && <DiplomacyPanel />}
      {ui.activePanel === 'mercenary' && <MercenaryPanel />}
      {ui.activePanel === 'simulation' && <SimulationPanel />}
      {ui.activePanel === 'shop' && <ShopPanel />}
      {ui.activePanel === 'achievements' && <AchievementsPanel />}
      <AchievementToast />
    </div>
  );
}
