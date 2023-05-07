import Realm, { App, ClientResetMode, Collection, CollectionChangeSet, ConnectionState, ProgressDirection } from 'realm';
import { CONNECT_OFFLINE, DEFAULT_SYNC_REALM_PATH, RESTORE_REALM_PATH, SYNC_STORE_ID } from './atlas-app-services/config';
import { AtlasApp } from './atlas-app-services/getAtlasApp';
import { getAccessToken } from './auth0.provider';
import { Logger } from './logger';
import { KioskSchema, ProductSchema, StoreSchema } from './models';


let app: Realm.App = new AtlasApp().app;
let currentUser: Realm.User | null;
let originalAccessToken: string | null = null;
let realm: Realm | null;
let connectionNotificationAdded = false;
let progressNotificationAdded = false;

// Exported for use by `./realm-query.js`
export const getRealm = (): Realm => {
  return realm as Realm;
};

// The connection listener will be invoked when the the underlying sync session
// changes its connection state.
const handleConnectionChange = (newState: ConnectionState, oldState: ConnectionState) => {
  const connecting = newState === ConnectionState.Connecting;
  const connected = newState === ConnectionState.Connected;
  const disconnected = oldState === ConnectionState.Connected && newState === ConnectionState.Disconnected;
  const failedReconnecting = oldState === ConnectionState.Connecting && newState === ConnectionState.Disconnected;

  if (connecting) {
    Logger.info(`Connecting...`);
  } else if (connected) {
    Logger.info(`Connected.`);
  } else if (disconnected) {
    Logger.info(`Disconnected.`);

    // Currently, the `newState` is `ConnectionState.Disconnected`. Automatic retries will
    // start and the state will alternate in the following way for the period where there
    // is NO network connection:
    //    (1) oldState: ConnectionState.Disconnected, newState: ConnectionState.Connecting
    //    (2) oldState: ConnectionState.Connecting, newState: ConnectionState.Disconnected

    // Calling `App.Sync.reconnect()` is not needed due to automatic retries. If used
    // elsewhere, however, `app` should be passed as the argument, not the realm instance.

    // Be aware of that there may be a delay from the time of actual disconnect until this
    // listener is invoked.
  } /* failedReconnecting */
  else {
    Logger.info(`Failed to Reconnect(${failedReconnecting})`);
  }
};

const handleProgressChange = (transferred: number, transferable: number) => {
  Logger.info(`${transferred} bytes has been transferred`);
  Logger.info(
    `There are ${transferable} total transferable bytes, including the ones that have already been transferred`
  );
}



const handleSyncError = async (session: App.Sync.Session, error: any) => {
  Logger.info(`Session: state ${session.state} on Device ID (${currentUser?.deviceId}`);
  // For error codes see: https://github.com/realm/realm-core/blob/master/doc/protocol.md#error-codes
  // * Examples:
  //   * 100 (Connection closed, no error)
  //   * 202 (Access token expired)
  if (error.code >= 100 && error.code < 200) {
    Logger.error(`Connection level and protocol error: ${error.message}. ${JSON.stringify(error)} on Device ID (${currentUser?.deviceId})`);
  } else if (error.code >= 200 && error.code < 300) {
    Logger.error(`Session level error: ${error.message}. ${JSON.stringify(error)}  on Device ID (${currentUser?.deviceId})`);
    /*  
        Refresh token can be updated for a maximum expiration time period of around 180days. Refer below
        https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration
        Even if the application is reopened after 180days(Assuming 180days is updated
        in configuration in realm app services) this reOpenRealm() method will try to relogin to
        application again and open the realm connection without any issues
     */
    Logger.info(`Reopeing realm on Device ID (${currentUser?.deviceId}) as the access and refresh token are expired `);
    await reOpenRealm();
  }
  // Should not be reachable.
  else {
    Logger.error(`Unexpected error code: ${error.code}. ${JSON.stringify(error)} on Device ID (${currentUser?.deviceId})`);
  }
  // Regarding manual client resets. The deprecated `Realm.App.Sync.initiateClientReset`
  // is meant for use only when the `clientReset` property on the sync configuration
  // is set to `ClientResetMode.Manual` and should not be needed when using
  // `ClientResetMode.DiscardUnsyncedChanges`.
};

const reOpenRealm = async () => {
  //Making sure all the listeners and current user is cleared before reopening the realm
  realm?.syncSession?.removeProgressNotification(handleProgressChange)
  currentUser?.removeAllListeners();
  currentUser = null;
  realm = null;
  originalAccessToken = null;
  const accessToken: string = await getAccessToken();

  let success: Realm.User | boolean = await logIn(accessToken);
  if (!success) {
    return;
  }

  await openRealm();
}

const handlePreClientReset = (localRealm: Realm) => {
  Logger.info(`localRealm: ${localRealm}`);
  Logger.info(`Initiating client reset...`);
};

const handlePostClientReset = (localRealm: Realm, remoteRealm: Realm) => {
  Logger.info(`localRealm: ${localRealm}`);
  Logger.info(`remoteRealm: ${remoteRealm}`);
  Logger.info(`Client has been reset on Device ID (${currentUser?.deviceId})`);
};

// The collection listener will be invoked when the listener is added and
// whenever an object in the collection is deleted, inserted, or modified.
const handleProductsChange = (products: Collection<object>, changes: CollectionChangeSet) => {
  Logger.info(`Changes. ${JSON.stringify(changes)}`);
  Logger.info(`Products changed. ${JSON.stringify(products)}`);
};


const getRealmConfig = (): Realm.Configuration => {
  const schemas: Realm.ObjectSchema[] = [StoreSchema, KioskSchema, ProductSchema];

  if (CONNECT_OFFLINE) {
  // Connect to offline realm without sync mode by opening a backed up realm file in local realm mode
    return {
      path: RESTORE_REALM_PATH,
      schema: schemas
    }
  } else {
    // Connecting via sync mode
    return {
      path: DEFAULT_SYNC_REALM_PATH,
      schema: schemas,
      sync: {
        user: currentUser as Realm.User,
        // To read more about flexible sync and subscriptions, see:
        // https://www.mongodb.com/docs/realm/sdk/node/examples/flexible-sync/
        flexible: true,
        initialSubscriptions: {
          // When adding subscriptions, best practice is to name each subscription
          // for better managing removal of them.
          update: async (mutableSubs: Realm.App.Sync.MutableSubscriptionSet, realm: Realm) => {
            // Subscribe to the store with the given ID.
            mutableSubs.add(realm.objects(StoreSchema.name).filtered('_id = $0', SYNC_STORE_ID), { name: 'storeA' });
            // Subscribe to all kiosks in the store with the given ID.
            mutableSubs.add(realm.objects(KioskSchema.name).filtered('storeId = $0', SYNC_STORE_ID), { name: 'kiosksInStoreA' });
            // Subscribe to all products in the store with the given ID.
            mutableSubs.add(realm.objects(ProductSchema.name).filtered('storeId = $0', SYNC_STORE_ID), { name: 'productsInStoreA' });
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
      }
    }
  }
}

export const openRealm = async () => {
  try {
    // Get realm config, which will decide wheather to connect via offline mode or via synced mode
    const config: Realm.Configuration = getRealmConfig();
    Logger.info('Opening realm...');
    realm = new Realm(config);
    Logger.info('Realm opened.');

    // Explicitly removing the connection listener is not needed if you intend for it
    // to live throughout the session.
    if (!connectionNotificationAdded) {
      realm.syncSession?.addConnectionNotification(handleConnectionChange);
      connectionNotificationAdded = true;
    }
    if (!progressNotificationAdded) {
      realm.syncSession?.addProgressNotification(ProgressDirection.Download, Realm.ProgressMode.ReportIndefinitely, handleProgressChange);
      progressNotificationAdded = true;
    }
    realm.objects(ProductSchema.name).filtered('storeId = $0', SYNC_STORE_ID).addListener(handleProductsChange);
  } catch (error: unknown) {
    if (error instanceof Error) {
      Logger.error(`Error opening the realm: ${error.message}`);
    }
    return false;
  }
};

export const closeRealm = () => {
  if (realm && !realm.isClosed) {
    Logger.info('Closing the realm...');
    realm.close();
    Logger.info('Realm closed.');
  }
  realm = null;
};

export const resetUser = () => {
  currentUser?.removeAllListeners();
  currentUser = null;
  originalAccessToken = null;
};

export const getCurrentUser = (): Realm.User => {
  return currentUser!;
};

// The user listener will be invoked on various user related events including
// refresh of auth token, refresh token, custom user data, and logout.
const handleUserEventChange = () => {
  if (currentUser) {
    // Currently we don't provide any arguments to this callback but we have opened
    // a ticket for this (see https://github.com/realm/realm-core/issues/6454). To
    // detect that a token has been refreshed (which can also be manually triggered
    // by `await user.refreshCustomData()`), the original access token can be saved
    // to a variable and compared against the current one.
    if (originalAccessToken !== currentUser.accessToken) {
      Logger.info('Refreshed access token.');
      originalAccessToken = currentUser.accessToken;
    }

    switch (currentUser.state) {
      // case UserState.Active:       // Bug to be fixed: `UserState` is undefined.
      // @ts-expect-error
      case "LoggedIn": // Bug to be fixed: Literal is documented as 'active'
        Logger.info(`User (id: ${currentUser.id}) has been authenticated.`);
      // case UserState.LoggedOut:
      // @ts-expect-error
      case 'LoggedOut': // Bug to be fixed: Literal is documented as 'logged-out'
        Logger.info(`User (id: ${currentUser.id}) has been logged out.`);
        resetUser();
        // break;
      // case UserState.Removed:
      // @ts-expect-error
      case 'Removed': // Bug to be fixed: Literal is documented as 'removed'
        Logger.info(`User (id: ${currentUser.id}) has been removed from the app.`);
        resetUser();
        // break;
      default:
        // Should not be reachable.
        break;
    }
  }
};

export const logIn = async (accessToken: string): Promise<Realm.User | boolean> => {
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
    Logger.info('Logging in...');
    const credentials: Realm.Credentials = Realm.Credentials.jwt(accessToken);
    currentUser = await app.logIn(credentials);
    originalAccessToken = currentUser.accessToken;
    Logger.info('Logged in.');
    currentUser.addListener(handleUserEventChange);
    return currentUser;
  } catch (error: unknown) {
    if (error instanceof Error) {
      Logger.error(`Error logging in: ${error.message}`);
    }
    return false;
  }
};

export const logOut = async () => {
  if (currentUser) {
    Logger.info('Logging out...');
    await currentUser.logOut();
    // The `currentUser` variable is being set to `null` in the user listener.
  }
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
