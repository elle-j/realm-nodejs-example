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
let realm = null;

// Exported for use by `./realm-query.js`
function getRealm() {
  return realm;
}

// The user listener will be invoked on various user related events including
// refresh of auth token, refresh token, custom user data, and logout.
function handleUserChange() { //Maybe this could be called handleUserStateChange? From the name I thought this was going to be invoked when the current user was changing to another one
  if (currentUser) {
    switch (currentUser.state) {
      // case UserState.Active: // `UserState` seems to be undefined, even on `Realm.UserState`.
      case 'Active': // But our types says it should be 'active'
        logger.info(`User (id: ${currentUser.id}) has been authenticated.`);
        break;
      // case UserState.LoggedOut:
      case 'LoggedOut': // But our types says it should be 'logged-out'
        logger.info(`User (id: ${currentUser.id}) has been logged out.`);
        currentUser.removeAllListeners();
        currentUser = null;
        break;
      // case UserState.Removed:
      case 'Removed': // But our types says it should be it should be 'removed'
        logger.info(`User (id: ${currentUser.id}) has been removed from the app.`);
        currentUser.removeAllListeners(); // TODO: Is this needed?
        currentUser = null;
        break;
      // Temporary for debugging
      default:
        logger.error(`Unexpected user state for user (id: ${currentUser.id}): ${currentUser.state}`);
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

    // ADDRESS:
    // Wawa used `App.Sync.reconnect()` but it does not seem to be needed due to automatic
    // retries. If used, however, they should pass `app` as the argument, not the realm.
    // They used the `reconnect()` if sync session state was not `SessionState.Active`.
  } else /* failedReconnecting */ {
    logger.info(`Failed to reconnect.`);
  }
}

function handleSyncError(session, error) {
  // TODO: Suggestions on how to differentiate between errors.

  // For error codes see: https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes
  // * Examples:
  //   * 100 (Connection closed, no error)
  //   * 202 (Access token expired)
  if (error.code >= 100 || error.code < 200) {
    logger.error(`Connection level and protocol error: ${error.message}.\n\t- ${{ error }}`);
  } else if (error.code >= 200 || error.code < 300) {
    logger.error(`Session level error: ${error.message}.\n\t- ${{ error }}`);
  }
  // Temprary for debugging
  else {
    logger.error(`SYNC ERROR CALLBACK. Expected error codes in level 100 and 200, got: ${error.code}.`);
  }
}

function handlePreClientReset(localRealm) {
  logger.info(`Initiating client reset...`);
}

function handlePostClientReset(localRealm, remoteRealm) {
  logger.info(`Client has been reset.`);
}

// The collection listener will be invoked when the listener is added and
// whenever an object in the collection is deleted, inserted, or modified.
function handleProductsChange(products, changes) {
  logger.info('Products changed.');
}

async function register(email, password) {
  // For this simplified example, the app is configured to automatically confirm users.
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

      // Note to team: `err.code` returns the string 'AccountNameInUse' (our type says it should be a number)
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

  if (currentUser) {
    return currentUser;
  }

  try {
    // The credentials here can be substituted using a JWT or another preferred method.
    logger.info('Logging in...');
    currentUser = await app.logIn(Realm.Credentials.emailPassword(email, password));
    logger.info('Logged in.');
    currentUser.addListener(handleUserChange);
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
    //Shouldn't you also do currentUser = null or something similar here?
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
          update: (mutableSubs, realm) => {
            // Subscribe to the store with the given ID.
            mutableSubs.add(
              realm.objects(StoreSchema.name).filtered('_id == $0', SYNC_STORE_ID), // TODO: Some examples use '==', others use '='
              { name: 'storeA' },
            );
            // Subscribe to all kiosks in the store with the given ID.
            mutableSubs.add(
              realm.objects(KioskSchema.name).filtered('storeId == $0', SYNC_STORE_ID),
              { name: 'kiosksInStoreA' },
            );
            // Subscribe to all products in the store with the given ID.
            mutableSubs.add(
              realm.objects(ProductSchema.name).filtered('storeId == $0', SYNC_STORE_ID),
              { name: 'productsInStoreA' },
            );
          },
        },
        clientReset: {
          mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges, // TODO: Preferred mode? Wawa used `DiscardUnsyncedChanges`
          onBefore: handlePreClientReset,
          onAfter: handlePostClientReset,
        },
        onError: handleSyncError, // NOTE: Wawa used `error`
      },
    };
    logger.info('Opening realm...');
    realm = await Realm.open(config);
    logger.info('Realm opened.');
    realm.syncSession?.addConnectionNotification(handleConnectionChange); // TODO: Does this listener have to be explicitly removed?
    realm.objects(ProductSchema.name).filtered('storeId == $0', SYNC_STORE_ID).addListener(handleProductsChange);
  } catch (err) {
    logger.error(`Error opening the realm: ${err.message}`);
    throw err;
  }
}

/*async*/ function closeRealm() {
  // TODO: Verify if `!realm.isClosed` is needed.
  if (realm && !realm.isClosed) {
    logger.info('Closing the realm...');
    // await realm.syncSession?.uploadAllLocalChanges(); // TODO: Verify this (not available in v11?)
    realm.removeAllListeners();
    realm.close();
    realm = null;
    logger.info('Realm closed.');
  }
}

module.exports = {
  register,
  logIn,
  logOut,
  openRealm,
  closeRealm,
  getRealm,
};

// MISCELLANEOUS NOTES:
// * Convenience method to check if connected: `app.syncSession?.isConnected()`
// * See more information on error handling: https://www.mongodb.com/docs/atlas/app-services/sync/error-handling/
// * Get user's access token: `user.accessToken`
// * Get user's refresh token: `user.refreshToken`
