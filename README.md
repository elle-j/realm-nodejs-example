# Reference App Using RealmJS in Node.js for Wawa

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

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/)

### Install dependencies

```sh
npm i
```

### Run example script

The following command runs the entry file `src/index.js`.

```sh
npm start
```

> If permission is denied, whitelist your IP address via the Atlas UI.
