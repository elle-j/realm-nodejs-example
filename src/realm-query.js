const { BSON } = require('realm');

const { StoreSchema } = require('./models/Store');
const { KioskSchema } = require('./models/Kiosk');
const { ProductSchema } = require('./models/Product');
const { SYNC_STORE_ID } = require('./atlas-app-services/config');
const { getRealm } = require('./realm-auth');

function getStore() {
  return getRealm()?.objects(StoreSchema.name).filtered('_id == $0', SYNC_STORE_ID)[0];
}

function getKiosks() {
  const realm = getRealm();
  return realm ? realm.objects(KioskSchema.name).filtered('storeId == $0', SYNC_STORE_ID) : [];
}

function getProducts() {
  const realm = getRealm();
  return realm ? realm.objects(ProductSchema.name).filtered('storeId == $0', SYNC_STORE_ID) : [];
}

function addProducts() {
  const realm = getRealm();
  if (realm) {
    realm.write(() => {
      const NUM_PRODUCTS = 10;
      for (let i = 1; i <= NUM_PRODUCTS; i++) {
        realm.create(ProductSchema.name, {
          _id: new BSON.ObjectId(),
          storeId: SYNC_STORE_ID,
          name: `product${i}`,
          price: parseFloat((5 + Math.random() * 10).toFixed(2)),
          numInStock: NUM_PRODUCTS
        });
      }
    });
  }
}

function addKiosks() {
  const realm = getRealm();
  if (realm) {
    const products = getProducts();
    realm.write(() => {
      for (let i = 1; i <= 10; i++) {
        realm.create(KioskSchema.name, {
          _id: new BSON.ObjectId(),
          storeId: SYNC_STORE_ID,
          products,
        });
      }
    });
  }
}

function addStore() {
  const realm = getRealm();
  if (realm) {
    const kiosks = getKiosks();
    realm.write(() => {
      realm.create(StoreSchema.name, {
        _id: SYNC_STORE_ID,
        kiosks,
      });
    });
  }
}

function addDummyData() {
  addProducts();
  addKiosks();
  addStore();
}

function updateDummyData() {
  const realm = getRealm();
  if (realm) {
    const products = getProducts();
    // Updating products one-by-one (separate `write`s) to simulate
    // updates occurring in different batches.
    for (const product of products) {
      realm.write(() => {
        // Decrease the `numInStock` by 0, 1, 2, or 3
        product.numInStock -= Math.max(0, Math.round(Math.random() * 3));
      });
    }
  }
}

function deleteDummyData() {
  const realm = getRealm();
  if (realm) {
    realm.write(() => {
      realm.deleteAll();
    });
  }
}

module.exports = {
  addDummyData,
  updateDummyData,
  deleteDummyData,
  getStore,
};
