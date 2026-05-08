import type { Campaign } from '../game/types';

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign_main',
    title: '天下統一への道',
    description: '一介の武将から始まり、三つの章を経て大陸を統一せよ。各章でキャラクターのレベルが引き継がれる。',
    scenarios: [
      {
        id: 'sc_01',
        chapter: 1,
        title: '序章：旗揚げ',
        description: '本拠地のみから出発し、隣接する二国を撃退せよ。',
        briefing:
          'かつて栄えたこの地に、再び戦乱の嵐が吹き荒れている。\n' +
          'あなたは本拠地ひとつを守るだけの小勢力だ。\n' +
          '今こそ旗揚げの時。まず近隣の二国を退け、足場を固めよ。\n\n' +
          '【勝利条件】青龍魔導院と玄武氏族を打ち倒せ\n' +
          '【敗北条件】自国の本拠地を失う',
        playerTerritoryIds: ['alba5'],   // 本拠地のみ
        playerGold: 300,
        victory: {
          type: 'defeat_all',
          description: '青龍魔導院と玄武氏族を滅ぼせ',
        },
        rewards: { goldBonus: 200, expBonus: 50 },
      },
      {
        id: 'sc_02',
        chapter: 2,
        title: '第一章：大同盟',
        description: '三国が同盟を結びプレイヤーに総攻撃を仕掛けてきた。8領地以上を確保して生き残れ。',
        briefing:
          '序章の勝利を見た諸国は危機感を覚え、大同盟を締結した。\n' +
          '四方から押し寄せる敵軍——だが我が軍の武将は確実に力をつけている。\n' +
          '40ヶ月間、8領地以上を維持し同盟を瓦解させよ。\n\n' +
          '【勝利条件】月40までに8領地以上を保持したまま生き残る\n' +
          '【敗北条件】自国の本拠地を失う',
        playerTerritoryIds: ['alba5', 'alba4', 'alba2', 'alba1'],  // 本拠地＋3
        playerGold: 400,
        victory: {
          type: 'survive_turns',
          turns: 40,
          count: 8,
          description: '月40まで8領地以上を保持して生き残れ',
        },
        rewards: { goldBonus: 400, expBonus: 100 },
      },
      {
        id: 'sc_03',
        chapter: 3,
        title: '第二章：天下統一',
        description: '最終決戦。全ての国家の首都を制圧し、天下を統一せよ。',
        briefing:
          '長き戦乱の時代もいよいよ終わりを迎えようとしている。\n' +
          '我が軍は大陸の半分以上を支配下に置いた。\n' +
          '残るは各国の本拠地のみ——全てを落とし、真の天下統一を成し遂げよ。\n\n' +
          '【勝利条件】全国家の首都（本拠地）を制圧する\n' +
          '【敗北条件】自国の本拠地を失う',
        playerTerritoryIds: [
          'alba5', 'alba4', 'alba3', 'alba2', 'alba1',
          'vies1', 'vies2', 'nord1', 'nord2',
        ],
        playerGold: 600,
        victory: {
          type: 'defeat_all',
          description: '全ての国家を滅ぼせ',
        },
        rewards: { goldBonus: 0, expBonus: 0 },
      },
    ],
  },
];

export const DEFAULT_CAMPAIGN = CAMPAIGNS[0];
