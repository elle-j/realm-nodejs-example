import Realm from 'realm';
import { Product } from './Product';

export type Kiosk = {
  _id: Realm.BSON.ObjectId;
  products: Realm.List<Product>;
  storeId: Realm.BSON.ObjectId;
};

export const KioskSchema = {
  name: 'Kiosk',
  properties: {
    _id: 'objectId',
    products: 'Product[]',
    storeId: 'objectId',
  },
  primaryKey: '_id',
};
