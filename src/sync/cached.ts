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

        return { success: true, data: res.data, fromCache: false };
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

        return { success: true, data: res.data, fromCache: false };
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
  const localCartId = `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  try {
    const generatedCartId = await new Promise<number>((resolve, reject) => {
      db.transaction(
        (tx) => {
          // 1️⃣ Insert cart
          tx.executeSql(
            `
            INSERT INTO carts (
              id_currency, id_lang, id_customer,
              id_address_delivery, id_address_invoice,
              local_cart_id, is_dirty
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              id_currency,
              id_lang,
              id_customer,
              id_address_delivery,
              id_address_invoice,
              localCartId,
              1,
            ],
            (txObj, resultSet) => {
              const newCartId = resultSet.insertId;
              console.log(`🛒 New cart created with ID: ${newCartId}`);

              // 2️⃣ Insert items
              products.forEach((product) => {
                txObj.executeSql(
                  `
                  INSERT OR IGNORE INTO cart_items (
                    cart_id, id_product, id_product_attribute, quantity, id_address_delivery
                  ) VALUES (?, ?, ?, ?, ?)
                  `,
                  [
                    newCartId,
                    product.id_product,
                    product.id_product_attribute || 0,
                    product.quantity,
                    id_address_delivery,
                  ],
                  () => {
                    console.log(`📦 Added product ${product.id_product} x${product.quantity}`);
                  },
                  (txErr, err) => {
                    console.error('❌ cart_item insert error:', err);
                    return false; // continue transaction
                  }
                );
              });

              resolve(newCartId);
            },
            (txErr, err) => {
              console.error('❌ cart insert error:', err);
              reject(err);
              return false;
            }
          );
        },
        (error) => reject(error),
        () => console.log('✅ transaction success')
      );
    });

    return {
      success: true,
      message: 'Cart created successfully',
      data: { cart: { id: generatedCartId } },
    };
  } catch (error: any) {
    console.error('❌ createCart error (detailed):', error);
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
            // ✅ Define the valid columns from your simplified schema
            const validColumns = [
                'id_cart',
                'id_employee',
                'id_customer',
                'id_carrier',
                'id_address_delivery',
                'id_address_invoice',
                'id_currency',
                'id_lang',
                'module',
                'payment',
                'total_products',
                'total_products_wt',
                'total_paid',
                'total_paid_real',
                'total_shipping',
                'total_shipping_tax_incl',
                'total_shipping_tax_excl',
                'conversion_rate',
                'is_dirty',
                'sync_attempts',
                'last_sync_error',
                'order_status',
                'remote_order_id',
                'last_synced_at',
            ];

            // ✅ Merge defaults for local tracking
            const dataWithDefaults = {
                order_status: 'pending',
                is_dirty: 1,
                sync_attempts: 0,
                last_sync_error: null,
                remote_order_id: null,
                ...orderData,
            };

            // ✅ Filter only valid columns that exist in the table
            const filteredEntries = Object.entries(dataWithDefaults).filter(([key]) =>
                validColumns.includes(key)
            );

            const columns = filteredEntries.map(([key]) => key).join(', ');
            const placeholders = filteredEntries.map(() => '?').join(', ');
            const values = filteredEntries.map(([_, value]) => value);

            const sql = `INSERT INTO orders (${columns}) VALUES (${placeholders})`;

            const result = await tx.executeSql(sql, values);
            const insertedId = result[1]?.insertId;

            console.log(`🧾 Order created successfully (local ID: ${insertedId})`);
        });

        return { success: true, message: 'Order saved locally' };
    } catch (error: any) {
        console.error('❌ createOrder error:', error);
        return { success: false, error: error?.message || JSON.stringify(error) };
    }
};

export const cachedDataForCustomers = async (
  tableName: string,
  apiCall: () => Promise<any>,
  search: string | number,
  idColumn: string = 'id'
) => {
  try {
    console.log(`⚡️ Cached API call for ${tableName}...`);

    // 1️⃣ Try local DB first
    let localData: any[] = [];

    if (!isNaN(Number(search))) {
      localData = await queryData(tableName, `${idColumn} = ?`, [Number(search)]);
    } else if (typeof search === 'string' && search.trim() !== '') {
      const nameParts = search.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[1] || '';
      if (lastName)
        localData = await queryData(
          tableName,
          `firstname LIKE ? AND lastname LIKE ?`,
          [`%${firstName}%`, `%${lastName}%`]
        );
      else
        localData = await queryData(tableName, `firstname LIKE ?`, [`%${firstName}%`]);
    }

    if (localData.length > 0) {
      console.log(`📦 Found customer(s) in local DB`);
      return { success: true, data: { customers: localData }, fromCache: true };
    }

    // 2️⃣ If not found locally → call API
    console.log(`🌐 Customer(s) not found locally, calling API...`);
    const res = await apiCall();
    const apiCustomers = res.data?.customers || [];

    // 3️⃣ Save minimal info to SQLite
    if (apiCustomers.length > 0) {
      for (const c of apiCustomers) {
        const minimal = {
          id: parseInt(c.id),
          firstname: c.firstname,
          lastname: c.lastname,
          email: c.email,
          codice_cmnr: c.codice_cmnr,
          company: c.company,
        };
        await insertIfNotExists(tableName, minimal, idColumn);
      }
      console.log(`💾 Saved customer(s) to local DB`);
    }

    return { success: true, data: res.data, fromCache: false };
  } catch (error: any) {
    console.error(`❌ Cached customer fetch error:`, error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

export const cachedDataForProducts = async (
  tableName: string,
  apiCall: () => Promise<any>,
  search: string,
  idColumn: string = 'id'
) => {
  try {
    console.log(`⚡️ Cached API call for ${tableName}...`);

    // 1️⃣ Try local DB
    const localData = await queryData(tableName, `name LIKE ?`, [`%${search}%`]);

    if (localData.length > 0) {
      console.log(`📦 Found products in local DB`);
      return { success: true, data: { products: localData }, fromCache: true };
    }

    // 2️⃣ Not found locally → call API
    console.log(`🌐 Products not found locally, calling API...`);
    const res = await apiCall();
    const apiProducts = res.data?.products || [];

    // 3️⃣ Save all product data to SQLite
    if (apiProducts.length > 0) {
      for (const p of apiProducts) {
        const productData = {
          id: parseInt(p.id),
          id_default_image: p.id_default_image,
          minimal_quantity: p.minimal_quantity,
          price: parseFloat(p.price),
          name: p.name,
        };
        await insertIfNotExists(tableName, productData, idColumn);
      }
      console.log(`💾 Saved products to local DB`);
    }

    return { success: true, data: res.data, fromCache: false };
  } catch (error: any) {
    console.error(`❌ cachedDataForProducts error:`, error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

/**
 * Cached search for client addresses.
 * First search local SQLite, if not found call API via passed function and save.
 */
export const cachedClientAddresses = async (
  client_id: string | number | null,
  apiCall: () => Promise<any>
) => {
  const tableName = 'addresses';
  try {
    console.log(`⚡ Searching addresses for client ${client_id} locally...`);

    // 1️⃣ Try local DB
    let localData: any[] = [];
    if (client_id) {
      localData = await queryData(tableName, `id_customer = ?`, [client_id]);
    }

    if (localData.length > 0) {
      console.log(`📦 Found addresses in local DB`);
      return { success: true, data: { addresses: localData }, fromCache: true };
    }

    // 2️⃣ Not found locally → call API
    console.log(`🌐 Addresses not found locally, calling API...`);
    const res = await apiCall();
    const apiAddresses = res.data?.addresses || [];

    // 3️⃣ Save all JSON data to SQLite
    if (apiAddresses.length > 0) {
      for (const a of apiAddresses) {
        const addressData = { ...a };
        await insertIfNotExists(tableName, addressData, 'id');
      }
      console.log(`💾 Saved addresses to local DB`);
    }

    return { success: true, data: res.data, fromCache: false };
  } catch (error: any) {
    console.error('❌ cachedClientAddresses error:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};