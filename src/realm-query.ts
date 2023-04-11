import { KioskSchema, ProductSchema, StoreSchema } from './models';

import { SYNC_STORE_ID } from './atlas-app-services/config';
import { getRealm } from './realm-connection';

export class RealmQuery {
  public getStore(): Realm.Object {
    return getRealm()?.objects(StoreSchema.name).filtered('_id = $0', SYNC_STORE_ID)[0];
  }

  public getKiosks(): Realm.Results<Realm.Object> {
    const kiosks = getRealm()?.objects(KioskSchema.name).filtered('storeId = $0', SYNC_STORE_ID);
    return kiosks;
  }

  public getProducts(): Realm.Results<Realm.Object> {
    const products = getRealm()?.objects(ProductSchema.name).filtered('storeId = $0', SYNC_STORE_ID);
    return products;
  }
}
