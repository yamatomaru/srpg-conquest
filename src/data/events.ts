import type { GameState, GameEvent } from '../game/types';

interface EventDef {
  title: string;
  weight: number; // relative probability
  generate: (state: GameState) => { description: string; effectDesc: string; apply: (s: GameState) => Partial<GameState> };
}

const EVENT_DEFS: EventDef[] = [
  {
    title: '豊作の便り',
    weight: 20,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const bonus = 80 + Math.floor(Math.random() * 60);
      return {
        description: '作物が豊かに実り、領民から税収が増加した。',
        effectDesc: `¥${bonus} の臨時収入`,
        apply: (s) => ({
          nations: { ...s.nations, [player.id]: { ...s.nations[player.id], gold: s.nations[player.id].gold + bonus } },
        }),
      };
    },
  },
  {
    title: '盗賊団の襲来',
    weight: 12,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const loss = 50 + Math.floor(Math.random() * 60);
      return {
        description: '盗賊団が辺境の街道を荒らし、商人が逃げ出した。',
        effectDesc: `¥${loss} の損失`,
        apply: (s) => ({
          nations: { ...s.nations, [player.id]: { ...s.nations[player.id], gold: Math.max(0, s.nations[player.id].gold - loss) } },
        }),
      };
    },
  },
  {
    title: '英雄の目覚め',
    weight: 10,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const charIds = player.characterIds.filter((id) => state.characters[id]?.hp > 0);
      if (charIds.length === 0) return { description: '特に変化はなかった。', effectDesc: 'なし', apply: () => ({}) };
      const gainPerChar = 30;
      return {
        description: '兵士たちが修練に励み、実力を高めた。',
        effectDesc: `全兵士 +${gainPerChar} EXP`,
        apply: (s) => {
          const newChars = { ...s.characters };
          charIds.forEach((id) => {
            let ch = { ...newChars[id], exp: newChars[id].exp + gainPerChar };
            const thr = ch.level * 100;
            if (ch.exp >= thr) {
              ch = { ...ch, exp: ch.exp - thr, level: ch.level + 1, maxHp: ch.maxHp + 3, atk: ch.atk + 1, def: ch.def + 1, matk: ch.matk + 1, mdef: ch.mdef + 1 };
            }
            newChars[id] = ch;
          });
          return { characters: newChars };
        },
      };
    },
  },
  {
    title: '疫病の流行',
    weight: 10,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const charIds = player.characterIds.filter((id) => state.characters[id]?.hp > 0);
      return {
        description: '疫病が領内に広がり、兵士たちの体力が奪われた。',
        effectDesc: '全兵士 HP -20%',
        apply: (s) => {
          const newChars = { ...s.characters };
          charIds.forEach((id) => {
            const ch = newChars[id];
            const newHp = Math.max(1, Math.floor(ch.hp * 0.8));
            newChars[id] = { ...ch, hp: newHp };
          });
          return { characters: newChars };
        },
      };
    },
  },
  {
    title: '交易路の開通',
    weight: 15,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const bonus = 120 + Math.floor(Math.random() * 80);
      return {
        description: '新たな交易路が開通し、商業が活性化した。',
        effectDesc: `¥${bonus} の臨時収入`,
        apply: (s) => ({
          nations: { ...s.nations, [player.id]: { ...s.nations[player.id], gold: s.nations[player.id].gold + bonus } },
        }),
      };
    },
  },
  {
    title: '名将の薫陶',
    weight: 8,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const charIds = player.characterIds.filter((id) => state.characters[id]?.hp > 0);
      if (charIds.length === 0) return { description: '特に変化はなかった。', effectDesc: 'なし', apply: () => ({}) };
      // Pick 1-3 random chars for big EXP
      const chosen = [...charIds].sort(() => Math.random() - 0.5).slice(0, Math.min(3, charIds.length));
      const gain = 60;
      return {
        description: '優れた将軍が選ばれた精鋭を鍛え上げた。',
        effectDesc: `精鋭${chosen.length}名 +${gain} EXP`,
        apply: (s) => {
          const newChars = { ...s.characters };
          chosen.forEach((id) => {
            let ch = { ...newChars[id], exp: newChars[id].exp + gain };
            const thr = ch.level * 100;
            if (ch.exp >= thr) {
              ch = { ...ch, exp: ch.exp - thr, level: ch.level + 1, maxHp: ch.maxHp + 3, atk: ch.atk + 1, def: ch.def + 1, matk: ch.matk + 1, mdef: ch.mdef + 1 };
            }
            newChars[id] = ch;
          });
          return { characters: newChars };
        },
      };
    },
  },
  {
    title: '大雨と洪水',
    weight: 8,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const loss = 60 + Math.floor(Math.random() * 40);
      return {
        description: '大雨が降り続き、農地と街道が浸水した。',
        effectDesc: `¥${loss} の損失`,
        apply: (s) => ({
          nations: { ...s.nations, [player.id]: { ...s.nations[player.id], gold: Math.max(0, s.nations[player.id].gold - loss) } },
        }),
      };
    },
  },
  {
    title: '民の祝賀',
    weight: 6,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const charIds = player.characterIds.filter((id) => state.characters[id]?.hp > 0);
      return {
        description: '領民が感謝を示し、傷ついた兵士たちを手厚く看護した。',
        effectDesc: '全兵士 HP +30% 回復',
        apply: (s) => {
          const newChars = { ...s.characters };
          charIds.forEach((id) => {
            const ch = newChars[id];
            const healed = Math.min(ch.maxHp, ch.hp + Math.ceil(ch.maxHp * 0.3));
            newChars[id] = { ...ch, hp: healed };
          });
          return { characters: newChars };
        },
      };
    },
  },
  {
    title: '諜報の成果',
    weight: 6,
    generate: (state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const bonus = 100 + Math.floor(Math.random() * 100);
      return {
        description: '諜報網が敵国の財宝の隠し場所を突き止め、奪取に成功した。',
        effectDesc: `¥${bonus} の財宝獲得`,
        apply: (s) => ({
          nations: { ...s.nations, [player.id]: { ...s.nations[player.id], gold: s.nations[player.id].gold + bonus } },
        }),
      };
    },
  },
  {
    title: '静かな一月',
    weight: 5,
    generate: () => ({
      description: '特に大きな出来事もなく、月が過ぎていった。',
      effectDesc: 'なし',
      apply: () => ({}),
    }),
  },
];

export function generateRandomEvent(state: GameState): { event: GameEvent; patch: Partial<GameState> } {
  const totalWeight = EVENT_DEFS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  let def = EVENT_DEFS[EVENT_DEFS.length - 1];
  for (const d of EVENT_DEFS) {
    r -= d.weight;
    if (r <= 0) { def = d; break; }
  }
  const { description, effectDesc, apply } = def.generate(state);
  return {
    event: { title: def.title, description, effectDesc },
    patch: apply(state),
  };
}
