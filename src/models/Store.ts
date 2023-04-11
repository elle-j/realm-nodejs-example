import Realm from 'realm';
import { Kiosk } from './Kiosk';

export type Store = {
  _id: Realm.BSON.ObjectId;
  kiosks: Realm.List<Kiosk>;
};

export const StoreSchema = {
  name: 'Store',
  properties: {
    _id: 'objectId',
    kiosks: 'Kiosk[]',
  },
  primaryKey: '_id',
};
