import { getDBConnection, insertIfNotExists, queryData } from "../database/db";

export const cachedDataForCarriers = async (
    tableName: string,
    apiCall: () => Promise<any>,
    id?: string | number,
    idColumn: string = 'id'
) => {
    try {

        // Try to get from SQLite first if ID is provided
        if (id) {
            const localData = await queryData(tableName, `${idColumn} = ?`, [id]);

            if (localData.length > 0) {
                console.log(`📦 Data found in local database: ${tableName}`);
                const item = localData[0];

                // Convert back to string format to match API response
                const formattedItem = Object.keys(item).reduce((acc, key) => {
                    // For carriers table, convert active and is_free back to strings
                    if (key === 'active' || key === 'is_free') {
                        acc[key] = item[key].toString();
                    } else {
                        acc[key] = typeof item[key] === 'number' ? item[key].toString() : item[key];
                    }
                    return acc;
                }, {} as any);

                return {
                    success: true,
                    data: { [tableName]: [formattedItem] },
                    fromCache: true
                };
            }
        }

        // If not found locally, call API
        console.log(`🌐 Data not found locally, calling API for ${tableName}...`);
        const res = await apiCall();
        console.log(res.data);

        // Save to SQLite for future use
        if (res.data?.[tableName] && res.data[tableName].length > 0) {
            for (const item of res.data[tableName]) {
                const dbData = Object.keys(item).reduce((acc, key) => {
                    // For carriers table, convert active and is_free to integers
                    if (key === 'active' || key === 'is_free') {
                        acc[key] = parseInt(item[key]) || 0;
                    } else {
                        acc[key] = !isNaN(Number(item[key])) ? parseInt(item[key]) : item[key];
                    }
                    return acc;
                }, {} as any);

                await insertIfNotExists(tableName, dbData, idColumn);
            }
            console.log(`💾 ${tableName} data saved to local database`);
        }

        return { ...res, fromCache: false };
    } catch (error) {
        console.log(`Cached API call error for ${tableName}:`, error);
        return {
            success: false,
            error: error.response?.data?.error || error.message
        };
    }
}

export const cachedDataForDeliveries = async (
    tableName: string,
    apiCall: () => Promise<any>,
    id_carrier?: string | number | null,
    idColumn: string = 'id'
) => {
    try {
        console.log(`⚡️ Cached API call for ${tableName}...`);

        // 1️⃣ Try local DB if id_carrier provided
        if (id_carrier) {
            const localData = await queryData(tableName, `id_carrier = ?`, [id_carrier]);

            if (localData.length > 0) {
                console.log(`📦 Deliveries found in local database for carrier ${id_carrier}`);

                // Format rows back to match API structure
                const formatted = localData.map(item => ({
                    ...item,
                    id: item.id.toString(),
                    id_carrier: item.id_carrier.toString(),
                    id_zone: item.id_zone.toString(),
                    price: item.price.toString(),
                }));

                return {
                    success: true,
                    data: { [tableName]: formatted },
                    fromCache: true,
                };
            }
        }

        // 2️⃣ If not found locally, call API
        console.log(`🌐 No local deliveries found, calling API...`);
        const res = await apiCall();

        // 3️⃣ Save to SQLite
        if (res.data?.[tableName] && res.data[tableName].length > 0) {
            for (const item of res.data[tableName]) {
                const dbData = {
                    id: parseInt(item.id),
                    id_carrier: parseInt(item.id_carrier),
                    id_zone: parseInt(item.id_zone),
                    price: parseFloat(item.price),
                };

                await insertIfNotExists(tableName, dbData, 'id');
            }
            console.log(`💾 Deliveries saved to local database`);
        }

        return { ...res, fromCache: false };
    } catch (error) {
        console.log(`Cached API call error for ${tableName}:`, error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
};

/**
 * Create a new cart and its items
 * 
 * @param id_currency 
 * @param id_lang 
 * @param id_customer 
 * @param id_address_delivery 
 * @param id_address_invoice 
 * @param products - array of { id_product, quantity, id_product_attribute? }
 */
export const createCartCache = async (
    id_currency: number,
    id_lang: number,
    id_customer: number,
    id_address_delivery: number,
    id_address_invoice: number,
    products: { id_product: number | string | any; quantity: number | string; id_product_attribute?: number | any }[]
) => {
    const db = await getDBConnection();
    let generatedCartId = null;
    console.log('createCartCache', id_currency, id_lang, id_customer, id_address_delivery, id_address_invoice, products);

    try {
        await db.transaction(async (tx) => {
            // 1️⃣ Create local cart ID
            const localCartId = `local_${Date.now()}`;

            // 2️⃣ Insert cart
            const insertCartQuery = `
        INSERT INTO carts (
          id_currency, id_lang, id_customer,
          id_address_delivery, id_address_invoice,
          local_cart_id, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
            const cartResult = await tx.executeSql(insertCartQuery, [
                id_currency,
                id_lang,
                id_customer,
                id_address_delivery,
                id_address_invoice,
                localCartId,
                1, // is_dirty (needs sync)
            ]);
            console.log(cartResult);

            const newCartId = cartResult[1].insertId;
            console.log(`🛒 New cart created with ID: ${newCartId}`);

            // 3️⃣ Insert each cart item
            for (const product of products) {
                const insertItemQuery = `
          INSERT OR IGNORE INTO cart_items (
            cart_id, id_product, id_product_attribute, quantity, id_address_delivery
          ) VALUES (?, ?, ?, ?, ?)
        `;
                await tx.executeSql(insertItemQuery, [
                    newCartId,
                    product.id_product,
                    product.id_product_attribute || 0,
                    product.quantity,
                    id_address_delivery,
                ]);
            }
            generatedCartId = newCartId;
            console.log(`📦 Added ${products.length} item(s) to cart ${newCartId}`);
        });

        return {
            success: true,
            message: 'Cart created successfully',
            data: {
                cart: {
                    id: generatedCartId
                }
            },
        };
    } catch (error: any) {
        console.error('❌ createCart error (detailed):', JSON.stringify(error, null, 2));
        return {
            success: false,
            error: error?.message || JSON.stringify(error),
        };
    }
};

/**
 * Create a new order (offline save)
 * @param orderData - key/value pairs matching `orders` table columns
 */
export const createOrderCache = async (orderData: Record<string, any>) => {
    const db = await getDBConnection();

    try {
        await db.transaction(async (tx) => {
            // merge defaults for local tracking
            const dataWithDefaults = {
                order_status: 'pending',
                is_dirty: 1,
                sync_attempts: 0,
                last_sync_error: null,
                remote_order_id: null,
                ...orderData, // user-provided data overrides defaults if given
            };

            const columns = Object.keys(dataWithDefaults).join(', ');
            const placeholders = Object.keys(dataWithDefaults).map(() => '?').join(', ');
            const values = Object.values(dataWithDefaults);

            const sql = `INSERT INTO orders (${columns}) VALUES (${placeholders})`;
            const result = await tx.executeSql(sql, values);
            const insertedId = result[0].insertId;

            console.log(`🧾 Order created successfully (local ID: ${insertedId})`);
        });

        return { success: true, message: 'Order saved locally' };
    } catch (error) {
        console.error('❌ createOrder error:', error);
        return { success: false, error: error.message };
    }
};