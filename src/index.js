const { register, logIn, logOut, openRealm, /* closeRealm,*/ } = require('./realm-auth');
const { addDummyData, updateDummyData, deleteDummyData, getStore } = require('./realm-query');

const exampleEmail = 'john@doe.com';
const examplePassword = '123456';

async function main() {
  let success = await register(exampleEmail, examplePassword);
  if (!success) {
    return;
  }

  success = await logIn(exampleEmail, examplePassword);
  if (!success) {
    return;
  }

  await openRealm();

  // Cleaning the DB before continuing.
  deleteDummyData();
  addDummyData();
  updateDummyData();

  // Temporary for debugging
  const store = getStore();
  const firstKiosk = store?.kiosks[0];
  if (firstKiosk) {
    console.log(JSON.stringify(firstKiosk, null, 2));
  }
}

main();
