import { getDBConnection } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const MIGRATION_KEY = 'DB_MIGRATIONS_COMPLETED';

export const initDatabase = async () => {
  try {
    const migrationFiles = [
      '001_initial.sql',
      '002_update.sql'
    ];

    const completedMigrations = await AsyncStorage.getItem(MIGRATION_KEY);
    const completedSet = new Set(completedMigrations ? JSON.parse(completedMigrations) : []);

    const db = await getDBConnection();

    for (const migrationFile of migrationFiles) {
      if (completedSet.has(migrationFile)) {
        console.log(`Migration ${migrationFile} already completed — skipping`);
        continue;
      }

      console.log(`Running migration: ${migrationFile}`);

      const sqlFilePath = `${RNFS.MainBundlePath}/schema/${migrationFile}`;
      let sqlContent = '';

      if (await RNFS.exists(sqlFilePath)) {
        sqlContent = await RNFS.readFile(sqlFilePath, 'utf8');
      } else {
        const androidPath = `schema/${migrationFile}`;
        sqlContent = await RNFS.readFileAssets(androidPath, 'utf8');
      }

      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await db.executeSql(statement);
      }

      completedSet.add(migrationFile);
      await AsyncStorage.setItem(MIGRATION_KEY, JSON.stringify([...completedSet]));
      
      console.log(`✅ Migration ${migrationFile} completed successfully`);
    }

    console.log('✅ All database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
};