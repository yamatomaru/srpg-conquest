/**
 * WalletPanel — MCH Verse ウォレット連携 & ヒーロー選択UI
 */
import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../game/store';
import {
  isMetaMaskAvailable,
  connectWallet,
  getChainId,
  switchToMchVerse,
  fetchHeroesByAddress,
  mchHeroToCharacter,
  MCH_CHAIN_ID,
  type MchHero,
} from '../lib/mchVerse';
import { JOBS } from '../data/jobs';
import type { Character } from '../game/types';

interface Props {
  onClose: () => void;
}

type Step = 'connect' | 'switching' | 'loading' | 'select' | 'error';

const RARITY_COLOR: Record<string, string> = {
  Legendary: '#f0c040',
  Epic:       '#a855f7',
  Rare:       '#3b82f6',
  Common:     '#6b7280',
};

export default function WalletPanel({ onClose }: Props) {
  const { nations, addMchHero } = useGameStore();
  const player = Object.values(nations).find((n) => n.isPlayer);

  const [step, setStep] = useState<Step>('connect');
  const [address, setAddress] = useState<string | null>(null);
  const [heroes, setHeroes] = useState<MchHero[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // 既にゲームに追加済みのMCHヒーローIDを初期化
  useEffect(() => {
    if (!player) return;
    const existing = new Set(
      player.characterIds
        .filter((id) => id.startsWith('mch-'))
        .map((id) => id.replace('mch-', ''))
    );
    setAddedIds(existing);
  }, [player]);

  // アカウント・チェーン変更を監視
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const onAccountsChanged = () => {
      setStep('connect');
      setAddress(null);
      setHeroes([]);
    };
    const onChainChanged = () => {
      setStep('connect');
      setAddress(null);
      setHeroes([]);
    };
    eth.on('accountsChanged', onAccountsChanged);
    eth.on('chainChanged', onChainChanged);
    return () => {
      eth.removeListener('accountsChanged', onAccountsChanged);
      eth.removeListener('chainChanged', onChainChanged);
    };
  }, []);

  const handleConnect = useCallback(async () => {
    if (!isMetaMaskAvailable()) {
      setErrorMsg('MetaMask がインストールされていません。\nhttps://metamask.io からインストールしてください。');
      setStep('error');
      return;
    }
    try {
      setLoadingMsg('ウォレットに接続中…');
      setStep('loading');
      const addr = await connectWallet();
      setAddress(addr);

      const chainId = await getChainId();
      if (chainId !== MCH_CHAIN_ID) {
        setStep('switching');
      } else {
        await loadHeroes(addr);
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? '接続に失敗しました。');
      setStep('error');
    }
  }, []);

  const handleSwitchNetwork = useCallback(async () => {
    try {
      setLoadingMsg('MCH Verse ネットワークに切替中…');
      setStep('loading');
      await switchToMchVerse();
      const chainId = await getChainId();
      if (chainId === MCH_CHAIN_ID && address) {
        await loadHeroes(address);
      } else {
        setErrorMsg('ネットワーク切替に失敗しました。MetaMask で手動で MCH Verse を選択してください。');
        setStep('error');
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'ネットワーク切替に失敗しました。');
      setStep('error');
    }
  }, [address]);

  const loadHeroes = async (addr: string) => {
    setLoadingMsg('ヒーローNFTを取得中…');
    setStep('loading');
    try {
      const list = await fetchHeroesByAddress(addr);
      setHeroes(list);
      setStep('select');
    } catch (e: any) {
      setErrorMsg(`ヒーロー取得に失敗しました。\n${e?.message ?? ''}`);
      setStep('error');
    }
  };

  const handleAddHero = useCallback((hero: MchHero) => {
    const character: Character = mchHeroToCharacter(hero);
    addMchHero(character);
    setAddedIds((prev) => new Set([...prev, hero.tokenId]));
  }, [addMchHero]);

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : '';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#111827', border: '2px solid #4b5563', borderRadius: 14,
          padding: '24px 28px', maxWidth: 660, width: '94%', maxHeight: '88vh',
          overflowY: 'auto', color: '#f9fafb', fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src="https://www.mycryptoheroes.net/images/mch_icon.png"
                alt="MCH"
                style={{ width: 28, height: 28, borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              MCH Verse ヒーロー連携
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              保有しているヒーローNFTをゲームに参戦させよう
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* ── ステップ: 接続 ── */}
        {step === 'connect' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦊</div>
            <div style={{ fontSize: 15, color: '#d1d5db', marginBottom: 8 }}>
              MetaMask ウォレットを接続して
            </div>
            <div style={{ fontSize: 15, color: '#d1d5db', marginBottom: 24 }}>
              MCH Verse のヒーローを確認します
            </div>
            {!isMetaMaskAvailable() && (
              <div style={{ fontSize: 12, color: '#f87171', marginBottom: 16 }}>
                ⚠️ MetaMask が検出されませんでした。
                <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', marginLeft: 4 }}>
                  インストールする
                </a>
              </div>
            )}
            <button
              onClick={handleConnect}
              style={{
                padding: '12px 32px', background: '#f59e0b', color: '#111',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 15, fontWeight: 'bold',
              }}
            >
              ウォレットに接続
            </button>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 12 }}>
              Chain: MCH Verse (Oasys L2 · Chain ID 29548) に自動切替します
            </div>
          </div>
        )}

        {/* ── ステップ: ネットワーク切替 ── */}
        {step === 'switching' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <div style={{ fontSize: 15, color: '#fbbf24', marginBottom: 8, fontWeight: 'bold' }}>
              MCH Verse に接続してください
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
              接続中アドレス: {shortAddr}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24 }}>
              現在のネットワークは MCH Verse ではありません。
              <br />下のボタンで自動切替します。
            </div>
            <button
              onClick={handleSwitchNetwork}
              style={{
                padding: '12px 28px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: 'bold',
              }}
            >
              MCH Verse に切替
            </button>
          </div>
        )}

        {/* ── ステップ: ローディング ── */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⚙️</div>
            <div style={{ fontSize: 14, color: '#9ca3af' }}>{loadingMsg}</div>
          </div>
        )}

        {/* ── ステップ: エラー ── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <div style={{ fontSize: 14, color: '#f87171', marginBottom: 24, whiteSpace: 'pre-wrap' }}>
              {errorMsg}
            </div>
            <button
              onClick={() => setStep('connect')}
              style={{
                padding: '10px 24px', background: '#374151', color: '#e5e7eb',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              やり直す
            </button>
          </div>
        )}

        {/* ── ステップ: ヒーロー選択 ── */}
        {step === 'select' && (
          <>
            {/* 接続情報バー */}
            <div style={{
              background: '#1f2937', borderRadius: 8, padding: '10px 14px',
              marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#22c55e' }}>● </span>
                <span style={{ color: '#9ca3af' }}>接続済み </span>
                <span style={{ color: '#f9fafb', fontFamily: 'monospace' }}>{shortAddr}</span>
              </div>
              <div style={{ fontSize: 12, color: '#fbbf24' }}>
                ヒーロー {heroes.length} 体
              </div>
            </div>

            {heroes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: 14 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🗡️</div>
                このウォレットにヒーローNFTが見つかりませんでした。
                <br />
                <a
                  href="https://www.mycryptoheroes.net/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60a5fa', fontSize: 12, marginTop: 8, display: 'inline-block' }}
                >
                  MCH でヒーローを入手する →
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {heroes.map((hero) => {
                  const char: Character = mchHeroToCharacter(hero);
                  const job = JOBS[char.jobId];
                  const isAdded = addedIds.has(hero.tokenId);
                  const rarityColor = RARITY_COLOR[hero.rarity] ?? '#6b7280';

                  return (
                    <div
                      key={hero.tokenId}
                      style={{
                        background: '#1f2937',
                        border: `1px solid ${rarityColor}55`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        opacity: isAdded ? 0.6 : 1,
                      }}
                    >
                      {/* ヒーロー画像 */}
                      <div style={{
                        width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                        background: rarityColor + '22',
                        border: `1px solid ${rarityColor}66`,
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {hero.imageUrl ? (
                          <img
                            src={hero.imageUrl}
                            alt={hero.heroTypeName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 24 }}>⚔️</span>
                        )}
                      </div>

                      {/* 情報 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div>
                            <span style={{ fontWeight: 'bold', fontSize: 14, color: '#f9fafb' }}>
                              {hero.heroTypeName}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>
                              #{hero.tokenId}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 'bold', color: rarityColor,
                            background: rarityColor + '22', borderRadius: 4,
                            padding: '1px 6px', flexShrink: 0,
                          }}>
                            {hero.rarity}
                          </span>
                        </div>

                        {/* MCH ステータス */}
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                          Lv.{hero.level}
                          <span style={{ marginLeft: 10 }}>HP {hero.hp}</span>
                          <span style={{ marginLeft: 8 }}>PHY {hero.physical}</span>
                          <span style={{ marginLeft: 8 }}>INT {hero.intelligence}</span>
                          <span style={{ marginLeft: 8 }}>AGI {hero.agility}</span>
                        </div>

                        {/* ゲーム変換後ステータス */}
                        <div style={{
                          background: '#0d1117', borderRadius: 6, padding: '6px 10px',
                          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
                          fontSize: 11,
                        }}>
                          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                            → {job?.name ?? char.jobId}
                          </span>
                          <span style={{ color: '#9ca3af' }}>Lv{char.level}</span>
                          <span style={{ color: '#f87171' }}>ATK{char.atk}</span>
                          <span style={{ color: '#60a5fa' }}>DEF{char.def}</span>
                          <span style={{ color: '#c084fc' }}>MATK{char.matk}</span>
                          <span style={{ color: '#34d399' }}>HP{char.maxHp}</span>
                          <span style={{ color: '#a3e635' }}>MOV{char.mov}</span>
                        </div>
                      </div>

                      {/* 追加ボタン */}
                      <div style={{ flexShrink: 0 }}>
                        {isAdded ? (
                          <div style={{
                            padding: '6px 12px', fontSize: 12,
                            color: '#22c55e', border: '1px solid #22c55e33',
                            borderRadius: 6, background: '#052e16',
                          }}>
                            ✓ 参戦中
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddHero(hero)}
                            style={{
                              padding: '6px 12px', fontSize: 12, fontWeight: 'bold',
                              background: rarityColor, color: '#111',
                              border: 'none', borderRadius: 6, cursor: 'pointer',
                            }}
                          >
                            参戦させる
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 注意書き */}
            <div style={{ marginTop: 16, fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
              ※ ヒーローのステータスはMCH Verseのオンチェーンデータを元に変換されます。<br />
              ※ 追加したヒーローは部隊一覧で確認できます。<br />
              ※ ゲームデータはブロックチェーンに書き込まれません。
            </div>
          </>
        )}
      </div>
    </div>
  );
}
