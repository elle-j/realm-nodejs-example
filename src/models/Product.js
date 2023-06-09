// Current information and inventory about a type of product in a particular store.
// (This is simplified to refer to a complete product (e.g. a sandwich, rather than
// e.g. bread, cheese, lettuce, etc.)
exports.ProductSchema = {
  name: 'Product',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    storeId: { type: 'objectId', indexed: true },
    name: 'string',
    price: 'double',
    numInStock: 'int',
  },
};
