import { useState } from 'react';

const STORAGE_KEY = 'srpg-conquest-tutorial-done';

interface Step {
  title: string;
  body: string;
  highlight?: string; // CSS selector hint (description only)
}

const STEPS: Step[] = [
  {
    title: '⚔ ようこそ、SRPG Conquest へ',
    body: 'これは5つの国家が覇権を争うターン制ストラテジーゲームです。\n戦略マップで領地を管理し、戦術バトルで敵を打ち負かしましょう。',
  },
  {
    title: '🗺 戦略マップ',
    body: '領地をクリックして選択します。\n自国の領地を選ぶと「侵攻」「兵力移動」などのアクションが可能です。',
  },
  {
    title: '⚔ 侵攻',
    body: '自国の領地を選択し「侵攻」ボタンを押すと、隣接する敵領地に攻め込めます。\n兵力が多いほど勝率が上がります。',
  },
  {
    title: '🏰 戦術バトル',
    body: '侵攻すると戦術マップに切り替わります。\nユニットを移動・攻撃させて敵を全滅させましょう。\n各ユニットには固有のスキルがあります（スキルボタンで発動）。',
  },
  {
    title: '📈 レベルアップ',
    body: '戦闘でダメージを与えるとEXPを獲得します。\nEXPが一定値に達するとレベルアップし、全ステータスが成長します。\n高レベルのユニットを大切にしましょう。',
  },
  {
    title: '💰 ゴールドと傭兵',
    body: '毎ターン支配領地から収入を得ます。\nゴールドを使って傭兵を雇い、兵力を補充できます（「傭兵」パネル）。',
  },
  {
    title: '🤝 外交',
    body: '他国と同盟を結べます（「外交」パネル）。\n同盟中は互いに攻撃しません。不利な戦況を乗り切る戦略として活用できます。',
  },
  {
    title: '💾 セーブ',
    body: 'プレイ状況はいつでもセーブできます（「セーブ」ボタン）。\nレベルや経験値も保存されます。',
  },
  {
    title: '🏆 勝利条件',
    body: '全ての敵国を滅ぼすか、目標を達成すれば勝利です。\nキャンペーンモードでは章ごとにキャラクターが引き継がれます。\n\nさあ、天下統一を目指しましょう！',
  },
];

interface Props {
  onDone: () => void;
}

export default function Tutorial({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      onDone();
    }
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onDone();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: '#1f2937',
          border: '1px solid #4b5563',
          borderRadius: 12,
          padding: '32px 36px',
          maxWidth: 480,
          width: '90vw',
          color: '#f9fafb',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* ステップインジケーター */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? '#3b82f6' : i < step ? '#1d4ed8' : '#374151',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* タイトル */}
        <h2 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 'bold' }}>{current.title}</h2>

        {/* 本文 */}
        <p style={{ margin: '0 0 28px', fontSize: 16, lineHeight: 1.7, color: '#d1d5db', whiteSpace: 'pre-line' }}>
          {current.body}
        </p>

        {/* ボタン */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={skip}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}
          >
            スキップ
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{step + 1} / {STEPS.length}</span>
            <button
              onClick={next}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {step < STEPS.length - 1 ? '次へ →' : '始める！'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}
