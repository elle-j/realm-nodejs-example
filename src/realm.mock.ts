import { BSON } from 'realm';
import { SYNC_STORE_ID } from './atlas-app-services/config';
import { KioskSchema, ProductSchema, StoreSchema } from './models';
import { getRealm } from './realm-connection';
import { RealmQuery } from './realm-query';

export class RealmMock {
  realmQuery: RealmQuery;
  constructor() {
    this.realmQuery = new RealmQuery();
  }

  public addProducts(): void {
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
            numInStock: NUM_PRODUCTS,
          });
        }
      });
    }
  }

  public addKiosks(): void {
    const realm = getRealm();
    if (realm) {
      const products = this.realmQuery.getProducts();
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

  public addStore() {
    const realm = getRealm();
    if (realm) {
      const kiosks = this.realmQuery.getKiosks();
      realm.write(() => {
        realm.create(StoreSchema.name, {
          _id: SYNC_STORE_ID,
          kiosks,
        });
      });
    }
  }

  public addDummyData(): void {
    this.addProducts();
    this.addKiosks();
    this.addStore();
  }

  public updateDummyData() {
    const realm = getRealm();
    if (realm) {
      const products: any = this.realmQuery.getProducts();
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

  public deleteDummyData(): void {
    const realm = getRealm();
    if (realm) {
      realm.write(() => {
        realm.deleteAll();
      });
    }
  }
}
