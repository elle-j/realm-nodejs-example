import Realm from 'realm';

// Current information and inventory about a type of product in a particular store.
// (This is simplified to refer to a complete product (e.g. a sandwich, rather than
// e.g. bread, cheese, lettuce, etc.)

export type Product = {
  _id: Realm.BSON.ObjectId;
  name: string;
  numInStock: number;
  price: number;
  storeId: Realm.BSON.ObjectId;
};

export const ProductSchema = {
  name: 'Product',
  properties: {
    _id: 'objectId',
    name: 'string',
    numInStock: 'int',
    price: 'double',
    storeId: 'objectId',
  },
  primaryKey: '_id',
};
