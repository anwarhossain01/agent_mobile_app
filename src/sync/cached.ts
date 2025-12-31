import { checkAllProductStock, checkProductStock, clientAddressGet, getActiveCategories, getAllProducts, getCachedProductStock, getClientsForAgent, getCouriers, getDeliveries } from "../api/prestashop";
import { getDBConnection, insertIfNotExists, queryData } from "../database/db";
import NetInfo from "@react-native-community/netinfo";
import { store } from "../store";
import { selectCurrentCustomerLength, selectLastCustomerPageSynced, setCustomerSyncStatus, setLastCutomerSyncDate, setSyncing, setSyncStatusText, setTotalCustomersFromServer } from "../store/slices/databaseStatusSlice";
import { setTotalCategoryLength, setTotalProductNumber } from "../store/slices/categoryTreeSlice";
const PAGE_SIZE = 100;

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
        //  console.log(`📦 Data found in local database: ${tableName}`);
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
    //  console.log(`🌐 Data not found locally, calling API for ${tableName}...`);
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
      //  console.log(`💾 ${tableName} data saved to local database`);
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
    //  console.log(`⚡️ Cached API call for ${tableName}...`);

    // 1️⃣ Try local DB if id_carrier provided
    if (id_carrier) {
      const localData = await queryData(tableName, `id_carrier = ?`, [id_carrier]);

      if (localData.length > 0) {
        //    console.log(`📦 Deliveries found in local database for carrier ${id_carrier}`);

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
    //    console.log(`🌐 No local deliveries found, calling API...`);
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
      //   console.log(`💾 Deliveries saved to local database`);
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
              //  console.log(`🛒 New cart created with ID: ${newCartId}`);

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
                    //  console.log(`📦 Added product ${product.id_product} x${product.quantity}`);
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

      //  console.log(`🧾 Order created successfully (local ID: ${insertedId})`);
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
  search: string | number | null,
  idColumn: string = 'id'
) => {
  try {
    //  console.log(`⚡️ Cached API call for ${tableName}...`);

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
      //   console.log(`📦 Found customer(s) in local DB`);
      return { success: true, data: { customers: localData }, fromCache: true };
    }

    // 2️⃣ If not found locally → call API
    //  console.log(`🌐 Customer(s) not found locally, calling API...`);
    const res = await apiCall();
    const apiCustomers = res.data?.customers || [];

    // 3️⃣ Save minimal info to SQLite
    if (apiCustomers.length > 0) {
      for (const c of apiCustomers) {
        const minimal = {
          id: parseInt(c.id),
          id_customer: parseInt(c.id_customer),
          firstname: c.firstname,
          lastname: c.lastname,
          email: c.email,
          codice_cmnr: c.codice_cmnr,
          company: c.company,
          numero_ordinale: c.numero_ordinale || null,
          postcode: c.postcode || null,
          address1: c.address1 || null,
          city: c.city || null,
        };
        await insertIfNotExists(tableName, minimal, idColumn);
      }
      //   console.log(`💾 Saved customer(s) to local DB`);
    }

    return { success: true, data: res.data, fromCache: false };
  } catch (error: any) {
    console.error(`❌ Cached customer fetch error:`, error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

export const cachedDataForAgentFrontPage = async (
  tableName: string,
  apiCall: () => Promise<any>,
  search: string | number | null,
  city: string | null,
  numero_ordinale: string | number | null,
  cap: string | number | null,
  idColumn: string = 'id'
) => {
  try {
    //  console.log(`⚡️ Cached API call for ${tableName}...`);

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search === null || (typeof search === 'string' && search.trim() === '')) {
      whereClauses.push('1=1');
    } else if (!isNaN(Number(search))) {
      whereClauses.push(`${idColumn} = ?`);
      params.push(Number(search));
    } else if (typeof search === 'string') {
      const term = search.trim();
      const nameParts = term.split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      if (lastName) {
        // Multi-part: prefer full name match, but also allow city matches
        whereClauses.push(`
      (
        (firstname LIKE ? AND lastname LIKE ?)
        OR city LIKE ?
      )
    `);
        params.push(`%${firstName}%`, `%${lastName}%`, `%${term}%`);
      } else {
        // Single word: match first, last, OR city
        whereClauses.push(`
      (
        firstname LIKE ?
        OR lastname LIKE ?
        OR city LIKE ?
      )
    `);
        params.push(`%${term}%`, `%${term}%`, `%${term}%`);
      }
    }

    if (city && city.trim() !== '') {
      whereClauses.push(`city LIKE ?`);
      params.push(`%${city.trim()}%`);
    }

    if (numero_ordinale && numero_ordinale.toString().trim() !== '') {
      whereClauses.push(`numero_ordinale LIKE ?`);
      params.push(`${numero_ordinale.toString().trim()}`);
    }

    if (cap && cap.toString().trim() !== '') {
      whereClauses.push(`postcode LIKE ?`);
      params.push(`%${cap.toString().trim()}%`);
    }

    const whereClause = whereClauses.join(' AND ');
    //  console.log('🧩 Query condition:', whereClause, params);

    const localData = await queryData(tableName, whereClause, params);

    // if (localData.length > 0) {
    //   console.log(`📦 Found ${localData.length} record(s) in local DB`);
    return localData;
    // }
    // we might need to call the api, so we are gonna keep this code just in case
    console.log(`🌐 Not found locally, calling API...`);
    const res = await apiCall();
    const apiCustomers = res.data?.customers || [];

    if (apiCustomers.length > 0) {
      for (const c of apiCustomers) {
        const minimal = {
          id: parseInt(c.id),
          id_customer: parseInt(c.id_customer),
          firstname: c.firstname,
          lastname: c.lastname,
          email: c.email,
          codice_cmnr: c.codice_cmnr || null,
          company: c.company || null,
          numero_ordinale: c.numero_ordinale || null,
          postcode: c.postcode || null,
          address1: c.address1 || null,
          city: c.city || null,
        };
        await insertIfNotExists(tableName, minimal, idColumn);
      }
      console.log(`💾 Cached ${apiCustomers.length} customer(s) locally`);
    }

    return res.data;
  } catch (error: any) {
    console.error(`❌ cachedDataForAgentFrontPage error:`, error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

export const cachedDataForProducts = async (
  tableName: string,
  apiCall: () => Promise<any>,
  search: string,
  idColumn: string = 'id_product'
) => {
  try {
    //  console.log(` Cached API call for ${tableName}...`);

    // 1 Try local DB
    const localData = await queryData(tableName, `name LIKE ?`, [`%${search}%`]);

    if (localData.length > 0) {
      //   console.log(`📦 Found products in local DB`);
      return { success: true, data: { products: localData }, fromCache: true };
    }

    // 2 Not found locally → call API
    // console.log(`🌐 Products not found locally, calling API...`);
    const res = await apiCall();
    const apiProducts = res.data?.products || [];

    // 3 Save all product data to SQLite
    if (apiProducts.length > 0) {
      for (const p of apiProducts) {
        const productData = {
          id: parseInt(p.id),
          id_default_image: p.id_default_image,
          id_category_default: p.id_category_default,
          minimal_quantity: p.minimal_quantity,
          price: parseFloat(p.price),
          name: p.name,
        };
        await insertIfNotExists(tableName, productData, idColumn);
      }
      //  console.log(`💾 Saved products to local DB`);
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
    //  console.log(`⚡ Searching addresses for client ${client_id} locally...`);

    // 1️⃣ Try local DB
    let localData: any[] = [];
    if (client_id) {
      localData = await queryData(tableName, `id_customer = ?`, [client_id]);
    }

    if (localData.length > 0) {
      //   console.log(`📦 Found addresses in local DB`);
      return { success: true, data: { addresses: localData }, fromCache: true };
    }

    // 2️⃣ Not found locally → call API
    //  console.log(`🌐 Addresses not found locally, calling API...`);
    const res = await apiCall();
    const apiAddresses = res.data?.addresses || [];

    // 3️⃣ Save all JSON data to SQLite
    if (apiAddresses.length > 0) {
      for (const a of apiAddresses) {
        const addressData = { ...a };
        await insertIfNotExists(tableName, addressData, 'id');
      }
      //   console.log(`💾 Saved addresses to local DB`);
    }

    return { success: true, data: res.data, fromCache: false };
  } catch (error: any) {
    console.error('❌ cachedClientAddresses error:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

export const cachedProductStock = async (
  product_id: string | number,
  apiCall: () => Promise<any>
) => {
  const tableName = 'product_stock';
  try {
    //  console.log(`⚡ Checking stock for product ${product_id} locally...`);

    // 1️⃣ Try local DB
    const localData = await queryData(tableName, `id_product = ?`, [product_id]);

    if (localData.length > 0) {
      //  console.log(`📦 Found product stock in local DB`);
      return {
        success: true,
        data: { stock_availables: localData },
        fromCache: true,
      };
    }

    // 2️⃣ Not found locally → call API
    //console.log(`🌐 Stock not found locally, calling API...`);
    const res = await apiCall();
    const stockItem = res.data?.stock_availables?.[0];

    // 3️⃣ Save only the first object
    if (stockItem) {
      const stockData = {
        id_product: stockItem.id_product,
        id_product_attribute: stockItem.id_product_attribute,
        quantity: stockItem.quantity,
        depends_on_stock: stockItem.depends_on_stock,
        out_of_stock: stockItem.out_of_stock,
      };
      await insertIfNotExists(tableName, stockData, 'id_product');
      //  console.log(`💾 Saved stock for product ${product_id} to local DB`);
    }

    return { success: true, data: res.data, fromCache: false };
  } catch (error: any) {
    console.error('❌ cachedProductStock error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

export const initializeAllProductStock = async () => {
  const tableName = 'product_stock';
  try {

    // 1 Call the API
    const res = await checkAllProductStock();

    if (!res.success || !res.data?.stock_availables) {
      throw new Error(res.error || 'Failed to fetch all product stocks');
    }

    const db = await getDBConnection();
    const stockList = res.data.stock_availables;
    let insertedCount = 0;

    // 2 Loop through all stock items
    for (const stockItem of stockList) {
      if (!stockItem?.id_product) continue; // sanity check
      store.dispatch(setSyncStatusText('Stocking product ' + stockItem.id_product));
      const stockData = {
        id_product: stockItem.id_product,
        id_product_attribute: stockItem.id_product_attribute,
        quantity: stockItem.quantity,
        depends_on_stock: stockItem.depends_on_stock,
        out_of_stock: stockItem.out_of_stock,
      };

      // 3 Save only if not exists
      const inserted = await insertIfNotExists(tableName, stockData, 'id_product');
      if (inserted) insertedCount++;
    }

    //  console.log(` Stock initialization complete — ${insertedCount} new records saved.`);
    return { success: true, insertedCount };
  } catch (error: any) {
    console.error('❌ initializeAllProductStock error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

export const storeAgentFromJson = async (agentResponse: any) => {
  try {
    const db = await getDBConnection();

    // extract required fields only
    const id_employee = agentResponse?.employee?.id;
    const email = agentResponse?.employee?.email;
    const id_profile = agentResponse?.employee?.id_profile;
    const token = agentResponse?.token;

    if (!id_employee || !email || !token) {
      //   console.log('❌ Missing required fields in agent JSON');
      return { success: false, error: 'Missing fields' };
    }

    // store the agent info in the table
    await db.executeSql(
      `
      INSERT OR IGNORE INTO agent (id_employee, token, email, id_profile)
      VALUES (?, ?, ?, ?)
      `,
      [id_employee, token, email, id_profile]
    );
    //
    //  console.log('✅ Agent data stored successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error storing agent:', error);
    return { success: false, error: error.message };
  }
};

export const storeServerOrders = async (ordersResponse: any[]) => {
  try {
    const db = await getDBConnection();

    if (!Array.isArray(ordersResponse) || ordersResponse.length === 0) {
      //   console.log('❌ No orders to store');
      return { success: false, error: 'Empty response' };
    }

    // sort by date_add descending, get latest 5
    const latestOrders = ordersResponse
      .sort((a, b) => new Date(b.date_add).getTime() - new Date(a.date_add).getTime())
      .slice(0, 5);

    // loop insert each
    for (const order of latestOrders) {
      const { company, firstname, lastname, id_order, reference, total_paid, date_add } = order;

      await db.executeSql(
        `
        INSERT OR IGNORE INTO server_orders
        (company, firstname, lastname, id_order, reference, total_paid, date_add)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [company, firstname, lastname, id_order, reference, parseFloat(total_paid), date_add]
      );
    }

    //  console.log(`✅ Stored ${latestOrders.length} latest server orders`);
    return { success: true, count: latestOrders.length };
  } catch (error) {
    console.error('❌ Error storing server orders:', error);
    return { success: false, error: error.message };
  }
};

export const getLatestServerOrders = async (employeeId: number = 0) => {
  try {
    const whereClause = '1=1 ORDER BY date_add DESC LIMIT 5';
    const latestOrders = await queryData('server_orders', whereClause);

    //  console.log('🧾 Latest 5 server orders:', latestOrders);

    // return the array directly
    return latestOrders || [];
  } catch (error) {
    console.error('❌ Error fetching latest server orders:', error);
    return [];
  }
};

export const cacheInitializer = async (agentId: any) => {
  //  console.log("🧠 Starting cache initialization for agent:", agentId);

  try {

    // disaster starts from here, take a look
    // // 1 Fetch Customers = lotta customer, blow up phone. jk
    // const customersRes = await getClientsForAgent(agentId);
    // const customers = customersRes || [];
    // //  console.log(`📦 Got ${customers.length} customers`);

    // // 2 Insert customers
    // for (const c of customers) {
    //   const customerData = {
    //     id_customer: c.id_customer,
    //     firstname: c.firstname,
    //     lastname: c.lastname,
    //     email: c.email,
    //     codice_cmnr: c.codice_cmnr || '',
    //     company: c.company || '',
    //     numero_ordinale: c.numero_ordinale || '',
    //     postcode: c.postcode || '',
    //     address1: c.address1 || '',
    //     city: c.city || '',
    //   };

    //   await insertIfNotExists('customers', customerData, 'id_customer');

    //   // 3 Fetch addresses for this customer
    //   const addrRes = await clientAddressGet(c.id_customer);
    //   const addresses = addrRes?.data?.addresses || [];
    //   //  console.log(`🏠 Customer ${c.id_customer} → ${addresses.length} addresses`);

    //   for (const a of addresses) {
    //     const addrData = {
    //       id: a.id,
    //       id_customer: a.id_customer,
    //       id_manufacturer: a.id_manufacturer,
    //       id_supplier: a.id_supplier,
    //       id_warehouse: a.id_warehouse,
    //       id_country: a.id_country,
    //       id_state: a.id_state,
    //       alias: a.alias,
    //       company: a.company,
    //       lastname: a.lastname,
    //       firstname: a.firstname,
    //       vat_number: a.vat_number,
    //       address1: a.address1,
    //       address2: a.address2,
    //       postcode: a.postcode,
    //       city: a.city,
    //       other: a.other,
    //       phone: a.phone,
    //       phone_mobile: a.phone_mobile,
    //       dni: a.dni,
    //       deleted: a.deleted,
    //       date_add: a.date_add,
    //       date_upd: a.date_upd,
    //       numero_esercizio: a.numero_esercizio,
    //       codice_cmnr: a.codice_cmnr,
    //       numero_ordinale: a.numero_ordinale,
    //     };

    //     await insertIfNotExists('addresses', addrData, 'id');
    //   }
    // }

    // 4 Get courier info (always id 27)
    // this needs to go at its own function, this is not related to the customer so I think we should move it to a separate function
    const courierRes = await getCouriers(27);
    const carrier = courierRes?.data?.carriers?.[0];
    if (carrier) {
      const carrierData = {
        id: carrier.id,
        name: carrier.name,
        active: parseInt(carrier.active),
        is_free: parseInt(carrier.is_free),
        delay: carrier.delay,
      };
      await insertIfNotExists('carriers', carrierData, 'id');
      //  console.log(" Courier cached:", carrier.name);

      // 5 Get deliveries for this courier
      const delivRes = await getDeliveries(carrier.id);
      const deliveries = delivRes?.data?.deliveries || [];
      //  console.log(`📦 Found ${deliveries.length} deliveries for carrier ${carrier.id}`);

      for (const d of deliveries) {
        const deliveryData = {
          id: d.id,
          id_carrier: d.id_carrier,
          id_zone: d.id_zone,
          price: parseFloat(d.price),
        };
        await insertIfNotExists('deliveries', deliveryData, 'id');
      }
    } else {
      console.warn("⚠️ No courier data found for ID 27");
    }

    return { success: true };
  } catch (error) {
    console.error("💀 Cache initialization failed:", error);
    return { success: false, error: error.message };
  }
};

function bigNumberGenerator() {
  const min = 1_000_000_000_00;
  const max = Number.MAX_SAFE_INTEGER;

  return Math.floor(Math.random() * (max - min)) + min;
}

export const saveCategoryTree = async (data: any[]) => {

  const db = await getDBConnection();
  //console.log("data you sent ", data);

  // Step 1: Flatten the data into separate arrays
  const categories: any[] = [];
  const subcategories: any[] = [];
  const products: any[] = [];

  for (const category of data) {
    categories.push({ id: category.id, name: category.name });
    //console.log("This category id is ", category.id );

    for (const sub of category.subcategories || []) {
      // console.log("I am inserting products for sub id ", sub.id , " and category id ", category.id, category.name);

      if (sub.id != null && sub.name != null) {
        subcategories.push({ id: sub.id, name: sub.name || category.name, category_id: category.id });
      }
      for (const p of sub.products || []) {
        products.push({
          id_product: p.id_product,
          subcategory_id: sub.id || category.id,
          id_supplier: p.id_supplier,
          id_manufacturer: p.id_manufacturer,
          id_category_default: p.id_category_default,
          id_default_image: p.id_default_image,
          id_shop_default: p.id_shop_default,
          id_tax_rules_group: p.id_tax_rules_group,
          on_sale: p.on_sale,
          online_only: p.online_only,
          ean13: p.ean13,
          isbn: p.isbn,
          upc: p.upc,
          mpn: p.mpn,
          ecotax: p.ecotax,
          quantity: p.quantity,
          minimal_quantity: p.minimal_quantity,
          low_stock_threshold: p.low_stock_threshold,
          low_stock_alert: p.low_stock_alert,
          price: p.price,
          wholesale_price: p.wholesale_price,
          unity: p.unity,
          unit_price: p.unit_price,
          unit_price_ratio: p.unit_price_ratio,
          additional_shipping_cost: p.additional_shipping_cost,
          reference: p.reference,
          supplier_reference: p.supplier_reference,
          location: p.location,
          width: p.width,
          height: p.height,
          depth: p.depth,
          weight: p.weight,
          out_of_stock: p.out_of_stock,
          additional_delivery_times: p.additional_delivery_times,
          quantity_discount: p.quantity_discount,
          customizable: p.customizable,
          uploadable_files: p.uploadable_files,
          text_fields: p.text_fields,
          active: p.active,
          redirect_type: p.redirect_type,
          id_type_redirected: p.id_type_redirected,
          available_for_order: p.available_for_order,
          available_date: p.available_date,
          show_condition: p.show_condition,
          condition: p.condition,
          show_price: p.show_price,
          indexed: p.indexed,
          visibility: p.visibility,
          cache_is_pack: p.cache_is_pack,
          cache_has_attachments: p.cache_has_attachments,
          is_virtual: p.is_virtual,
          cache_default_attribute: p.cache_default_attribute,
          date_add: p.date_add,
          date_upd: p.date_upd,
          advanced_stock_management: p.advanced_stock_management,
          pack_stock_type: p.pack_stock_type,
          state: p.state,
          product_type: p.product_type,
          accisa: p.accisa,
          id_shop: p.id_shop,
          id_lang: p.id_lang,
          link_rewrite: p.link_rewrite,
          description: p.description,
          description_short: p.description_short,
          meta_description: p.meta_description,
          meta_keywords: p.meta_keywords,
          meta_title: p.meta_title,
          name: p.name,
          available_now: p.available_now,
          available_later: p.available_later,
          delivery_in_stock: p.delivery_in_stock,
          delivery_out_stock: p.delivery_out_stock,
          manufacturer_name: p.manufacturer_name,
          supplier_name: p.supplier_name,
          rate: p.rate,
          tax_name: p.tax_name,
        });
      }
    }
  }

  // Step 2: Categories transaction
  store.dispatch(setSyncStatusText('Fetching List '));
  store.dispatch(setTotalCategoryLength(categories.length));
  const uniqueProducts = Array.from(
    new Map(products.map(p => [p.id_product, p])).values()
  );

  store.dispatch(setTotalProductNumber(uniqueProducts.length));


  try {
    for (const cat of categories) {
      await db.executeSql(
        `INSERT OR REPLACE INTO category_tree_categories (id, name) VALUES (?, ?)`,
        [cat.id, cat.name]
      );
    }
    // console.log('✅ Categories saved.');
    store.dispatch(setSyncStatusText('✅ Categories saved.'));
  } catch (error) {
    console.log('❌ Categories save error:', error);
  }

  // Step 3: Subcategories
  try {
    for (const sub of subcategories) {
      await db.executeSql(
        `INSERT OR REPLACE INTO category_tree_subcategories (id, name, category_id) VALUES (?, ?, ?)`,
        [sub.id, sub.name, sub.category_id]
      );
    }
    store.dispatch(setSyncStatusText('✅ Subcategories saved.'));
    // console.log('✅ Subcategories saved.');
  } catch (error) {
    console.log('❌ Subcategories save error:', error);
  }

  // Step 4: Products
  try {
    let productCount = 0;
    for (const p of products) {
      productCount++;
      store.dispatch(setSyncStatusText(`Saving Product ${productCount}`));
      await db.executeSql(
        `INSERT OR REPLACE INTO category_tree_products (
        id_product, subcategory_id, id_supplier, id_manufacturer, id_category_default, id_default_image, id_shop_default, id_tax_rules_group,
        on_sale, online_only, ean13, isbn, upc, mpn, ecotax, quantity, minimal_quantity, low_stock_threshold, low_stock_alert,
        price, wholesale_price, unity, unit_price, unit_price_ratio, additional_shipping_cost,
        reference, supplier_reference, location, width, height, depth, weight, out_of_stock, additional_delivery_times,
        quantity_discount, customizable, uploadable_files, text_fields, active, redirect_type, id_type_redirected,
        available_for_order, available_date, show_condition, condition, show_price, indexed, visibility,
        cache_is_pack, cache_has_attachments, is_virtual, cache_default_attribute, date_add, date_upd,
        advanced_stock_management, pack_stock_type, state, product_type, accisa, id_shop, id_lang, link_rewrite,
        description, description_short, meta_description, meta_keywords, meta_title, name, available_now,
        available_later, delivery_in_stock, delivery_out_stock, manufacturer_name, supplier_name, rate, tax_name
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        Object.values(p)
      );
    }
    // console.log('✅ Products saved.');
    store.dispatch(setSyncStatusText('✅ Products saved.'));
  } catch (error) {
    console.log('❌ Products save error:', error);
  }

  return { categories, subcategories, products }; // optional, for reuse
};

/**
 * Universal function to check if a product can be added to the cart.
 * Returns an object describing what happened.
 */
export const verifyProductStock = async (product: any) => {
  try {
    // check if we have internet
    const state = await NetInfo.fetch();
    let stockRes = null;

    if (state.isConnected) {
      stockRes = await checkProductStock(product.id);
    } else {
      stockRes = await getCachedProductStock(product.id);
    }

    const stockData = stockRes?.data?.stock_availables?.[0];

    if (!stockData) {
      return { success: false, reason: "Stock information unavailable" };
    }

    // Out of stock
    if (stockData?.out_of_stock == 1) {
      return { success: false, reason: "Prodotto non disponibile in magazzino" };
    }

    // Depends on stock — check quantity
    if (stockData?.depends_on_stock === "1") {
      const availableStock = parseInt(stockData.quantity) || 0;

      if (availableStock <= 0) {
        return { success: false, reason: "Prodotto non disponibile in magazzino" };
      }

      // All good
      return {
        success: true,
        data: {
          quantity: parseInt(product.minimal_quantity) || 1,
          max_quantity: availableStock,
          price: parseFloat(product.price || 0),
          name: product.name,
          product_id: product.id,
          accisa: product.accisa || 0
        },
      };
    }

    // Doesn't depend on stock — just add
    return {
      success: true,
      data: {
        quantity: parseInt(product.minimal_quantity) || 1,
        max_quantity: stockData.quantity != 0 ? stockData.quantity : null,
        price: parseFloat(product.price || 0),
        name: product.name,
        product_id: product.id,
        accisa: product.accisa || 0
      },
    };
  } catch (err) {
    console.log("Stock check failed:", err);
    return { success: false, reason: "Errore durante la verifica dello stock" };
  }
};

export const clearDatabase = async () => {
  const db = await getDBConnection();

  return new Promise<void>((resolve, reject) => {
    db.transaction(
      (tx) => {
        // Disable FKs at transaction level
        tx.executeSql('PRAGMA foreign_keys = OFF;');

        const tables = [
          'cart_items',
          'carts',
          'orders',
          'server_orders',
          'deliveries',
          'addresses',
          'customers',
          'product_stock',
          'category_tree_products',
          'category_tree_subcategories',
          'category_tree_categories',
          'products',
          'carriers',
          'agent',
        ];

        // Run all DELETEs
        for (const table of tables) {
          tx.executeSql(`DELETE FROM \`${table}\`;`);

          // Reset autoincrement for tables with INTEGER PRIMARY KEY AUTOINCREMENT
          if (['carts', 'cart_items', 'agent', 'product_stock'].includes(table)) {
            tx.executeSql(`DELETE FROM sqlite_sequence WHERE name = ?;`, [table]);
          }
        }

        tx.executeSql('PRAGMA foreign_keys = ON;');
      },
      (error) => {
        console.error('❌ Transaction failed during DB clear:', error);
        reject(error);
      },
      () => {
        //   console.log(' Database cleared successfully');
        resolve();
      }
    );
  });
};

export const syncCustomersIncrementally = async (agentId: number | string) => {
  const nowIso = new Date().toISOString();
  store.dispatch(setSyncStatusText('Sincronizzazione clienti in corso...'));
  store.dispatch(setSyncing(true));
  store.dispatch(setLastCutomerSyncDate(nowIso));
  try {
    // Start from the *next* page
    let currentPage = selectLastCustomerPageSynced(store.getState()) + 1;
    let totalSynced = selectCurrentCustomerLength(store.getState());
    let batchInserted = 0;
    let actualLastCustomerId = 0;
    let customersRes = null;
    while (true) {

      // Fetch page
      customersRes = await getClientsForAgent(agentId, PAGE_SIZE, currentPage);
      const customers = Array.isArray(customersRes.customers) ? customersRes.customers : [];

      if (customers.length === 0) {
        console.log(`✅ No more customers at page ${currentPage} — sync complete.`);
        break;
      }
      store.dispatch(setSyncStatusText(
        `Pagina ${currentPage} (${totalSynced}/${customersRes.total_customers} clienti sincronizzati)`
      ));

      // Process batch
      for (const c of customers) {
        try {
          // Insert customer
          const customerData = {
            id_customer: c.id_customer,
            firstname: (c.firstname || '').trim(),
            lastname: (c.lastname || '').trim(),
            email: c.email || '',
            codice_cmnr: c.codice_cmnr || '',
            company: c.company || '',
            numero_ordinale: c.numero_ordinale || '',
            postcode: c.postcode || '',
            address1: c.address1 || '',
            city: c.city || '',
          };

          await insertIfNotExists('customers', customerData, 'id_customer');
          batchInserted++;
          actualLastCustomerId = customerData.id_customer;

          // Insert addresses (best-effort)
          try {
            const addrRes = await clientAddressGet(c.id_customer);
            const addresses = addrRes?.data?.addresses || [];
            for (const a of addresses) {
              const addrData = {
                id: a.id,
                id_customer: a.id_customer,
                id_manufacturer: a.id_manufacturer || 0,
                id_supplier: a.id_supplier || 0,
                id_warehouse: a.id_warehouse || 0,
                id_country: a.id_country || 0,
                id_state: a.id_state || 0,
                alias: a.alias || '',
                company: a.company || '',
                lastname: a.lastname || '',
                firstname: a.firstname || '',
                vat_number: a.vat_number || '',
                address1: a.address1 || '',
                address2: a.address2 || '',
                postcode: a.postcode || '',
                city: a.city || '',
                other: a.other || '',
                phone: a.phone || '',
                phone_mobile: a.phone_mobile || '',
                dni: a.dni || '',
                deleted: a.deleted || '0',
                date_add: a.date_add || '',
                date_upd: a.date_upd || '',
                numero_esercizio: a.numero_esercizio || '',
                codice_cmnr: a.codice_cmnr || '',
                numero_ordinale: a.numero_ordinale || '',
              };
              await insertIfNotExists('addresses', addrData, 'id');
            }
          } catch (addrErr) {
            console.warn(`⚠️ Skipping addresses for customer ${c.id_customer}:`, addrErr.message);
          }
        } catch (custErr) {
          console.warn(`❌ Failed to sync customer ${c.id_customer}:`, custErr.message);
        }
      }

      // Update global state
      totalSynced += batchInserted;
      store.dispatch(setCustomerSyncStatus({
        current_customer_length: totalSynced,
        last_customer_id: actualLastCustomerId,
        last_customer_page_synced: currentPage,
      }));

      console.log(`✅ Page ${currentPage}: ${batchInserted} customers synced`);
      currentPage++;
      batchInserted = 0;
    }
    store.dispatch(setTotalCustomersFromServer(customersRes.total_customers));
    store.dispatch(setSyncStatusText(
      `✅ Clienti sincronizzati: ${totalSynced} salvati`
    ));
  } catch (error) {
    console.error('❌ Customer sync failed:', error);
    store.dispatch(setSyncStatusText(`⚠️ Errore sincronizzazione: ${error.message}`));
    throw error;
  } finally {
    store.dispatch(setSyncing(false));
  }
};

export const syncCourierData = async () => {
  store.dispatch(setSyncStatusText('Sincronizzazione corrieri in corso...'));
  store.dispatch(setSyncing(true));

  try {
    const courierRes = await getCouriers(27);
    const carrier = courierRes?.data?.carriers?.[0];

    if (!carrier) {
      throw new Error('No courier data for ID 27');
    }

    const carrierData = {
      id: carrier.id,
      name: carrier.name,
      active: parseInt(carrier.active),
      is_free: parseInt(carrier.is_free),
      delay: carrier.delay,
    };

    await insertIfNotExists('carriers', carrierData, 'id');

    const delivRes = await getDeliveries(carrier.id);
    const deliveries = delivRes?.data?.deliveries || [];

    for (const d of deliveries) {
      const deliveryData = {
        id: d.id,
        id_carrier: d.id_carrier,
        id_zone: d.id_zone,
        price: parseFloat(d.price),
      };
      await insertIfNotExists('deliveries', deliveryData, 'id');
    }

    store.dispatch(setSyncStatusText('✅ Corrieri sincronizzati'));
  } catch (error) {
    console.error('❌ Courier sync failed:', error);
    store.dispatch(setSyncStatusText(`⚠️ Errore corrieri: ${error.message}`));
    throw error;
  } finally {
    store.dispatch(setSyncing(false));
  }
};
export const upsertCustomer = async (customer: any) => {
  // 1 Upsert customer using insertIfNotExists
  const customerData = {
    id_customer: customer.id_customer,
    firstname: (customer.firstname || '').trim(),
    lastname: (customer.lastname || '').trim(),
    email: customer.email || '',
    codice_cmnr: customer.codice_cmnr || '',
    company: customer.company || '',
    numero_ordinale: customer.numero_ordinale || '',
    postcode: customer.postcode || '',
    address1: customer.address1 || '',
    city: customer.city || '',
  };


  await insertIfNotExists('customers', customerData, 'id_customer');

  // 2 Fetch & insert addresses
  try {
    const addrRes = await clientAddressGet(customer.id_customer);
    const addresses = addrRes?.data?.addresses || [];

    for (const a of addresses) {
      const addrData = {
        id: a.id,
        id_customer: a.id_customer,
        id_manufacturer: a.id_manufacturer || 0,
        id_supplier: a.id_supplier || 0,
        id_warehouse: a.id_warehouse || 0,
        id_country: a.id_country || 0,
        id_state: a.id_state || 0,
        alias: a.alias || '',
        company: a.company || '',
        lastname: a.lastname || '',
        firstname: a.firstname || '',
        vat_number: a.vat_number || '',
        address1: a.address1 || '',
        address2: a.address2 || '',
        postcode: a.postcode || '',
        city: a.city || '',
        other: a.other || '',
        phone: a.phone || '',
        phone_mobile: a.phone_mobile || '',
        dni: a.dni || '',
        deleted: a.deleted || '0',
        date_add: a.date_add || '',
        date_upd: a.date_upd || '',
        numero_esercizio: a.numero_esercizio || '',
        codice_cmnr: a.codice_cmnr || '',
        numero_ordinale: a.numero_ordinale || '',
      };

      //  Use your existing universal function
      await insertIfNotExists('addresses', addrData, 'id');
    }

    if (addresses.length > 0) {
      console.log(` ...Saved ${addresses.length} address(es) for customer ${customer.id_customer}`);
    }
  } catch (addrErr) {
    console.warn(`⚠️ Skipping addresses for customer ${customer.id_customer}:`, addrErr.message);
  }
};
export const getProductsCached = async (
  category_id: number | string | null = null,
  search: string = "",
) => {
  try {
    let params: any[] = [];
    const conditions: string[] = [];

    if (category_id != null) {
      conditions.push('subcategory_id = ?');
      params.push(Number(category_id));
    }

    if (search.trim() !== '') {
      conditions.push('name LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.join(' AND ');

    let rows = await queryData('category_tree_products', whereClause, params);
    //console.log('📦 SQLite: Loaded', rows.length, 'products');

    // FALLBACK SEARCH
    // if (rows.length === 0 && category_id != null) {
    //   console.log('🔁 Retry with id_category_default');

    //   const fallbackConditions: string[] = [];
    //   const fallbackParams: any[] = [];

    //   fallbackConditions.push('id_category_default = ?');
    //   fallbackParams.push(Number(category_id));

    //   if (search.trim() !== '') {
    //     fallbackConditions.push('name LIKE ?');
    //     fallbackParams.push(`%${search.trim()}%`);
    //   }

    //   const fallbackWhere = fallbackConditions.join(' AND ');

    //   rows = await queryData('category_tree_products', fallbackWhere, fallbackParams);
    //   console.log('📦 SQLite fallback loaded', rows.length, 'products');
    // }

    // console.log(' SQLite: Loaded', rows);

    return rows.map(row => ({
      id: row.id_product,
      id_product: row.id_product,
      id_category_default: row.id_category_default,
      reference: row.reference || '',
      ean13: row.ean13 || '',
      isbn: row.isbn || '',
      upc: row.upc || '',

      name: row.name || '',
      link_rewrite: row.link_rewrite || '',
      meta_title: row.meta_title || '',
      meta_description: row.meta_description || '',
      meta_keywords: row.meta_keywords || '',

      price: String(row.price != null ? row.price : '0'),
      wholesale_price: String(row.wholesale_price || '0'),
      unit_price: String(row.unit_price || '0'),
      unit_price_ratio: row.unit_price_ratio || 0,
      ecotax: String(row.ecotax || '0'),

      quantity: row.quantity || 0,
      minimal_quantity: row.minimal_quantity || 1,
      low_stock_threshold: row.low_stock_threshold || null,
      low_stock_alert: row.low_stock_alert || 0,
      out_of_stock: row.out_of_stock || 0,
      available_for_order: String(row.available_for_order || '1'),
      available_date: row.available_date || '',
      active: String(row.active || '1'),

      description_short: row.description_short || '',
      description: row.description || '',
      condition: row.condition || 'new',

      id_manufacturer: row.id_manufacturer || 0,
      id_supplier: row.id_supplier || 0,
      manufacturer_name: row.manufacturer_name || '',
      supplier_name: row.supplier_name || '',

      visibility: row.visibility || 'both',
      show_price: String(row.show_price || '1'),
      indexed: String(row.indexed || '1'),

      id_default_image: row.id_default_image || 0,
      images: [],

      on_sale: String(row.on_sale || '0'),
      online_only: String(row.online_only || '0'),
      customizable: String(row.customizable || '0'),
      uploadable_files: String(row.uploadable_files || '0'),
      text_fields: row.text_fields || 0,

      id_tax_rules_group: row.id_tax_rules_group || 0,
      tax_name: row.tax_name || '',
      rate: row.rate != null ? String(row.rate) : '0',
      accisa: row.accisa != null ? parseFloat(row.accisa) : 0,

      date_add: row.date_add || '',
      date_upd: row.date_upd || '',

      width: row.width || 0,
      height: row.height || 0,
      depth: row.depth || 0,
      weight: row.weight || 0,
      location: row.location || '',
      pack_stock_type: row.pack_stock_type || 0,
      product_type: row.product_type || 'simple',
    }));
  } catch (error) {
    console.error('❌ getProductsCached failed:', error);
    return [];
  }
};


/**
 * Get unique cities (non-empty)
 */
export const getCities = async (): Promise<string[]> => {
  const rows = await queryData(
    'customers',
    'city IS NOT NULL AND city != ""',
    []
  );
  const cities = Array.from(new Set(rows.map(r => r.city.trim()))).filter(Boolean);
  return cities.sort();
};

/**
 * Get unique postcodes (CAP)
 */
export const getPostcodes = async (): Promise<string[]> => {
  const rows = await queryData(
    'customers',
    'postcode IS NOT NULL AND postcode != ""',
    []
  );
  const postcodes = Array.from(new Set(rows.map(r => r.postcode.trim()))).filter(Boolean);
  return postcodes.sort();
};

/**
 * Get all numero_ordinale for a given city
 */
export const getOrdinaliByCity = async (city: string) => {
  const rows = await queryData(
    'customers',
    'city = ? AND numero_ordinale IS NOT NULL AND numero_ordinale != "" ORDER BY CAST(numero_ordinale AS INTEGER) ASC',
    [city]
  );

  const ordinali = rows
    .map(r => r.numero_ordinale?.trim())
    .filter(Boolean);

  return {
    ordinali,
    clients: rows, // full client data, untouched
  };
};


/**
 * Get all numero_ordinale for a given postcode
 */
export const getOrdinaliByPostcode = async (postcode: string): Promise<string[]> => {
  const rows = await queryData(
    'customers',
    'postcode = ? AND numero_ordinale IS NOT NULL AND numero_ordinale != ""',
    [postcode]
  );
  const ordinale = Array.from(new Set(rows.map(r => r.numero_ordinale.trim()))).filter(Boolean);
  return ordinale.sort();
};

/**
 * Get customers by numero_ordinale (1 or more — handle duplicates)
 */
export const getCustomersByOrdinale = async (ordinale: string): Promise<any[]> => {
  return await queryData(
    'customers',
    'numero_ordinale = ?',
    [ordinale]
  );
};

export const getCategoryOrSubCategoryName = async (category_id: number) => {
  // First try categories table
  const categories = await queryData(
    'category_tree_categories',
    'id = ?',
    [category_id]
  );

  // If found in categories, return immediately
  if (categories.length > 0) {
    return categories;
  }

  // Otherwise try subcategories table
  return await queryData(
    'category_tree_subcategories',
    'id = ?',
    [category_id]
  );
};

export const getTotalCategoryCount = async () => {
  // count categories
  const categories = await queryData(
    'category_tree_categories',
    '1=1'
  );

  return categories.length;
};

export const getTotalCustomerCount = async () => {
  const customers = await queryData('customers', '1=1');
  return customers.length;
};

export const getTotalProductCount = async () => {
  const products = await queryData('category_tree_products', '1=1');
  return products.length;
};