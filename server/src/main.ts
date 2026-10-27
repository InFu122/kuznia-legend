// Moduł serwera Nakama dla Kuźni Legend (JavaScript runtime).
// Nakama szuka globalnej funkcji InitModule, a funkcje RPC muszą być globalnymi deklaracjami,
// rejestrowanymi wprost w InitModule — serwer odczytuje ich nazwy z kodu. Bundler (esbuild, format esm)
// zostawia funkcje z modułów jako deklaracje najwyższego poziomu, więc mogą mieszkać w osobnych plikach.
import { SAVE_VERSION } from '../../src/engine/state';
import { rpcArenaFight, rpcArenaList } from './arena';
import { signSecret } from './common';
import { rpcObiegSync } from './obieg';
import { createBoards, rpcRanking } from './ranking';
import { rpcSaveGet, rpcSavePut, rpcSeeds, rpcTime } from './save';
import { rpcTransferCode, rpcTransferRedeem } from './transfer';

function InitModule(_ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer): void {
  createBoards(nk, logger);
  signSecret(nk); // sekret podpisów powstaje przy pierwszym starcie
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
  logger.info('Kuźnia Legend: moduł serwera gotowy (zapis v%d)', SAVE_VERSION);
}

// Odwołanie, żeby bundler nie usunął nieeksportowanej funkcji startowej.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
!InitModule && InitModule.bind(null);
