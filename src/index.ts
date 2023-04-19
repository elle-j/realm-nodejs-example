import { getAccessToken } from './auth0.provider';
import { logIn, openRealm } from './realm-connection';
import { RealmQuery } from './realm-query';
import { RealmMock } from './realm.mock';

export class Main {
  realmQuery: RealmQuery;
  realmMock: RealmMock;

  constructor() {
    this.realmQuery = new RealmQuery();
    this.realmMock = new RealmMock();
  }

  public main = async () => {

    const accessToken = await getAccessToken();

    let success: Realm.User | boolean = await logIn(accessToken);
    if (!success) {
      return;
    }

    await openRealm();

    // Cleaning the DB before continuing.
    this.realmMock.deleteDummyData();
    this.realmMock.addDummyData();
    this.realmMock.updateDummyData();
  };
}

new Main().main();
