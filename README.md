# Reference App Using RealmJS in Node.js

A skeleton app to be used as a reference for how to use the [Realm Node.js SDK](https://www.mongodb.com/docs/realm/sdk/node/) specifically around detecting various changes in e.g. connection state, user state, and sync errors.

## Relevant Files

```
├── src
│   ├── atlas-app-services  (Configure Atlas App)
│   │   ├── config.js
│   │   ├── getAtlasApp.js
│   ├── models              (Simplified data model)
│   │   ├── Kiosk.js
│   │   ├── Product.js
│   │   ├── Store.js
│   ├── index.js            (Entry point)
│   ├── logger.js           (Replaceable logger)
│   ├── realm-auth.js       (Main Realm usage examples)
│   └── realm-query.js      (Data manipulation helper)
└── other..
```

Main file for showcasing Realm usage:
* `src/realm-auth.js`

## Scope

The app addresses the following points:
* Listening when a user is logged out or removed.
* Listening when a user's tokens are refreshed.
* Listening when the underlying sync session is connecting, gets connected, gets disconnected, and fails to reconnect.
* Listening for sync errors.
* Listening for pre and post client resets.
* Explains that the refresh of access tokens is handled automatically by the SDK.
  * [Refresh token expiration time](https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration) can be altered in the Atlas UI and then observed on the client how listeners are fired.
  * Login is NOT currently shown with JWT, but is instead using email/password. However, with the above point, testing refresh token expiration is still possible.
* Generally providing best practices for the surrounding Realm usage such as opening and closing of realms, configurations, adding subscriptions, etc.
* Includes useful comments around the use of Realm.
* An over-simplified data model is used. This app also writes data to confirm the functionality.

This reference app thus focuses on showing where and when to perform logging and handle specific scenarios based on observed changes in order to better guide developers on how to proceed.

**Realm Details:**
* RealmJS v11.7.0
* Device Sync type: Flexible

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/)

### Set up an Atlas App Services App

To sync Realm data you must first:

1. [Create an App Services App](https://www.mongodb.com/docs/atlas/app-services/manage-apps/create/create-with-ui/)
2. Enable [Email/Password Authentication](https://www.mongodb.com/docs/atlas/app-services/authentication/email-password/#std-label-email-password-authentication)
3. [Enable Flexible Sync](https://www.mongodb.com/docs/atlas/app-services/sync/configure/enable-sync/) with **Development Mode** on.
    * When Development Mode is enabled, queryable fields will be added automatically.
    * Queryable fields used in this app: `_id`, `storeId`

After running the client and seeing the available collections in Atlas, [set read/write permissions](https://www.mongodb.com/docs/atlas/app-services/rules/roles/#with-device-sync) for all collections.

### Install Node.js dependencies

```sh
npm i
```

### Run the Node.js code

1. Copy your [Atlas App ID](https://www.mongodb.com/docs/atlas/app-services/reference/find-your-project-or-app-id/#std-label-find-your-app-id) from the App Services UI.
2. Paste the copied ID as the value of the existing variable `ATLAS_APP_ID` in `src/atlas-app-services/config.js`:
```js
exports.ATLAS_APP_ID = 'YOUR_APP_ID';
```

3. Start the script.

```sh
npm start
```


### Troubleshooting

* If permission is denied:
  * Whitelist your IP address via the Atlas UI.
  * Make sure you have [read/write permissions](https://www.mongodb.com/docs/atlas/app-services/rules/roles/#with-device-sync) for all collections.
* Removing the local database can be useful for certain errors.
  * When running the app, the local database will exist in the directory `mongodb-realm/`.
  * To remove it, run: `npm run rmLocalDb`
