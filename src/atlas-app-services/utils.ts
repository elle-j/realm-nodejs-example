import fs from 'fs';
import path from 'path';
import { Logger } from '../logger';
import { BACKUPS_DATABASE_FOLDER_RELATIVE_PATH, NUMBER_OF_REALM_BACKUPS_TO_PERSIST } from './config';


export function pruneOldNRealmFiles(): void {
    const realmFiles = getRealmFiles();
    if (realmFiles?.length > NUMBER_OF_REALM_BACKUPS_TO_PERSIST) {
        const filesToDelete = realmFiles.slice(0, -(NUMBER_OF_REALM_BACKUPS_TO_PERSIST));
        for (const file of filesToDelete) {
            fs.rmdirSync(path.resolve(__dirname, `${BACKUPS_DATABASE_FOLDER_RELATIVE_PATH}/${file}.management`), { recursive: true });
            fs.unlink(path.join(path.resolve(__dirname, `${BACKUPS_DATABASE_FOLDER_RELATIVE_PATH}`), file), (error: any) => {
                if (error) {
                    Logger.error(`Error removing the file: ${error?.message}`);
                }
            });
        }
    }
}

// Get files from the backup directory, where the files extention is .realm.
// This way, it avoids the .lock and other files
function getRealmFiles() {
    const files = fs.readdirSync(path.resolve(__dirname, `${BACKUPS_DATABASE_FOLDER_RELATIVE_PATH}/`));
    return files.filter(el => path.extname(el) === '.realm')
}