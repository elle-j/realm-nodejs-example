const Realm = require('realm');

const { ATLAS_APP_ID } = require('./config');
const { logger } = require('../logger');

let app;

exports.getAtlasApp = function getAtlasApp() {
  if (!app) {
    app = new Realm.App({ id: ATLAS_APP_ID });

    // Using log level 'all', 'trace', or 'debug' is good for debugging during developing.
    // Lower log levels are recommended in production for performance improvement.
    // See:
    // * https://www.mongodb.com/docs/realm/sdk/node/examples/sync-changes-between-devices/#set-the-client-log-level
    // * https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.App.Sync.html#.setLogLevel
    const logLevels = ['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off'];
    Realm.App.Sync.setLogLevel(app, 'all');
    Realm.App.Sync.setLogger(app, (numericLevel, message) => {
      logger.info(`Log level: ${logLevels[numericLevel]} - Log message: ${message}`);
    });
  }

  return app;
};
