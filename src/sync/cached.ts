import { checkAllProductStock, clientAddressGet, getClientsForAgent, getCouriers, getDeliveries } from "../api/prestashop";
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
  search: string | number | null,
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
      console.log(`💾 Saved customer(s) to local DB`);
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
    console.log(`⚡️ Cached API call for ${tableName}...`);

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search === null || (typeof search === 'string' && search.trim() === '')) {
      whereClauses.push('1=1');
    } else if (!isNaN(Number(search))) {
      whereClauses.push(`${idColumn} = ?`);
      params.push(Number(search));
    } else if (typeof search === 'string') {
      const nameParts = search.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[1] || '';
      if (lastName) {
        whereClauses.push(`firstname LIKE ? AND lastname LIKE ?`);
        params.push(`%${firstName}%`, `%${lastName}%`);
      } else {
        whereClauses.push(`(firstname LIKE ? OR lastname LIKE ?)`);
        params.push(`%${firstName}%`, `%${firstName}%`);
      }
    }

    if (city && city.trim() !== '') {
      whereClauses.push(`city LIKE ?`);
      params.push(`%${city.trim()}%`);
    }

    if (numero_ordinale && numero_ordinale.toString().trim() !== '') {
      whereClauses.push(`numero_ordinale LIKE ?`);
      params.push(`%${numero_ordinale.toString().trim()}%`);
    }

    if (cap && cap.toString().trim() !== '') {
      whereClauses.push(`codice_cmnr LIKE ?`);
      params.push(`%${cap.toString().trim()}%`);
    }

    const whereClause = whereClauses.join(' AND ');
    console.log('🧩 Query condition:', whereClause, params);

    const localData = await queryData(tableName, whereClause, params);

    // if (localData.length > 0) {
    //   console.log(`📦 Found ${localData.length} record(s) in local DB`);
    return localData;
    // }

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
  idColumn: string = 'id'
) => {
  try {
    console.log(` Cached API call for ${tableName}...`);

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
          id_category_default: p.id_category_default,
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

export const cachedProductStock = async (
  product_id: string | number,
  apiCall: () => Promise<any>
) => {
  const tableName = 'product_stock';
  try {
    console.log(`⚡ Checking stock for product ${product_id} locally...`);

    // 1️⃣ Try local DB
    const localData = await queryData(tableName, `id_product = ?`, [product_id]);

    if (localData.length > 0) {
      console.log(`📦 Found product stock in local DB`);
      return {
        success: true,
        data: { stock_availables: localData },
        fromCache: true,
      };
    }

    // 2️⃣ Not found locally → call API
    console.log(`🌐 Stock not found locally, calling API...`);
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
      console.log(`💾 Saved stock for product ${product_id} to local DB`);
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
    console.log('🚀 Starting full product stock initialization...');

    // 1️⃣ Call the API
    const res = await checkAllProductStock();

    if (!res.success || !res.data?.stock_availables) {
      throw new Error(res.error || 'Failed to fetch all product stocks');
    }

    const db = await getDBConnection();
    const stockList = res.data.stock_availables;
    let insertedCount = 0;

    // 2️⃣ Loop through all stock items
    for (const stockItem of stockList) {
      if (!stockItem?.id_product) continue; // sanity check

      const stockData = {
        id_product: stockItem.id_product,
        id_product_attribute: stockItem.id_product_attribute,
        quantity: stockItem.quantity,
        depends_on_stock: stockItem.depends_on_stock,
        out_of_stock: stockItem.out_of_stock,
      };

      // 3️⃣ Save only if not exists
      const inserted = await insertIfNotExists(tableName, stockData, 'id_product');
      if (inserted) insertedCount++;
    }

    console.log(`💾 Stock initialization complete — ${insertedCount} new records saved.`);
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
      console.log('❌ Missing required fields in agent JSON');
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

    console.log('✅ Agent data stored successfully');
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
      console.log('❌ No orders to store');
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

    console.log(`✅ Stored ${latestOrders.length} latest server orders`);
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

    console.log('🧾 Latest 5 server orders:', latestOrders);

    // return the array directly
    return latestOrders || [];
  } catch (error) {
    console.error('❌ Error fetching latest server orders:', error);
    return [];
  }
};

export const cacheInitializer = async (agentId: any) => {
  console.log("🧠 Starting cache initialization for agent:", agentId);

  try {
    // 1️⃣ Fetch Customers
    const customersRes = await getClientsForAgent(agentId);
    const customers = customersRes || [];
    console.log(`📦 Got ${customers.length} customers`);

    // 2️⃣ Insert customers
    for (const c of customers) {
      const customerData = {
        id_customer: c.id_customer,
        firstname: c.firstname,
        lastname: c.lastname,
        email: c.email,
        codice_cmnr: c.codice_cmnr || '',
        company: c.company || '',
        numero_ordinale: c.numero_ordinale || '',
        postcode: c.postcode || '',
        address1: c.address1 || '',
        city: c.city || '',
      };

      await insertIfNotExists('customers', customerData, 'id_customer');

      // 3️⃣ Fetch addresses for this customer
      const addrRes = await clientAddressGet(c.id_customer);
      const addresses = addrRes?.data?.addresses || [];
      console.log(`🏠 Customer ${c.id_customer} → ${addresses.length} addresses`);

      for (const a of addresses) {
        const addrData = {
          id: a.id,
          id_customer: a.id_customer,
          id_manufacturer: a.id_manufacturer,
          id_supplier: a.id_supplier,
          id_warehouse: a.id_warehouse,
          id_country: a.id_country,
          id_state: a.id_state,
          alias: a.alias,
          company: a.company,
          lastname: a.lastname,
          firstname: a.firstname,
          vat_number: a.vat_number,
          address1: a.address1,
          address2: a.address2,
          postcode: a.postcode,
          city: a.city,
          other: a.other,
          phone: a.phone,
          phone_mobile: a.phone_mobile,
          dni: a.dni,
          deleted: a.deleted,
          date_add: a.date_add,
          date_upd: a.date_upd,
          numero_esercizio: a.numero_esercizio,
          codice_cmnr: a.codice_cmnr,
          numero_ordinale: a.numero_ordinale,
        };

        await insertIfNotExists('addresses', addrData, 'id');
      }
    }

    // 4️⃣ Get courier info (always id 27)
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
      console.log("🚚 Courier cached:", carrier.name);

      // 5️⃣ Get deliveries for this courier
      const delivRes = await getDeliveries(carrier.id);
      const deliveries = delivRes?.data?.deliveries || [];
      console.log(`📦 Found ${deliveries.length} deliveries for carrier ${carrier.id}`);

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

    console.log("✅ Cache initialized successfully!");
    return { success: true };
  } catch (error) {
    console.error("💀 Cache initialization failed:", error);
    return { success: false, error: error.message };
  }
};

export const saveCategoryTree = async (data: any[]) => {
  const db = await getDBConnection();

  // Step 1: Flatten the data into separate arrays
  const categories: any[] = [];
  const subcategories: any[] = [];
  const products: any[] = [];

  for (const category of data) {
    categories.push({ id: category.id, name: category.name });

    for (const sub of category.subcategories || []) {
      subcategories.push({ id: sub.id, name: sub.name, category_id: category.id });

      for (const p of sub.products || []) {
        products.push({
          id_product: p.id_product,
          subcategory_id: sub.id,
          id_supplier: p.id_supplier,
          id_manufacturer: p.id_manufacturer,
          id_category_default: p.id_category_default,
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
  try {
    for (const cat of categories) {
      await db.executeSql(
        `INSERT OR REPLACE INTO category_tree_categories (id, name) VALUES (?, ?)`,
        [cat.id, cat.name]
      );
    }
    console.log('✅ Categories saved.');
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
    console.log('✅ Subcategories saved.');
  } catch (error) {
    console.log('❌ Subcategories save error:', error);
  }

  // Step 4: Products
  try {
    for (const p of products) {
      await db.executeSql(
        `INSERT OR REPLACE INTO category_tree_products (
        id_product, subcategory_id, id_supplier, id_manufacturer, id_category_default, id_shop_default, id_tax_rules_group,
        on_sale, online_only, ean13, isbn, upc, mpn, ecotax, quantity, minimal_quantity, low_stock_threshold, low_stock_alert,
        price, wholesale_price, unity, unit_price, unit_price_ratio, additional_shipping_cost,
        reference, supplier_reference, location, width, height, depth, weight, out_of_stock, additional_delivery_times,
        quantity_discount, customizable, uploadable_files, text_fields, active, redirect_type, id_type_redirected,
        available_for_order, available_date, show_condition, condition, show_price, indexed, visibility,
        cache_is_pack, cache_has_attachments, is_virtual, cache_default_attribute, date_add, date_upd,
        advanced_stock_management, pack_stock_type, state, product_type, accisa, id_shop, id_lang, link_rewrite,
        description, description_short, meta_description, meta_keywords, meta_title, name, available_now,
        available_later, delivery_in_stock, delivery_out_stock, manufacturer_name, supplier_name, rate, tax_name
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        Object.values(p)
      );
    }
    console.log('✅ Products saved.');
  } catch (error) {
    console.log('❌ Products save error:', error);
  }

  return { categories, subcategories, products }; // optional, for reuse
};
