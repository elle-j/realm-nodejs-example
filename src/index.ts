import { logIn, openRealm, register } from './realm-connection';
import { RealmQuery } from './realm-query';
import { RealmMock } from './realm.mock';

const exampleEmail = 'john@doe.com';
const examplePassword = '123456';

export class Main {
  realmQuery: RealmQuery;
  realmMock: RealmMock;

  constructor() {
    this.realmQuery = new RealmQuery();
    this.realmMock = new RealmMock();
  }

  public main = async () => {
    let success: Realm.User | boolean = await register(exampleEmail, examplePassword);
    if (!success) {
      return;
    }

    success = await logIn(exampleEmail, examplePassword);
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
