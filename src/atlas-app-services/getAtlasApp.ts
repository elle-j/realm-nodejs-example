import Realm from 'realm';
import { Logger } from '../logger';
import { ATLAS_APP_ID } from './config';

export class AtlasApp {
  app: Realm.App;
  constructor() {
    // Using log level 'all', 'trace', or 'debug' is good for debugging during developing.
    // Lower log levels are recommended in production for performance improvement.
    // See:
    // * https://www.mongodb.com/docs/realm/sdk/node/examples/sync-changes-between-devices/#set-the-client-log-level
    // * https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.App.Sync.html#.setLogLevel
    this.app = new Realm.App({ id: ATLAS_APP_ID });

    const logLevels = ['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off'];
    Realm.App.Sync.setLogLevel(this.app, 'debug');
    Realm.App.Sync.setLogger(this.app, (numericLevel, message) => {
      Logger.info(`Log level: ${logLevels[numericLevel]} - Log message: ${message}`);
    });
  }
}
