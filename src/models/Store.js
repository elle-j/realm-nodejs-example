exports.StoreSchema = {
  name: 'Store',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    kiosks: 'Kiosk[]',
  },
};
