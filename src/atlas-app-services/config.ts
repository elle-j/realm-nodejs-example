import path from 'path';
import { BSON } from 'realm';

export const ATLAS_APP_ID = 'wawa-hbesp';

export const DATABASE_FOLDER = 'db';

export const BACKUPS_DATABASE_FOLDER = `${DATABASE_FOLDER}/backups`;

export const DATABASE_FOLDER_RELATIVE_PATH = `../../${DATABASE_FOLDER}`

export const BACKUPS_DATABASE_FOLDER_RELATIVE_PATH = `../../${BACKUPS_DATABASE_FOLDER}`

// DB Seed initially to load data in local database
export const DB_SEED = false

export const SYNC_STORE_ID = new BSON.ObjectId('6426106cb0ad9713140883ed');

export const APP_VERSION = '1.0.0'

// To connect the application in offline mode with any local backed up copy of realm. The value of this will be
// sent via some service. And when the application is reopened, it will use its updated value.
export const CONNECT_OFFLINE = false

// Number of hours can be configured here, so the backup of the realm files happens based on the hours set
// example if defined as 1, every 1 hour interval, realm file will be backed up in the system
export const DB_BACKUP_FREQUENCY_IN_HOURS = 1

// Default sync realm storage path
export const DEFAULT_SYNC_REALM_PATH = path.join(__dirname, `${DATABASE_FOLDER_RELATIVE_PATH}/realm-${APP_VERSION}.realm`);

// Path and name of the realm file during the backup
export let BACKUP_REALM_PATH: string = path.join(__dirname, `${BACKUPS_DATABASE_FOLDER_RELATIVE_PATH}`)

// This could come from other service. 
const RESTORE_REALM_FILE_NAME = `realm-1.0.0-971-22-3-2-4.realm`;
export const RESTORE_REALM_PATH = path.join(__dirname, `${BACKUPS_DATABASE_FOLDER_RELATIVE_PATH}/${RESTORE_REALM_FILE_NAME}`)

// Define the number of local realm backup files to be stored in the backups folder.
// If its set to 5, the maximum number of available realm backup files will not be more than 5 and the older 
// realm files will be pruned in regular intervals during thr backup trigger
export const NUMBER_OF_REALM_BACKUPS_TO_PERSIST = 5