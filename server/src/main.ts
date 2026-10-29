// Moduł serwera Nakama dla Kuźni Legend (JavaScript runtime).
// Nakama szuka globalnej funkcji InitModule, a funkcje RPC muszą być globalnymi deklaracjami,
// rejestrowanymi wprost w InitModule — serwer odczytuje ich nazwy z kodu. Bundler (esbuild, format esm)
// zostawia funkcje z modułów jako deklaracje najwyższego poziomu, więc mogą mieszkać w osobnych plikach.
import { SAVE_VERSION } from '../../src/engine/state';
import { rpcArenaFight, rpcArenaList } from './arena';
import { chatBlock, chatJoin, chatSend, rpcChatDrop, rpcChatReport } from './chat';
import { blockGroupApi, rpcClanCreate, rpcClanInfo, rpcClanJoin, rpcClanLeave, rpcClanList, rpcClanManage, rpcClanSettings } from './clan';
import { rpcClanBossAttack, rpcClanDonate, rpcClanHelp, rpcClanHelpAsk, rpcClanOreAsk, rpcClanOreGive, rpcClanSync } from './clanlife';
import { SYSTEM_USER, signSecret, testSpeed } from './common';
import { rpcFeedback, rpcFeedbackList } from './feedback';
import { rpcNameSet } from './names';
import { rpcLegacy } from './legacy';
import { rpcReforge } from './runes';
import { rpcObiegSync } from './obieg';
import { rpcRaidAttack, rpcRaidState } from './raid';
import { createBoards, rpcRanking } from './ranking';
import { rpcSaveGet, rpcSavePut, rpcSeeds, rpcTime } from './save';
import { rpcAdReward, rpcIapGoogle, rpcIapTest, rpcPassBuy, rpcPassClaim, rpcShopBuy, rpcShopGift, rpcShopState, rpcSpeedup } from './shop';
import { rpcTransferCode, rpcTransferRedeem } from './transfer';
import { rpcWarAttack, rpcWarState, rpcWarTestClock } from './war';

/** Gracz nie zmienia nazwy konta bezpośrednio — nick nadaje serwer (name_set). */
function blockAccountApi(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, _data: nkruntime.UserUpdateAccount): nkruntime.UserUpdateAccount {
  throw { message: 'Nick zmienisz w Kodeksie gry.', code: 9 } as nkruntime.Error;
}

function InitModule(_ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer): void {
  createBoards(nk, logger);
  signSecret(nk); // sekret podpisów powstaje przy pierwszym starcie
  // Pusta lista blokad czatu — do edycji w konsoli Nakamy (Storage → chat / bans).
  if (!nk.storageRead([{ collection: 'chat', key: 'bans', userId: SYSTEM_USER }]).length) {
    nk.storageWrite([{ collection: 'chat', key: 'bans', userId: SYSTEM_USER, value: {}, permissionRead: 0, permissionWrite: 0 }]);
  }
  initializer.registerRpc('save_get', rpcSaveGet);
  initializer.registerRpc('save_put', rpcSavePut);
  initializer.registerRpc('seeds', rpcSeeds);
  initializer.registerRpc('time', rpcTime);
  initializer.registerRpc('ranking', rpcRanking);
  initializer.registerRpc('transfer_code', rpcTransferCode);
  initializer.registerRpc('transfer_redeem', rpcTransferRedeem);
  initializer.registerRpc('obieg_sync', rpcObiegSync);
  initializer.registerRpc('arena_list', rpcArenaList);
  initializer.registerRpc('arena_fight', rpcArenaFight);
  initializer.registerRpc('name_set', rpcNameSet);
  initializer.registerRpc('clan_list', rpcClanList);
  initializer.registerRpc('clan_create', rpcClanCreate);
  initializer.registerRpc('clan_join', rpcClanJoin);
  initializer.registerRpc('clan_leave', rpcClanLeave);
  initializer.registerRpc('clan_info', rpcClanInfo);
  initializer.registerRpc('clan_manage', rpcClanManage);
  initializer.registerRpc('clan_settings', rpcClanSettings);
  initializer.registerRpc('clan_sync', rpcClanSync);
  initializer.registerRpc('clan_donate', rpcClanDonate);
  initializer.registerRpc('clan_boss_attack', rpcClanBossAttack);
  initializer.registerRpc('clan_help_ask', rpcClanHelpAsk);
  initializer.registerRpc('clan_help', rpcClanHelp);
  initializer.registerRpc('clan_ore_ask', rpcClanOreAsk);
  initializer.registerRpc('clan_ore_give', rpcClanOreGive);
  initializer.registerRpc('war_state', rpcWarState);
  initializer.registerRpc('war_attack', rpcWarAttack);
  initializer.registerRpc('war_test_clock', rpcWarTestClock);
  initializer.registerRpc('raid_state', rpcRaidState);
  initializer.registerRpc('raid_attack', rpcRaidAttack);
  initializer.registerRpc('legacy', rpcLegacy);
  initializer.registerRpc('reforge', rpcReforge);
  initializer.registerRpc('shop_state', rpcShopState);
  initializer.registerRpc('shop_buy', rpcShopBuy);
  initializer.registerRpc('shop_gift', rpcShopGift);
  initializer.registerRpc('ad_reward', rpcAdReward);
  initializer.registerRpc('pass_buy', rpcPassBuy);
  initializer.registerRpc('pass_claim', rpcPassClaim);
  initializer.registerRpc('speedup', rpcSpeedup);
  initializer.registerRpc('iap_test', rpcIapTest);
  initializer.registerRpc('iap_google', rpcIapGoogle);
  initializer.registerRpc('chat_drop', rpcChatDrop);
  initializer.registerRpc('chat_report', rpcChatReport);
  initializer.registerRpc('feedback', rpcFeedback);
  initializer.registerRpc('feedback_list', rpcFeedbackList);
  // Czat: tylko dozwolone kanały, filtr i tryb wolny; bez edycji i usuwania wiadomości.
  initializer.registerRtBefore('ChannelJoin', chatJoin);
  initializer.registerRtBefore('ChannelMessageSend', chatSend);
  initializer.registerRtBefore('ChannelMessageUpdate', chatBlock);
  initializer.registerRtBefore('ChannelMessageRemove', chatBlock);
  // Klany tylko przez RPC gry.
  initializer.registerBeforeCreateGroup(blockGroupApi);
  initializer.registerBeforeUpdateGroup(blockGroupApi);
  initializer.registerBeforeDeleteGroup(blockGroupApi);
  initializer.registerBeforeJoinGroup(blockGroupApi);
  initializer.registerBeforeLeaveGroup(blockGroupApi);
  initializer.registerBeforeAddGroupUsers(blockGroupApi);
  initializer.registerBeforeBanGroupUsers(blockGroupApi);
  initializer.registerBeforeKickGroupUsers(blockGroupApi);
  initializer.registerBeforePromoteGroupUsers(blockGroupApi);
  initializer.registerBeforeDemoteGroupUsers(blockGroupApi);
  // Nick i nazwę konta zmienia tylko serwer.
  initializer.registerBeforeUpdateAccount(blockAccountApi);
  const speed = testSpeed(_ctx);
  logger.info('Kuźnia Legend: moduł serwera gotowy (zapis v%d, tempo testowe: %s)', SAVE_VERSION, speed > 1 ? 'do ×' + speed : 'wyłączone');
}

// Odwołanie, żeby bundler nie usunął nieeksportowanej funkcji startowej.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
!InitModule && InitModule.bind(null);
