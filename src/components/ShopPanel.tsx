import { useState } from 'react';
import { useGameStore } from '../game/store';
import { ITEMS, ITEM_ID_ORDER, bonusText, SLOT_LABEL } from '../data/items';
import type { ItemSlot } from '../data/items';

const SLOT_ORDER: ItemSlot[] = ['weapon', 'armor', 'accessory'];
const SLOT_ICON: Record<ItemSlot, string> = { weapon: '⚔', armor: '🛡', accessory: '💍' };

const CATEGORY_COLOR: Record<ItemSlot, string> = {
  weapon: '#ef4444',
  armor: '#3b82f6',
  accessory: '#a855f7',
};

type Tab = 'shop' | 'equip';

export default function ShopPanel() {
  const {
    nations, characters, playerInventory,
    buyItem, sellItem, equipItem, unequipItem,
    togglePanel,
  } = useGameStore();

  const [tab, setTab] = useState<Tab>('shop');
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ItemSlot | null>(null);

  const player = Object.values(nations).find((n) => n.isPlayer)!;
  const playerChars = Object.values(characters).filter((c) => player.characterIds.includes(c.id) && c.hp > 0);

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => { setTab(t); setSelectedSlot(null); }}
      style={{
        padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
        background: tab === t ? '#1d4ed8' : '#374151',
        color: tab === t ? '#fff' : '#9ca3af',
        borderRadius: '6px 6px 0 0',
      }}
    >{label}</button>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('shop'); }}
    >
      <div style={{
        background: '#111827', border: '1px solid #374151', borderRadius: 12,
        width: 640, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        color: '#f9fafb', overflow: 'hidden',
      }}>
        {/* ヘッダー */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>⚔ 装備屋</span>
            <span style={{ marginLeft: 16, color: '#fbbf24', fontSize: 15 }}>所持金: ¥{player.gold.toLocaleString()}</span>
          </div>
          <button onClick={() => togglePanel('shop')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280', padding: 0 }}>×</button>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 16px 0', flexShrink: 0 }}>
          {tabBtn('shop', '🛒 購入・売却')}
          {tabBtn('equip', '🗡 装備管理')}
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ── 購入・売却タブ ── */}
          {tab === 'shop' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {SLOT_ORDER.map((slot) => (
                <div key={slot} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: CATEGORY_COLOR[slot], fontWeight: 'bold', marginBottom: 8 }}>
                    {SLOT_ICON[slot]} {SLOT_LABEL[slot]}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ITEM_ID_ORDER.filter((id) => ITEMS[id].slot === slot).map((id) => {
                      const item = ITEMS[id];
                      const owned = playerInventory[id] ?? 0;
                      const canBuy = player.gold >= item.cost;
                      return (
                        <div key={id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px',
                          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
                        }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#e5e7eb' }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{item.description}</div>
                            <div style={{ fontSize: 11, color: CATEGORY_COLOR[slot], marginTop: 2 }}>{bonusText(item.bonus)}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 'bold' }}>¥{item.cost}</div>
                            {owned > 0 && <div style={{ fontSize: 11, color: '#34d399' }}>所持: {owned}</div>}
                            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                              <button
                                onClick={() => buyItem(id)}
                                disabled={!canBuy}
                                style={{
                                  padding: '4px 10px', fontSize: 12, fontWeight: 'bold',
                                  background: canBuy ? '#15803d' : '#374151',
                                  color: '#fff', border: 'none', borderRadius: 4,
                                  cursor: canBuy ? 'pointer' : 'default',
                                  opacity: canBuy ? 1 : 0.45,
                                }}
                              >購入</button>
                              {owned > 0 && (
                                <button
                                  onClick={() => sellItem(id)}
                                  style={{
                                    padding: '4px 10px', fontSize: 12, fontWeight: 'bold',
                                    background: '#92400e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
                                  }}
                                >¥{item.sellPrice}</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 装備管理タブ ── */}
          {tab === 'equip' && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* 左: キャラ選択 */}
              <div style={{ width: 170, borderRight: '1px solid #374151', overflowY: 'auto', padding: 10 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>キャラクター</div>
                {playerChars.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => { setSelectedChar(ch.id); setSelectedSlot(null); }}
                    style={{
                      padding: '8px 10px', borderRadius: 6, marginBottom: 4, cursor: 'pointer',
                      background: selectedChar === ch.id ? '#1d4ed8' : '#1f2937',
                      border: `1px solid ${selectedChar === ch.id ? '#3b82f6' : '#374151'}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: '#e5e7eb' }}>{ch.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {ch.equippedWeaponId ? `⚔${ITEMS[ch.equippedWeaponId]?.name ?? '?'}` : '⚔ なし'}
                    </div>
                  </div>
                ))}
              </div>

              {/* 中央: 装備スロット */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {!selectedChar ? (
                  <div style={{ color: '#6b7280', fontSize: 14, marginTop: 20, textAlign: 'center' }}>
                    ← キャラクターを選択
                  </div>
                ) : (() => {
                  const ch = characters[selectedChar];
                  return (
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#e5e7eb' }}>
                        {ch.name} の装備
                      </div>
                      {/* ステータス */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: 12, marginBottom: 14 }}>
                        {[['ATK', ch.atk, '#f87171'], ['DEF', ch.def, '#60a5fa'], ['MATK', ch.matk, '#c084fc'],
                          ['MDEF', ch.mdef, '#7dd3fc'], ['MOV', ch.mov, '#34d399'], ['RNG', ch.range, '#fbbf24']
                        ].map(([l, v, c]) => (
                          <div key={l as string} style={{ background: '#0d1117', borderRadius: 4, padding: '3px 6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>{l}</span>
                            <span style={{ color: c as string, fontWeight: 'bold' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {/* スロット */}
                      {SLOT_ORDER.map((slot) => {
                        const equippedId =
                          slot === 'weapon' ? ch.equippedWeaponId :
                          slot === 'armor'  ? ch.equippedArmorId  :
                                              ch.equippedAccessoryId;
                        const equipped = equippedId ? ITEMS[equippedId] : null;
                        const isSelected = selectedSlot === slot;
                        return (
                          <div key={slot} style={{ marginBottom: 10 }}>
                            <div
                              onClick={() => setSelectedSlot(isSelected ? null : slot)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                background: isSelected ? '#1e3a5f' : '#1f2937',
                                border: `1px solid ${isSelected ? '#3b82f6' : '#374151'}`,
                              }}
                            >
                              <span style={{ color: CATEGORY_COLOR[slot], fontSize: 18 }}>{SLOT_ICON[slot]}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{SLOT_LABEL[slot]}</div>
                                {equipped ? (
                                  <div style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 'bold' }}>
                                    {equipped.icon} {equipped.name}
                                    <span style={{ color: CATEGORY_COLOR[slot], fontSize: 11, marginLeft: 6 }}>
                                      {bonusText(equipped.bonus)}
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 13, color: '#4b5563' }}>なし</div>
                                )}
                              </div>
                              {equipped && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); unequipItem(ch.id, slot); }}
                                  style={{ padding: '3px 8px', fontSize: 11, background: '#4b5563', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >外す</button>
                              )}
                            </div>
                            {/* インベントリからの選択 */}
                            {isSelected && (
                              <div style={{ padding: '8px 12px', background: '#0d1117', borderRadius: '0 0 8px 8px', borderTop: 'none' }}>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>所持品から装備:</div>
                                {ITEM_ID_ORDER.filter((id) => {
                                  const it = ITEMS[id];
                                  return it.slot === slot && (playerInventory[id] ?? 0) > 0;
                                }).length === 0 ? (
                                  <div style={{ fontSize: 12, color: '#4b5563' }}>
                                    該当アイテムがありません（装備屋で購入してください）
                                  </div>
                                ) : (
                                  ITEM_ID_ORDER.filter((id) => {
                                    const it = ITEMS[id];
                                    return it.slot === slot && (playerInventory[id] ?? 0) > 0;
                                  }).map((id) => {
                                    const it = ITEMS[id];
                                    return (
                                      <div
                                        key={id}
                                        onClick={() => { equipItem(ch.id, id); setSelectedSlot(null); }}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 8,
                                          padding: '5px 8px', borderRadius: 6, marginBottom: 4, cursor: 'pointer',
                                          background: '#1f2937',
                                          border: '1px solid #374151',
                                        }}
                                      >
                                        <span style={{ fontSize: 18 }}>{it.icon}</span>
                                        <div style={{ flex: 1 }}>
                                          <span style={{ fontSize: 13, color: '#e5e7eb' }}>{it.name}</span>
                                          <span style={{ fontSize: 11, color: CATEGORY_COLOR[slot], marginLeft: 8 }}>{bonusText(it.bonus)}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: '#34d399' }}>×{playerInventory[id]}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
