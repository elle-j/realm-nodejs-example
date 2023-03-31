exports.KioskSchema = {
  name: 'Kiosk',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    storeId: { type: 'objectId', indexed: true },
    products: 'Product[]',
  },
};
