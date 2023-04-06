const process = require('node:process');
const Realm = require('realm');
const { ClientResetMode, ConnectionState, UserState } = require('realm');

const { StoreSchema } = require('./models/Store');
const { KioskSchema } = require('./models/Kiosk');
const { ProductSchema } = require('./models/Product');
const { SYNC_STORE_ID } = require('./atlas-app-services/config');
const { getAtlasApp } = require('./atlas-app-services/getAtlasApp');
const { logger } = require('./logger');

const app = getAtlasApp();
let currentUser = null;
let originalAccessToken = null;
let realm = null;

// Exported for use by `./realm-query.js`
function getRealm() {
  return realm;
}

function resetUser() {
  currentUser?.removeAllListeners();
  currentUser = null;
  originalAccessToken = null;
}

// The user listener will be invoked on various user related events including
// refresh of auth token, refresh token, custom user data, and logout.
function handleUserEventChange() {
  if (currentUser) {
    // Currently we don't provide any arguments to this callback but we have opened
    // a ticket for this (see https://github.com/realm/realm-core/issues/6454). To
    // detect that a token has been refreshed (which can also be manually triggered
    // by `await user.refreshCustomData()`), the original access token can be saved
    // to a variable and compared against the current one.
    if (originalAccessToken !== currentUser.accessToken) {
      logger.info("Refreshed access token.");
      originalAccessToken = currentUser.accessToken;
    }

    switch (currentUser.state) {
      // case UserState.Active:       // Bug to be fixed: `UserState` is undefined.
      case 'LoggedIn':                // Bug to be fixed: Actual value is 'LoggedIn' but type is documented as 'active'
        logger.info(`User (id: ${currentUser.id}) has been authenticated.`);
        break;
      // case UserState.LoggedOut:
      case 'LoggedOut':               // Bug to be fixed: Actual value is 'LoggedOut' but type is documented as 'logged-out'
        logger.info(`User (id: ${currentUser.id}) has been logged out.`);
        resetUser();
        break;
      // case UserState.Removed:
      case 'Removed':                 // Bug to be fixed: Actual value is 'Removed' but type is documented as 'removed'
        logger.info(`User (id: ${currentUser.id}) has been removed from the app.`);
        resetUser();
        break;
      default:
        // Should not be reachable.
        break;
    }
  }
}

// The connection listener will be invoked when the the underlying sync session
// changes its connection state.
function handleConnectionChange(newState, oldState) {
  const connecting = newState === ConnectionState.Connecting;
  const connected = newState === ConnectionState.Connected;
  const disconnected = oldState === ConnectionState.Connected && newState === ConnectionState.Disconnected;
  const failedReconnecting = oldState === ConnectionState.Connecting && newState === ConnectionState.Disconnected;

  if (connecting) {
    logger.info(`Connecting...`);
  } else if (connected) {
    logger.info(`Connected.`);
  } else if (disconnected) {
    logger.info(`Disconnected.`);

    // Currently, the `newState` is `ConnectionState.Disconnected`. Automatic retries will
    // start and the state will alternate in the following way for the period where there
    // is NO network connection:
    //    (1) oldState: ConnectionState.Disconnected, newState: ConnectionState.Connecting
    //    (2) oldState: ConnectionState.Connecting, newState: ConnectionState.Disconnected

    // Calling `App.Sync.reconnect()` is not needed due to automatic retries. If used
    // elsewhere, however, `app` should be passed as the argument, not the realm instance.

    // Be aware of that there may be a delay from the time of actual disconnect until this
    // listener is invoked.
  } else /* failedReconnecting */ {
    logger.info(`Failed to reconnect.`);
  }
}

function handleSyncError(session, error) {
  // For error codes see: https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes
  // * Examples:
  //   * 100 (Connection closed, no error)
  //   * 202 (Access token expired)
  if (error.code >= 100 && error.code < 200) {
    logger.error(`Connection level and protocol error: ${error.message}. ${JSON.stringify(error)}`);
  } else if (error.code >= 200 && error.code < 300) {
    logger.error(`Session level error: ${error.message}. ${JSON.stringify(error)}`);
  } else {
    // Should not be reachable.
    logger.error(`Unexpected error code: ${error.code}. ${JSON.stringify(error)}`);
  }

  // Regarding manual client resets. The deprecated `Realm.App.Sync.initiateClientReset()`
  // is meant for use only when the `clientReset` property on the sync configuration is
  // set to `ClientResetMode.Manual` and should not be needed when using
  // `ClientResetMode.DiscardUnsyncedChanges`.
}

function handlePreClientReset(localRealm) {
  // To read more about manual client reset data recovery, see:
  // https://www.mongodb.com/docs/realm/sdk/node/advanced/client-reset-data-recovery/
  logger.info(`Initiating client reset...`);
}

function handlePostClientReset(localRealm, remoteRealm) {
  logger.info(`Client has been reset.`);
}

// The collection listener will be invoked when the listener is added and
// whenever an object in the collection is deleted, inserted, or modified.
// (Always handle potential deletions first.)
function handleProductsChange(products, changes) {
  logger.info('Products changed.');
}

async function register(email, password) {
  // For this simplified example, the app is configured via the Atlas App Services UI
  // to automatically confirm users' emails.
  try {
    logger.info('Registering...');
    await app.emailPasswordAuth.registerUser({ email, password });
    logger.info('Registered.');
    return true;
  }
  catch (err) {
    if (err.message.includes('name already in use')) {
      logger.info('Already registered.');
      return true;
    }
    logger.error(`Error registering: ${err.message}`);
    return false;
  }
};

async function logIn(email, password) {
  // Access tokens are created once a user logs in. These tokens are refreshed
  // automatically by the SDK when needed. Manually refreshing the token is only
  // required if requests are sent outside of the SDK. If that's the case, see:
  // https://www.mongodb.com/docs/realm/sdk/node/examples/authenticate-users/#get-a-user-access-token

  // By default, refresh tokens expire 60 days after they are issued. You can configure this
  // time for your App's refresh tokens to be anywhere between 30 minutes and 180 days. See:
  // https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration

  if (currentUser) {
    return currentUser;
  }

  try {
    // The credentials here can be substituted using a JWT or another preferred method.
    logger.info('Logging in...');
    currentUser = await app.logIn(Realm.Credentials.emailPassword(email, password));
    originalAccessToken = currentUser.accessToken;
    logger.info('Logged in.');
    currentUser.addListener(handleUserEventChange);
    return true;
  } catch (err) {
    logger.error(`Error logging in: ${err.message}`);
    return false;
  }
}

async function logOut() {
  if (currentUser) {
    logger.info('Logging out...');
    await currentUser.logOut();

    // The `currentUser` variable is being set to `null` in the user listener.
  }
}

async function openRealm() {
  try {
    const config = {
      schema: [StoreSchema, KioskSchema, ProductSchema],
      sync: {
        user: currentUser,
        // To read more about flexible sync and subscriptions, see:
        // https://www.mongodb.com/docs/realm/sdk/node/examples/flexible-sync/
        flexible: true,
        initialSubscriptions: {
          // When adding subscriptions, best practice is to name each subscription
          // for better managing removal of them.
          update: (mutableSubs, realm) => {
            // Subscribe to the store with the given ID.
            mutableSubs.add(
              realm.objects(StoreSchema.name).filtered('_id = $0', SYNC_STORE_ID),
              { name: 'storeA' },
            );
            // Subscribe to all kiosks in the store with the given ID.
            mutableSubs.add(
              realm.objects(KioskSchema.name).filtered('storeId = $0', SYNC_STORE_ID),
              { name: 'kiosksInStoreA' },
            );
            // Subscribe to all products in the store with the given ID.
            mutableSubs.add(
              realm.objects(ProductSchema.name).filtered('storeId = $0', SYNC_STORE_ID),
              { name: 'productsInStoreA' },
            );
          },
        },
        clientReset: {
          // For read-only clients, `ClientResetMode.DiscardUnsyncedChanges` is suitable.
          mode: ClientResetMode.DiscardUnsyncedChanges,
          onBefore: handlePreClientReset,
          onAfter: handlePostClientReset,

          // If also writing to the realm, `ClientResetMode.RecoverOrDiscardUnsyncedChanges`
          // is suitable (e.g. when running this example app). In this case, it is possible
          // to listen on more events (v11 and v12 types differ slightly):
          // interface ClientResetRecoveryOrDiscardConfiguration {
          //   mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges;
          //   onBefore?: ClientResetBeforeCallback;
          //   onRecovery?: ClientResetAfterCallback;
          //   onDiscard?: ClientResetAfterCallback;
          //   onFallback?: ClientResetFallbackCallback;
          // }
        },
        // The old property for the error callback was called `error`, please use `onError`.
        onError: handleSyncError,
      },
    };
    logger.info('Opening realm...');
    realm = await Realm.open(config);
    logger.info('Realm opened.');
    
    // Explicitly removing the connection listener is not needed if you intend for it
    // to live throughout the session.
    realm.syncSession?.addConnectionNotification(handleConnectionChange);

    realm.objects(ProductSchema.name).filtered('storeId = $0', SYNC_STORE_ID).addListener(handleProductsChange);
  } catch (err) {
    logger.error(`Error opening the realm: ${err.message}`);
    throw err;
  }
}

function closeRealm() {
  if (realm && !realm.isClosed) {
    logger.info('Closing the realm...');
    realm.close();
    logger.info('Realm closed.');
  }
  realm = null;
}

function handleExit(code) {
  closeRealm();
  logger.info(`Exiting with code ${code}...`);
}

process.on('exit', handleExit);
process.on('SIGINT', process.exit);

module.exports = {
  register,
  logIn,
  logOut,
  openRealm,
  getRealm,
};

// MISCELLANEOUS NOTES:
// --------------------
// * Convenience method to check if connected: `app.syncSession?.isConnected()`
// * Get user's access token: `user.accessToken`
// * Get user's refresh token: `user.refreshToken`
// * See more information on error handling: https://www.mongodb.com/docs/atlas/app-services/sync/error-handling/
// * Removing the local database (directory: mongodb-realm/) can be useful for certain errors.
//   * For this example app, the helper command `npm run rmLocalDb` is provided.
// * CommonJS (CJS) vs. ECMAScript modules (ESM)
//   * We recommend converting to ESM by first adding `"type": "module"` in `package.json`.
