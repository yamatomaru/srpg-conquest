import { useState } from 'react';
import { useGameStore } from '../game/store';
import { NATIONS } from '../data/nations';
import { CHARACTERS } from '../data/characters';
import { useIsMobile } from '../hooks/useIsMobile';
import RandomMapSetup from './RandomMapSetup';

const FACTION_ICON: Record<string, string> = {
  '朱雀': '🦅', '青龍': '🐉', '玄武': '🐢', '黄竜': '🌟', '白虎': '🐯',
};

const FACTION_TRAIT: Record<string, string> = {
  '朱雀': '均衡した編成で柔軟に対応する万能型',
  '青龍': '魔術師が主力。爆発力は高いが耐久は低め',
  '玄武': '盾士を軸に守りを固める難攻不落の堅牢型',
  '黄竜': '槍士が中心。分散配置で戦線を広く保つ',
  '白虎': '弓師による速射で相手を崩す機動突破型',
};

const FACTION_AI: Record<string, string> = {
  '朱雀': 'AI：最弱敵を狙う柔軟攻勢',
  '青龍': 'AI：数的優位を確立してから攻撃',
  '玄武': 'AI：守備重視・確実な優位のみ攻撃',
  '黄竜': 'AI：前線に均等展開して圧力をかける',
  '白虎': 'AI：常に最弱敵へ速攻を仕掛ける',
};

const JOB_LABEL: Record<string, { short: string; color: string }> = {
  shielder: { short: '盾', color: '#60a5fa' },
  warrior:  { short: '戦', color: '#f87171' },
  spearman: { short: '槍', color: '#4ade80' },
  archer:   { short: '弓', color: '#facc15' },
  mage:     { short: '魔', color: '#c084fc' },
  knight:   { short: '騎', color: '#fb923c' },
  priest:   { short: '僧', color: '#f472b6' },
};

const JOB_ORDER = ['shielder', 'warrior', 'spearman', 'archer', 'mage', 'knight', 'priest'];

function getNationComposition(nationId: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const charId of NATIONS[nationId].characterIds) {
    const jobId = CHARACTERS[charId]?.jobId;
    if (jobId) counts[jobId] = (counts[jobId] ?? 0) + 1;
  }
  return counts;
}

export default function NationSelect() {
  const { selectNation, openCampaignSelect, openMapEditor } = useGameStore();
  const isMobile = useIsMobile();
  const [showRandomMap, setShowRandomMap] = useState(false);
  const nations = Object.values(NATIONS);

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0d1117', color: '#f9fafb', fontFamily: 'system-ui, sans-serif', gap: 32,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, margin: 0, color: '#f9fafb', letterSpacing: 4 }}>MyCryptoConquest</h1>
      </div>

      {/* モード選択 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'center', width: '90%', maxWidth: 700 }}>
        <div
          style={{
            background: '#1f2937', border: '2px solid #374151', borderRadius: 10,
            padding: '14px 20px', textAlign: 'center', flex: '1 1 160px', minWidth: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#f9fafb', marginBottom: 4 }}>⚔ フリープレイ</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>国家を選んで自由に遊ぶ</div>
          <div style={{ fontSize: 11, color: '#4b5563' }}>↓ 国家を選択</div>
        </div>
        <button
          onClick={openCampaignSelect}
          style={{
            background: '#1a1a2e', border: '2px solid #3b82f6', borderRadius: 10,
            padding: '14px 20px', textAlign: 'center', cursor: 'pointer', color: '#f9fafb',
            flex: '1 1 160px', minWidth: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#60a5fa', marginBottom: 4 }}>📜 キャンペーン</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>3章構成のストーリー<br />キャラLv引き継ぎあり</div>
          <div style={{ fontSize: 11, color: '#3b82f6' }}>→ 選択</div>
        </button>
        <button
          onClick={openMapEditor}
          style={{
            background: '#0d1a0d', border: '2px solid #22c55e', borderRadius: 10,
            padding: '14px 20px', textAlign: 'center', cursor: 'pointer', color: '#f9fafb',
            flex: '1 1 160px', minWidth: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#4ade80', marginBottom: 4 }}>🗺 マップエディタ</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>カスタムマップを作成</div>
          <div style={{ fontSize: 11, color: '#22c55e' }}>→ 開く</div>
        </button>
        <button
          onClick={() => setShowRandomMap(true)}
          style={{
            background: '#1a0d2e', border: '2px solid #8b5cf6', borderRadius: 10,
            padding: '14px 20px', textAlign: 'center', cursor: 'pointer', color: '#f9fafb',
            flex: '1 1 160px', minWidth: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#a78bfa', marginBottom: 4 }}>🎲 ランダムマップ</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>配置・収入をランダム生成<br />シード再利用で再現可能</div>
          <div style={{ fontSize: 11, color: '#8b5cf6' }}>→ 生成</div>
        </button>
      </div>
      {showRandomMap && <RandomMapSetup onClose={() => setShowRandomMap(false)} />}

      {/* フリープレイ国家選択 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: 12, maxWidth: 780, width: '90%',
        }}
      >
        {nations.map((nation) => {
          const comp = getNationComposition(nation.id);
          return (
            <button
              key={nation.id}
              onClick={() => selectNation(nation.id)}
              style={{
                background: '#1f2937', border: `2px solid ${nation.color}`, borderRadius: 10,
                padding: '16px 14px', cursor: 'pointer', color: '#f9fafb', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#374151';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#1f2937';
              }}
            >
              {/* ヘッダー */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{FACTION_ICON[nation.faction] ?? '⚔'}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: nation.color }}>{nation.name}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{nation.faction}勢力</div>
                </div>
              </div>

              {/* 兵種構成バー */}
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>兵種構成</div>
                <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  {JOB_ORDER.map((jobId) => {
                    const cnt = comp[jobId] ?? 0;
                    if (cnt === 0) return null;
                    const pct = (cnt / nation.characterIds.length) * 100;
                    return (
                      <div
                        key={jobId}
                        style={{ width: `${pct}%`, background: JOB_LABEL[jobId].color, opacity: 0.85 }}
                        title={`${JOB_LABEL[jobId].short}×${cnt}`}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {JOB_ORDER.filter((j) => (comp[j] ?? 0) > 0).map((jobId) => (
                    <span key={jobId} style={{ fontSize: 10, color: JOB_LABEL[jobId].color }}>
                      {JOB_LABEL[jobId].short}×{comp[jobId]}
                    </span>
                  ))}
                </div>
              </div>

              {/* 特徴・AI */}
              <div style={{ fontSize: 10, color: '#d1d5db', lineHeight: 1.5 }}>
                {FACTION_TRAIT[nation.faction]}
              </div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                {FACTION_AI[nation.faction]}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>
        ※ 同じ勢力のMyCryptoHeroesヒーローを傭兵として雇用できます
      </p>
    </div>
  );
}
