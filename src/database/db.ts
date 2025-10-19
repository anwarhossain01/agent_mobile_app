import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export const getDBConnection = async () => {
  const db = await SQLite.openDatabase({ name: 'app.db' });
  return db;
};

/**
 * Insert data into a table if it doesn't already exist.
 * 
 * @param tableName - the name of the table
 * @param data - object of column: value pairs
 * @param uniqueColumn - column to check for duplicates (e.g., "id" or "local_cart_id")
 */
export const insertIfNotExists = async (
  tableName: string,
  data: Record<string, any>,
  uniqueColumn: string
) => {
  try {
    const db = await getDBConnection();

    // 1️⃣ Check if it already exists
    const [checkResult] = await db.executeSql(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${uniqueColumn} = ?`,
      [data[uniqueColumn]]
    );

    const count = checkResult.rows.item(0).count;
    if (count > 0) {
      console.log(`⚠️ Record already exists in ${tableName} (${uniqueColumn}=${data[uniqueColumn]})`);
      return false;
    }

    // 2️⃣ Build insert query dynamically
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    await db.executeSql(sql, values);

    console.log(`✅ Inserted new record into ${tableName}`);
    return true;
  } catch (error) {
    console.error('❌ insertIfNotExists error:', error);
    throw error;
  }
};

export const queryData = async (tableName: string, whereClause = '', params: any[] = []) => {
  try {
    const db = await getDBConnection();
    const sql = `SELECT * FROM ${tableName} ${whereClause ? 'WHERE ' + whereClause : ''}`;
    const [results] = await db.executeSql(sql, params);
    return results.rows.raw(); // returns array of objects
  } catch (error) {
    console.error('❌ queryData error:', error);
    throw error;
  }
};
