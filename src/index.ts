import { APP_VERSION, BACKUP_REALM_PATH, CONNECT_OFFLINE, DB_BACKUP_FREQUENCY_IN_HOURS, DB_SEED } from './atlas-app-services/config';
import { pruneOldNRealmFiles } from './atlas-app-services/utils';
import { getAccessToken } from './auth0.provider';
import { Logger } from './logger';
import { getRealm, logIn, openRealm } from './realm-connection';
import { RealmQuery } from './realm-query';
import { RealmMock } from './realm.mock';

export class Main {
  realmQuery: RealmQuery;
  realmMock: RealmMock;

  constructor() {
    this.realmQuery = new RealmQuery();
    this.realmMock = new RealmMock();
  }

  public main = async () => {

    const accessToken = await getAccessToken();

    let success: Realm.User | boolean = await logIn(accessToken);
    if (!success) {
      return;
    }

    await openRealm();

    // Only seed the database if the flag is set to true in config
    if (DB_SEED) {
      // Cleaning the DB before continuing.
      this.realmMock.deleteDummyData();
      this.realmMock.addDummyData();
      this.realmMock.updateDummyData();
    }

    /* 
    Only perform backup of the realm database if the realm is connected in sync mode. Otherwise backing up a 
    local database doesn't makes any sense. So based on the `CONNECT_OFFLINE` flag, the backup function performs 
    regular backups
    */
    if (!CONNECT_OFFLINE) {
      const wait = (seconds: number) => new Promise(r => setTimeout(r, (seconds * 1000)));

      (async _backup => {
        while (true) {
          let BACKUP_REALM_FILE_PATH = `${BACKUP_REALM_PATH}/realm-${APP_VERSION}-${new Date().getMilliseconds()}-${new Date().getDay()}-${new Date().getHours()}.realm`
          Logger.info(`Backing Up Realm Database in path: ${BACKUP_REALM_FILE_PATH}`);
          const config: Realm.Configuration = {
            path: BACKUP_REALM_FILE_PATH
          };
          const realm = getRealm();
          // Write the realm copy to a specific path
          realm.writeCopyTo(config);

          /*
          Prune old versions of local realm on regular backup intervals, when the max number of local realm files
          already exists, clear the older ones
          */
          pruneOldNRealmFiles();
          const BACKUP_SECONDS: number = DB_BACKUP_FREQUENCY_IN_HOURS * 60 * 60;
          // Keep running this function based on the number of hours set in the configuration `config.ts`
          await wait(BACKUP_SECONDS);
        }
      })();
    }
  };
}

new Main().main();
